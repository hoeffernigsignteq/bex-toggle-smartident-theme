// @vitest-environment happy-dom

import {
  BRANDING_STYLESHEET_ID,
  getBrandingStylesheetStatus,
  toggleBrandingStylesheet,
} from '@/lib/toggle-branding';

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

  it('returns not_found when the stylesheet does not exist', () => {
    expect(toggleBrandingStylesheet(document)).toBe('not_found');
    expect(getBrandingStylesheetStatus(document)).toBe('not_found');
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
