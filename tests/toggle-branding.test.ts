// @vitest-environment happy-dom

import {
  BRANDING_FOCUS_RING_STYLESHEET_ID,
  BRANDING_STYLESHEET_ID,
  BRANDING_TYPOGRAPHY_STYLESHEET_ID,
  getBrandingStylesheetStatus,
  toggleBrandingStylesheet,
} from '@/lib/toggle-branding';

const BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID = 'smartident-branding-toggle-overrides';

describe('toggleBrandingStylesheet', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    [
      'data-smartident-branding-toggle-state',
      'data-smartident-branding-toggle-original-disabled',
      'data-smartident-branding-inline-toggle-state',
      'data-smartident-branding-inline-original-style',
      'data-smartident-branding-inline-original-style-present',
    ].forEach((attributeName) => {
      document.documentElement.removeAttribute(attributeName);
    });
  });

  it('disables and re-enables a link stylesheet element', () => {
    const link = document.createElement('link');
    link.id = BRANDING_STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.disabled = false;
    document.head.append(link);

    expect(getBrandingStylesheetStatus(document)).toBe('enabled');

    const firstResult = toggleBrandingStylesheet(document);
    expect(firstResult).toBe('disabled');
    expect(link.disabled).toBe(true);
    expect(getBrandingStylesheetStatus(document)).toBe('disabled');

    const secondResult = toggleBrandingStylesheet(document);
    expect(secondResult).toBe('enabled');
    expect(link.disabled).toBe(false);
    expect(getBrandingStylesheetStatus(document)).toBe('enabled');
  });

  it('disables and re-enables a style element', () => {
    const style = document.createElement('style');
    style.id = BRANDING_STYLESHEET_ID;
    style.disabled = false;
    style.textContent = 'body { color: red; }';
    document.head.append(style);

    const firstResult = toggleBrandingStylesheet(document);
    expect(firstResult).toBe('disabled');
    expect(style.disabled).toBe(true);

    const secondResult = toggleBrandingStylesheet(document);
    expect(secondResult).toBe('enabled');
    expect(style.disabled).toBe(false);
  });

  it('disables and re-enables all known SmartIdent branding style elements', () => {
    const mainStyle = createBrandingStyle(BRANDING_STYLESHEET_ID, 'body { color: red; }');
    const typographyStyle = createBrandingStyle(
      BRANDING_TYPOGRAPHY_STYLESHEET_ID,
      ':root { --si-branding-primary-font-family: "Comic Sans"; }',
    );
    const focusRingStyle = createBrandingStyle(
      BRANDING_FOCUS_RING_STYLESHEET_ID,
      '*:focus-visible { outline-color: #ea0900 !important; }',
    );

    expect(getBrandingStylesheetStatus(document)).toBe('enabled');

    const firstResult = toggleBrandingStylesheet(document);
    expect(firstResult).toBe('disabled');
    expect(mainStyle.disabled).toBe(true);
    expect(typographyStyle.disabled).toBe(true);
    expect(focusRingStyle.disabled).toBe(true);
    expect(getBrandingStylesheetStatus(document)).toBe('disabled');

    const secondResult = toggleBrandingStylesheet(document);
    expect(secondResult).toBe('enabled');
    expect(mainStyle.disabled).toBe(false);
    expect(typographyStyle.disabled).toBe(false);
    expect(focusRingStyle.disabled).toBe(false);
    expect(getBrandingStylesheetStatus(document)).toBe('enabled');
  });

  it('disables and re-enables typography branding when it is the only branding style', () => {
    const typographyStyle = createBrandingStyle(
      BRANDING_TYPOGRAPHY_STYLESHEET_ID,
      ':root { --si-branding-secondary-font-family: "Geist Mono"; }',
    );

    expect(getBrandingStylesheetStatus(document)).toBe('enabled');

    const firstResult = toggleBrandingStylesheet(document);
    expect(firstResult).toBe('disabled');
    expect(typographyStyle.disabled).toBe(true);
    expect(getBrandingStylesheetStatus(document)).toBe('disabled');

    const secondResult = toggleBrandingStylesheet(document);
    expect(secondResult).toBe('enabled');
    expect(typographyStyle.disabled).toBe(false);
  });

  it('disables and re-enables focus ring branding when it is the only branding style', () => {
    const focusRingStyle = createBrandingStyle(
      BRANDING_FOCUS_RING_STYLESHEET_ID,
      '@layer base {*:focus-visible { outline-color: #ea0900 !important; }}',
    );

    expect(getBrandingStylesheetStatus(document)).toBe('enabled');

    const firstResult = toggleBrandingStylesheet(document);
    expect(firstResult).toBe('disabled');
    expect(focusRingStyle.disabled).toBe(true);
    expect(getBrandingStylesheetStatus(document)).toBe('disabled');

    const secondResult = toggleBrandingStylesheet(document);
    expect(secondResult).toBe('enabled');
    expect(focusRingStyle.disabled).toBe(false);
  });

  it('adds typography fallback variables while branding is disabled and removes them on restore', () => {
    createBrandingStyle(
      BRANDING_TYPOGRAPHY_STYLESHEET_ID,
      ':root { --si-branding-primary-font-family: "Impact"; }',
    );

    const firstResult = toggleBrandingStylesheet(document);
    const overrideStyle = document.getElementById(BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID);

    expect(firstResult).toBe('disabled');
    expect(overrideStyle?.textContent).toContain(
      '--si-branding-primary-font-family: var(--font-sans, system-ui, sans-serif);',
    );
    expect(overrideStyle?.textContent).toContain(
      '--font-branding-primary: var(--font-sans, system-ui, sans-serif);',
    );

    const secondResult = toggleBrandingStylesheet(document);

    expect(secondResult).toBe('enabled');
    expect(document.getElementById(BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID)).toBeNull();
  });

  it('returns not_found when the stylesheet does not exist', () => {
    expect(toggleBrandingStylesheet(document)).toBe('not_found');
    expect(getBrandingStylesheetStatus(document)).toBe('not_found');
    expect(document.getElementById(BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID)).toBeNull();
  });

  it('ignores empty branding style elements', () => {
    createBrandingStyle(BRANDING_TYPOGRAPHY_STYLESHEET_ID, '');
    createBrandingStyle(BRANDING_FOCUS_RING_STYLESHEET_ID, '   ');

    expect(getBrandingStylesheetStatus(document)).toBe('not_found');
    expect(toggleBrandingStylesheet(document)).toBe('not_found');
    expect(document.getElementById(BRANDING_TOGGLE_OVERRIDE_STYLESHEET_ID)).toBeNull();
  });

  it('removes inline --color-* variables and restores the original html style', () => {
    document.documentElement.setAttribute(
      'style',
      [
        '--vueuse-safe-area-top: env(safe-area-inset-top, 0px)',
        '--color-primary-500: rgb(170 204 0)',
        '--color-brand-500: rgb(170 204 0)',
      ].join('; '),
    );

    const originalStyle = document.documentElement.getAttribute('style');

    const firstResult = toggleBrandingStylesheet(document);
    expect(firstResult).toBe('disabled');
    expect(document.documentElement.style.getPropertyValue('--color-primary-500')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--color-brand-500')).toBe('');
    expect(
      document.documentElement.style.getPropertyValue('--vueuse-safe-area-top'),
    ).toContain('safe-area-inset-top');
    expect(getBrandingStylesheetStatus(document)).toBe('disabled');

    const secondResult = toggleBrandingStylesheet(document);
    expect(secondResult).toBe('enabled');
    expect(document.documentElement.getAttribute('style')).toBe(originalStyle);
    expect(getBrandingStylesheetStatus(document)).toBe('enabled');
  });

  it('reports enabled when only inline branding color variables are present', () => {
    document.documentElement.style.setProperty('--color-primary-500', 'rgb(170 204 0)');
    expect(getBrandingStylesheetStatus(document)).toBe('enabled');
  });
});

function createBrandingStyle(id: string, textContent: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.id = id;
  style.disabled = false;
  style.textContent = textContent;
  document.head.append(style);
  return style;
}
