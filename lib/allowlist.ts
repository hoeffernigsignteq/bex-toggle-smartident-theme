import type { ExtensionSettings } from '@/lib/types';

const VALID_SCHEMES = new Set(['*', 'http', 'https', 'file', 'ftp']);
const URL_SCHEMES_FOR_STAR = new Set(['http:', 'https:']);

const MATCH_PATTERN_REGEX = /^(\*|http|https|file|ftp):\/\/(\*|\*\.[^/*]+|[^/*]*)?(\/.*)$/i;

type ParsedMatchPattern = {
  scheme: string;
  host: string;
  port?: string;
  path: string;
};

export type PatternValidationError = {
  line: number;
  pattern: string;
  message: string;
};

export type ParsedAllowlist = {
  patterns: string[];
  errors: PatternValidationError[];
};

export function parseAllowedMatchPatterns(input: string): ParsedAllowlist {
  const errors: PatternValidationError[] = [];
  const patterns: string[] = [];
  const seen = new Set<string>();

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const pattern = rawLine.trim();

    if (!pattern) {
      return;
    }

    if (!isValidMatchPattern(pattern)) {
      errors.push({
        line: index + 1,
        pattern,
        message:
          'Invalid pattern. Use https://*.example.com/* (optional port allowed, e.g. https://localhost:5173/*).',
      });
      return;
    }

    if (!seen.has(pattern)) {
      seen.add(pattern);
      patterns.push(pattern);
    }
  });

  return { patterns, errors };
}

export function normalizeAllowedMatchPatterns(patterns: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  patterns.forEach((candidate) => {
    const pattern = candidate.trim();
    if (!pattern || !isValidMatchPattern(pattern) || seen.has(pattern)) {
      return;
    }

    seen.add(pattern);
    normalized.push(pattern);
  });

  return normalized;
}

export function isValidMatchPattern(pattern: string): boolean {
  if (pattern === '<all_urls>') {
    return true;
  }

  return parseMatchPattern(pattern) !== null;
}

export function isUrlAllowed(urlString: string, patterns: ExtensionSettings['allowedMatchPatterns']): boolean {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  return patterns.some((pattern) => doesMatchPattern(url, pattern));
}

function doesMatchPattern(url: URL, pattern: string): boolean {
  if (pattern === '<all_urls>') {
    return ['http:', 'https:', 'file:', 'ftp:'].includes(url.protocol);
  }

  const parsedPattern = parseMatchPattern(pattern);
  if (!parsedPattern) {
    return false;
  }

  if (!doesSchemeMatch(url.protocol, parsedPattern.scheme)) {
    return false;
  }

  if (
    !doesHostMatch(url, parsedPattern.host, parsedPattern.scheme, parsedPattern.port)
  ) {
    return false;
  }

  return doesPathMatch(url.pathname, parsedPattern.path);
}

function parseMatchPattern(pattern: string): ParsedMatchPattern | null {
  const match = MATCH_PATTERN_REGEX.exec(pattern);
  if (!match) {
    return null;
  }

  const scheme = match[1].toLowerCase();
  const rawHost = (match[2] ?? '').toLowerCase();
  const path = match[3];

  if (!VALID_SCHEMES.has(scheme)) {
    return null;
  }

  if (!path.startsWith('/')) {
    return null;
  }

  if (path.includes('#') || path.includes('?')) {
    return null;
  }

  if (scheme === 'file') {
    if (rawHost && rawHost !== '*') {
      return null;
    }

    return { scheme, host: rawHost, path };
  }

  if (!rawHost) {
    return null;
  }

  const hostAndPort = parseHostAndPort(rawHost);
  if (!hostAndPort) {
    return null;
  }

  const { host, port } = hostAndPort;

  if (host !== '*' && !/^[a-z0-9.*-]+$/.test(host)) {
    return null;
  }

  if (host.includes('*') && host !== '*' && !host.startsWith('*.')) {
    return null;
  }

  if (host.startsWith('*.') && host.length <= 2) {
    return null;
  }

  return { scheme, host, port, path };
}

function doesSchemeMatch(protocol: string, scheme: string): boolean {
  if (scheme === '*') {
    return URL_SCHEMES_FOR_STAR.has(protocol);
  }

  return protocol === `${scheme}:`;
}

function doesHostMatch(
  url: URL,
  hostPattern: string,
  scheme: string,
  portPattern?: string,
): boolean {
  if (scheme === 'file') {
    return true;
  }

  if (portPattern && resolveUrlPort(url) !== portPattern) {
    return false;
  }

  const host = url.hostname.toLowerCase();

  if (hostPattern === '*') {
    return true;
  }

  if (hostPattern.startsWith('*.')) {
    const baseDomain = hostPattern.slice(2);
    return host === baseDomain || host.endsWith(`.${baseDomain}`);
  }

  return host === hostPattern;
}

function doesPathMatch(pathname: string, pathPattern: string): boolean {
  const escaped = escapeRegex(pathPattern).replace(/\*/g, '.*');
  const pattern = new RegExp(`^${escaped}$`);
  return pattern.test(pathname);
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function parseHostAndPort(input: string): { host: string; port?: string } | null {
  if (input === '*') {
    return { host: input };
  }

  const lastColonIndex = input.lastIndexOf(':');
  if (lastColonIndex === -1) {
    return { host: input };
  }

  const host = input.slice(0, lastColonIndex);
  const rawPort = input.slice(lastColonIndex + 1);

  if (!/^\d{1,5}$/.test(rawPort)) {
    return null;
  }

  const portNumber = Number(rawPort);
  if (portNumber < 1 || portNumber > 65535 || !host) {
    return null;
  }

  if (host === '*') {
    return null;
  }

  return {
    host,
    port: String(portNumber),
  };
}

function resolveUrlPort(url: URL): string {
  if (url.port) {
    return url.port;
  }

  switch (url.protocol) {
    case 'http:':
      return '80';
    case 'https:':
      return '443';
    case 'ftp:':
      return '21';
    default:
      return '';
  }
}
