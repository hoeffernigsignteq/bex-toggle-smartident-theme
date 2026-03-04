export const BRANDING_STYLESHEET_ID = 'smartident-branding-css';

const STYLESHEET_TOGGLE_STATE_ATTRIBUTE = 'data-smartident-branding-toggle-state';
const STYLESHEET_ORIGINAL_DISABLED_ATTRIBUTE =
  'data-smartident-branding-toggle-original-disabled';
const INLINE_TOGGLE_STATE_ATTRIBUTE = 'data-smartident-branding-inline-toggle-state';
const INLINE_ORIGINAL_STYLE_ATTRIBUTE = 'data-smartident-branding-inline-original-style';
const INLINE_ORIGINAL_STYLE_PRESENT_ATTRIBUTE =
  'data-smartident-branding-inline-original-style-present';

type ToggleableStylesheetElement = HTMLLinkElement | HTMLStyleElement;

export type ToggleBrandingElementStatus = 'enabled' | 'disabled' | 'not_found';

export function toggleBrandingStylesheet(doc: Document = document): ToggleBrandingElementStatus {
  const targetElement = getToggleableBrandingStylesheetElement(doc);
  const rootElement = doc.documentElement;
  const isManagedDisabledState =
    isStylesheetDisabledByExtension(targetElement) || isInlineStylesDisabledByExtension(rootElement);

  if (isManagedDisabledState) {
    const restoredStylesheet = restoreStylesheetState(targetElement);
    const restoredInlineStyles = restoreInlineBrandingStyles(rootElement);
    return restoredStylesheet || restoredInlineStyles ? 'enabled' : 'not_found';
  }

  const disabledStylesheet = disableStylesheet(targetElement);
  const disabledInlineStyles = disableInlineBrandingStyles(rootElement);

  return disabledStylesheet || disabledInlineStyles ? 'disabled' : 'not_found';
}

export function getBrandingStylesheetStatus(doc: Document = document): ToggleBrandingElementStatus {
  const targetElement = getToggleableBrandingStylesheetElement(doc);
  const rootElement = doc.documentElement;

  if (isInlineStylesDisabledByExtension(rootElement)) {
    return 'disabled';
  }

  if (targetElement) {
    return targetElement.disabled ? 'disabled' : 'enabled';
  }

  if (hasInlineBrandingColorVariables(rootElement)) {
    return 'enabled';
  }

  return 'not_found';
}

function isToggleableStylesheetElement(
  element: Element,
): element is ToggleableStylesheetElement {
  return element instanceof HTMLLinkElement || element instanceof HTMLStyleElement;
}

function getToggleableBrandingStylesheetElement(
  doc: Document,
): ToggleableStylesheetElement | null {
  const targetElement = doc.getElementById(BRANDING_STYLESHEET_ID);
  if (!targetElement || !isToggleableStylesheetElement(targetElement)) {
    return null;
  }

  return targetElement;
}

function disableStylesheet(element: ToggleableStylesheetElement | null): boolean {
  if (!element) {
    return false;
  }

  element.setAttribute(STYLESHEET_ORIGINAL_DISABLED_ATTRIBUTE, String(element.disabled));
  element.disabled = true;
  element.setAttribute(STYLESHEET_TOGGLE_STATE_ATTRIBUTE, 'disabled');
  return true;
}

function restoreStylesheetState(element: ToggleableStylesheetElement | null): boolean {
  if (!element || !isStylesheetDisabledByExtension(element)) {
    return false;
  }

  const originalDisabledState =
    element.getAttribute(STYLESHEET_ORIGINAL_DISABLED_ATTRIBUTE) === 'true';

  element.disabled = originalDisabledState;
  element.removeAttribute(STYLESHEET_TOGGLE_STATE_ATTRIBUTE);
  element.removeAttribute(STYLESHEET_ORIGINAL_DISABLED_ATTRIBUTE);
  return true;
}

function disableInlineBrandingStyles(root: HTMLElement): boolean {
  if (hasInlineBrandingColorVariables(root) === false) {
    return false;
  }

  if (isInlineStylesDisabledByExtension(root)) {
    return true;
  }

  const originalStyleValue = root.getAttribute('style');
  root.setAttribute(
    INLINE_ORIGINAL_STYLE_PRESENT_ATTRIBUTE,
    originalStyleValue === null ? 'false' : 'true',
  );
  root.setAttribute(INLINE_ORIGINAL_STYLE_ATTRIBUTE, originalStyleValue ?? '');

  const inlineStyle = root.style;
  const propertiesToRemove: string[] = [];

  for (let index = 0; index < inlineStyle.length; index += 1) {
    const propertyName = inlineStyle.item(index);
    if (propertyName.startsWith('--color-')) {
      propertiesToRemove.push(propertyName);
    }
  }

  propertiesToRemove.forEach((propertyName) => {
    inlineStyle.removeProperty(propertyName);
  });

  root.setAttribute(INLINE_TOGGLE_STATE_ATTRIBUTE, 'disabled');
  return true;
}

function restoreInlineBrandingStyles(root: HTMLElement): boolean {
  if (!isInlineStylesDisabledByExtension(root)) {
    return false;
  }

  const hadInlineStyleAttribute =
    root.getAttribute(INLINE_ORIGINAL_STYLE_PRESENT_ATTRIBUTE) === 'true';
  const originalStyle = root.getAttribute(INLINE_ORIGINAL_STYLE_ATTRIBUTE) ?? '';

  if (hadInlineStyleAttribute) {
    root.setAttribute('style', originalStyle);
  } else {
    root.removeAttribute('style');
  }

  root.removeAttribute(INLINE_TOGGLE_STATE_ATTRIBUTE);
  root.removeAttribute(INLINE_ORIGINAL_STYLE_ATTRIBUTE);
  root.removeAttribute(INLINE_ORIGINAL_STYLE_PRESENT_ATTRIBUTE);
  return true;
}

function hasInlineBrandingColorVariables(root: HTMLElement): boolean {
  const inlineStyle = root.style;
  for (let index = 0; index < inlineStyle.length; index += 1) {
    if (inlineStyle.item(index).startsWith('--color-')) {
      return true;
    }
  }

  return false;
}

function isStylesheetDisabledByExtension(element: ToggleableStylesheetElement | null): boolean {
  return (
    element?.getAttribute(STYLESHEET_TOGGLE_STATE_ATTRIBUTE) === 'disabled'
  );
}

function isInlineStylesDisabledByExtension(root: HTMLElement): boolean {
  return root.getAttribute(INLINE_TOGGLE_STATE_ATTRIBUTE) === 'disabled';
}
