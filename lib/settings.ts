import { normalizeAllowedMatchPatterns } from '@/lib/allowlist';
import type { ExtensionSettings } from '@/lib/types';

const SETTINGS_STORAGE_KEY = 'settings';

export const DEFAULT_ALLOWED_MATCH_PATTERNS = [
  'https://verify.smartident.io/*',
  'https://verify.smartident.live/*',
  'https://verify.smartident.dev/*',
  'https://localhost:5173/*',
] as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  allowedMatchPatterns: [...DEFAULT_ALLOWED_MATCH_PATTERNS],
};

export async function ensureSettingsInitialized(): Promise<ExtensionSettings> {
  const raw = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const current = raw[SETTINGS_STORAGE_KEY] as Partial<ExtensionSettings> | undefined;

  if (!current?.allowedMatchPatterns) {
    await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }

  const normalized = normalizeAllowedMatchPatterns(current.allowedMatchPatterns);
  const hydratedSettings: ExtensionSettings = {
    allowedMatchPatterns: normalized.length
      ? normalized
      : [...DEFAULT_SETTINGS.allowedMatchPatterns],
  };

  await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: hydratedSettings });

  return hydratedSettings;
}

export async function getSettings(): Promise<ExtensionSettings> {
  const raw = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const current = raw[SETTINGS_STORAGE_KEY] as Partial<ExtensionSettings> | undefined;

  if (!current?.allowedMatchPatterns) {
    return ensureSettingsInitialized();
  }

  const normalized = normalizeAllowedMatchPatterns(current.allowedMatchPatterns);

  if (normalized.length === 0) {
    return {
      allowedMatchPatterns: [...DEFAULT_SETTINGS.allowedMatchPatterns],
    };
  }

  return {
    allowedMatchPatterns: normalized,
  };
}

export async function saveAllowedMatchPatterns(patterns: string[]): Promise<ExtensionSettings> {
  const normalized = normalizeAllowedMatchPatterns(patterns);
  const nextSettings: ExtensionSettings = {
    allowedMatchPatterns: normalized.length
      ? normalized
      : [...DEFAULT_SETTINGS.allowedMatchPatterns],
  };

  await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: nextSettings });

  return nextSettings;
}

export async function resetSettings(): Promise<ExtensionSettings> {
  const resetValue: ExtensionSettings = {
    allowedMatchPatterns: [...DEFAULT_SETTINGS.allowedMatchPatterns],
  };

  await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: resetValue });

  return resetValue;
}
