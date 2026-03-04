import {
  isUrlAllowed,
  isValidMatchPattern,
  normalizeAllowedMatchPatterns,
  parseAllowedMatchPatterns,
} from '@/lib/allowlist';

describe('allowlist parsing and validation', () => {
  it('accepts valid patterns and rejects invalid lines', () => {
    const parsed = parseAllowedMatchPatterns([
      'https://verify.smartident.io/*',
      'https://verify.smartident.dev/*#',
      'https://*.smartident.live/*',
      'invalid-pattern',
    ].join('\n'));

    expect(parsed.patterns).toEqual([
      'https://verify.smartident.io/*',
      'https://*.smartident.live/*',
    ]);
    expect(parsed.errors).toHaveLength(2);
    expect(parsed.errors[0]?.line).toBe(2);
    expect(parsed.errors[1]?.line).toBe(4);
  });

  it('normalizes and deduplicates valid patterns', () => {
    const normalized = normalizeAllowedMatchPatterns([
      '  https://verify.smartident.io/* ',
      'https://verify.smartident.io/*',
      '',
      'not-a-pattern',
      'https://localhost:5173/*',
    ]);

    expect(normalized).toEqual([
      'https://verify.smartident.io/*',
      'https://localhost:5173/*',
    ]);
  });

  it('validates pattern syntax', () => {
    expect(isValidMatchPattern('https://verify.smartident.io/*')).toBe(true);
    expect(isValidMatchPattern('https://verify.smartident.dev/*#')).toBe(false);
    expect(isValidMatchPattern('https://verify.smartident.dev/path')).toBe(true);
    expect(isValidMatchPattern('https://verify.smartident.dev')).toBe(false);
  });
});

describe('allowlist URL matching', () => {
  const patterns = [
    'https://verify.smartident.io/*',
    'https://verify.smartident.live/*',
    'https://verify.smartident.dev/*',
    'https://localhost:5173/*',
  ];

  it('matches all default SmartIdent and localhost patterns', () => {
    expect(isUrlAllowed('https://verify.smartident.io/signup', patterns)).toBe(true);
    expect(isUrlAllowed('https://verify.smartident.live/dashboard', patterns)).toBe(true);
    expect(isUrlAllowed('https://verify.smartident.dev/login', patterns)).toBe(true);
    expect(isUrlAllowed('https://localhost:5173/', patterns)).toBe(true);
  });

  it('rejects non-allowlisted URLs', () => {
    expect(isUrlAllowed('https://verify.smartident.com/', patterns)).toBe(false);
    expect(isUrlAllowed('http://verify.smartident.io/', patterns)).toBe(false);
    expect(isUrlAllowed('https://localhost:3000/', patterns)).toBe(false);
  });

  it('supports wildcard subdomain patterns', () => {
    const wildcard = ['https://*.smartident.io/*'];

    expect(isUrlAllowed('https://verify.smartident.io/path', wildcard)).toBe(true);
    expect(isUrlAllowed('https://smartident.io/path', wildcard)).toBe(true);
    expect(isUrlAllowed('https://example.com/path', wildcard)).toBe(false);
  });
});
