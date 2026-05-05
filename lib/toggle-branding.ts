export const BRANDING_STYLESHEET_ID = 'smartident-branding-css';
export const BRANDING_TYPOGRAPHY_STYLESHEET_ID = 'smartident-branding-typography';
export const BRANDING_FOCUS_RING_STYLESHEET_ID = 'smartident-branding-focus-ring';

const STYLESHEET_TOGGLE_STATE_ATTRIBUTE = 'data-smartident-branding-toggle-state';
const STYLESHEET_ORIGINAL_DISABLED_ATTRIBUTE =
  'data-smartident-branding-toggle-original-disabled';
const INLINE_TOGGLE_STATE_ATTRIBUTE = 'data-smartident-branding-inline-toggle-state';
const INLINE_ORIGINAL_STYLE_ATTRIBUTE = 'data-smartident-branding-inline-original-style';
const INLINE_ORIGINAL_STYLE_PRESENT_ATTRIBUTE =
  'data-smartident-branding-inline-original-style-present';
const BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID = 'smartident-branding-toggle-overrides';
const BRANDING_STYLESHEET_IDS = [
  BRANDING_STYLESHEET_ID,
  BRANDING_TYPOGRAPHY_STYLESHEET_ID,
  BRANDING_FOCUS_RING_STYLESHEET_ID,
] as const;
const TYPOGRAPHY_FALLBACK_CSS = [
  ':root {',
  '  --si-branding-primary-font-family: var(--font-sans, system-ui, sans-serif);',
  '  --si-branding-secondary-font-family: var(--font-sans, system-ui, sans-serif);',
  '  --si-branding-tertiary-font-family: var(--font-sans, system-ui, sans-serif);',
  '  --font-branding-primary: var(--font-sans, system-ui, sans-serif);',
  '  --font-branding-secondary: var(--font-sans, system-ui, sans-serif);',
  '  --font-branding-tertiary: var(--font-sans, system-ui, sans-serif);',
  '}',
].join('\n');

type ToggleableStylesheetElement = HTMLLinkElement | HTMLStyleElement;

export type ToggleBrandingElementStatus = 'enabled' | 'disabled' | 'not_found';

export function toggleBrandingStylesheet(doc: Document = document): ToggleBrandingElementStatus {
  const targetElements = getToggleableBrandingStylesheetElements(doc);
  const rootElement = doc.documentElement;
  const isManagedDisabledState =
    targetElements.some(isStylesheetDisabledByExtension) ||
    isInlineStylesDisabledByExtension(rootElement);

  if (isManagedDisabledState) {
    const restoredStylesheet = restoreStylesheetStates(targetElements);
    const restoredInlineStyles = restoreInlineBrandingStyles(rootElement);
    const removedTypographyFallback = removeTypographyFallbackStyles(doc);
    return restoredStylesheet || restoredInlineStyles || removedTypographyFallback
      ? 'enabled'
      : 'not_found';
  }

  const disabledStylesheet = disableStylesheets(targetElements);
  const disabledInlineStyles = disableInlineBrandingStyles(rootElement);
  const addedTypographyFallback =
    (disabledStylesheet || disabledInlineStyles) && addTypographyFallbackStyles(doc);

  return disabledStylesheet || disabledInlineStyles || addedTypographyFallback
    ? 'disabled'
    : 'not_found';
}

export function getBrandingStylesheetStatus(doc: Document = document): ToggleBrandingElementStatus {
  const targetElements = getToggleableBrandingStylesheetElements(doc);
  const rootElement = doc.documentElement;

  if (
    targetElements.some(isStylesheetDisabledByExtension) ||
    isInlineStylesDisabledByExtension(rootElement)
  ) {
    return 'disabled';
  }

  if (targetElements.some(isActiveBrandingStylesheet)) {
    return 'enabled';
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
  id: string,
): ToggleableStylesheetElement | null {
  const targetElement = doc.getElementById(id);
  if (!targetElement || !isToggleableStylesheetElement(targetElement)) {
    return null;
  }

  return targetElement;
}

function getToggleableBrandingStylesheetElements(doc: Document): ToggleableStylesheetElement[] {
  return BRANDING_STYLESHEET_IDS.flatMap((id) => {
    const element = getToggleableBrandingStylesheetElement(doc, id);
    return element ? [element] : [];
  });
}

function disableStylesheet(element: ToggleableStylesheetElement | null): boolean {
  if (!element || !hasBrandingStylesheetContent(element)) {
    return false;
  }

  element.setAttribute(STYLESHEET_ORIGINAL_DISABLED_ATTRIBUTE, String(element.disabled));
  element.disabled = true;
  element.setAttribute(STYLESHEET_TOGGLE_STATE_ATTRIBUTE, 'disabled');
  return true;
}

function disableStylesheets(elements: ToggleableStylesheetElement[]): boolean {
  return elements.reduce(
    (didDisable, element) => disableStylesheet(element) || didDisable,
    false,
  );
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

function restoreStylesheetStates(elements: ToggleableStylesheetElement[]): boolean {
  return elements.reduce(
    (didRestore, element) => restoreStylesheetState(element) || didRestore,
    false,
  );
}

function addTypographyFallbackStyles(doc: Document): boolean {
  if (doc.getElementById(BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID)) {
    return true;
  }

  const style = doc.createElement('style');
  style.id = BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID;
  style.textContent = TYPOGRAPHY_FALLBACK_CSS;
  doc.head.append(style);
  return true;
}

function removeTypographyFallbackStyles(doc: Document): boolean {
  const style = doc.getElementById(BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID);
  if (!style) {
    return false;
  }

  style.remove();
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

function isActiveBrandingStylesheet(element: ToggleableStylesheetElement): boolean {
  return !element.disabled && hasBrandingStylesheetContent(element);
}

function hasBrandingStylesheetContent(element: ToggleableStylesheetElement): boolean {
  return element instanceof HTMLLinkElement || element.textContent.trim() !== '';
}

function isInlineStylesDisabledByExtension(root: HTMLElement): boolean {
  return root.getAttribute(INLINE_TOGGLE_STATE_ATTRIBUTE) === 'disabled';
}
