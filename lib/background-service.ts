import { isUrlAllowed } from '@/lib/allowlist';
import type { ToggleBrandingResult } from '@/lib/types';

export type TabLike = {
  id?: number;
  url?: string;
};

export type ToggleExecutor = (tabId: number) => Promise<ToggleBrandingResult>;
export type SettingsProvider = () => Promise<{ allowedMatchPatterns: string[] }>;
export type StatusExecutor = (tabId: number) => Promise<ToggleBrandingResult>;

export type SetActionState = (tabId: number, result: ToggleBrandingResult) => Promise<void>;

export async function toggleForTab(
  tab: TabLike,
  getSettings: SettingsProvider,
  executeToggle: ToggleExecutor,
  setActionState: SetActionState,
): Promise<ToggleBrandingResult> {
  return runAllowlistedTabOperation(tab, getSettings, executeToggle, setActionState);
}

export async function toggleForActiveTab(
  queryActiveTab: () => Promise<TabLike>,
  getSettings: SettingsProvider,
  executeToggle: ToggleExecutor,
  setActionState: SetActionState,
): Promise<ToggleBrandingResult> {
  const tab = await queryActiveTab();
  return toggleForTab(tab, getSettings, executeToggle, setActionState);
}

export async function refreshStatusForTab(
  tab: TabLike,
  getSettings: SettingsProvider,
  executeStatus: StatusExecutor,
  setActionState: SetActionState,
): Promise<ToggleBrandingResult> {
  return runAllowlistedTabOperation(tab, getSettings, executeStatus, setActionState);
}

export async function refreshStatusForActiveTab(
  queryActiveTab: () => Promise<TabLike>,
  getSettings: SettingsProvider,
  executeStatus: StatusExecutor,
  setActionState: SetActionState,
): Promise<ToggleBrandingResult> {
  const tab = await queryActiveTab();
  return refreshStatusForTab(tab, getSettings, executeStatus, setActionState);
}

async function runAllowlistedTabOperation(
  tab: TabLike,
  getSettings: SettingsProvider,
  operation: (tabId: number) => Promise<ToggleBrandingResult>,
  setActionState: SetActionState,
): Promise<ToggleBrandingResult> {
  if (tab.id == null || !tab.url) {
    return { status: 'error', reason: 'No active tab available.' };
  }

  const settings = await getSettings();

  if (!isUrlAllowed(tab.url, settings.allowedMatchPatterns)) {
    const result: ToggleBrandingResult = { status: 'not_allowed' };
    await setActionState(tab.id, result);
    return result;
  }

  const result = await operation(tab.id);
  await setActionState(tab.id, result);

  return result;
}
