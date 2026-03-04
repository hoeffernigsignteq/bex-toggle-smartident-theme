import {
  refreshStatusForTab,
  toggleForTab,
  type TabLike,
} from '@/lib/background-service';
import { ensureSettingsInitialized, getSettings } from '@/lib/settings';
import {
  GET_BRANDING_STATUS_MESSAGE,
  TOGGLE_BRANDING_MESSAGE,
  type GetBrandingStatusRequest,
  type ToggleBrandingRequest,
  type ToggleBrandingResult,
} from '@/lib/types';

const OPEN_SETTINGS_CONTEXT_MENU_ID = 'open-settings';
const OPEN_SETTINGS_CONTEXT_MENU_TITLE = 'Options';
const tabStatusRefreshGeneration = new Map<number, number>();
const OFF_ACTION_ICON_PATHS: ActionIconPathMap = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  96: 'icon/96.png',
  128: 'icon/128.png',
};
const ON_ACTION_ICON_PATHS: ActionIconPathMap = {
  16: 'icon/on-16.png',
  32: 'icon/on-32.png',
  48: 'icon/on-48.png',
  96: 'icon/on-96.png',
  128: 'icon/on-128.png',
};
const NA_ACTION_ICON_PATHS: ActionIconPathMap = {
  16: 'icon/na-16.png',
  32: 'icon/na-32.png',
  48: 'icon/na-48.png',
  96: 'icon/na-96.png',
  128: 'icon/na-128.png',
};

export default defineBackground(() => {
  void initializeAndRefresh();

  browser.runtime.onInstalled.addListener(() => {
    void initializeAndRefresh();
  });

  if (browser.runtime.onStartup) {
    browser.runtime.onStartup.addListener(() => {
      requestStatusRefreshForActiveTab();
    });
  }

  if (isFirefoxRuntime() && browser.contextMenus?.onClicked) {
    browser.contextMenus.onClicked.addListener((info) => {
      if (info.menuItemId === OPEN_SETTINGS_CONTEXT_MENU_ID) {
        void openExtensionOptionsPage();
      }
    });
  }

  getActionApi().onClicked.addListener((tab) => {
    void toggleForTab(tab, getSettings, sendToggleMessageToTab, setActionState);
  });

  browser.tabs.onActivated.addListener(() => {
    requestStatusRefreshForActiveTab();
  });

  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (
      typeof changeInfo.url === 'string' ||
      changeInfo.status === 'loading' ||
      changeInfo.status === 'complete'
    ) {
      requestStatusRefreshForTab(tab);
    }
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && 'settings' in changes) {
      requestStatusRefreshForActiveTab();
    }
  });
});

async function initializeAndRefresh(): Promise<void> {
  await ensureSettingsInitialized();

  if (isFirefoxRuntime()) {
    await ensureOpenSettingsContextMenu();
  }

  requestStatusRefreshForActiveTab();
}

async function ensureOpenSettingsContextMenu(): Promise<void> {
  if (!browser.contextMenus) {
    return;
  }

  try {
    await browser.contextMenus.remove(OPEN_SETTINGS_CONTEXT_MENU_ID);
  } catch {
    // Ignore if the menu item does not exist yet.
  }

  try {
    const contexts =
      browser.runtime.getManifest().manifest_version === 3
        ? (['action'] as ['action'])
        : (['browser_action'] as ['browser_action']);

    browser.contextMenus.create({
      id: OPEN_SETTINGS_CONTEXT_MENU_ID,
      title: OPEN_SETTINGS_CONTEXT_MENU_TITLE,
      contexts,
    });
  } catch {
    // Ignore registration failures to keep extension startup resilient.
  }
}

function isFirefoxRuntime(): boolean {
  try {
    return browser.runtime.getURL('').startsWith('moz-extension://');
  } catch {
    return false;
  }
}

async function openExtensionOptionsPage(): Promise<void> {
  try {
    await browser.runtime.openOptionsPage();
    return;
  } catch {
    // Fall back to opening the options page URL directly.
  }

  try {
    await browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
  } catch {
    // Ignore if the tab cannot be opened.
  }
}

function requestStatusRefreshForActiveTab(): void {
  void (async () => {
    const tab = await queryActiveTab();
    requestStatusRefreshForTab(tab);
  })();
}

function requestStatusRefreshForTab(tab: TabLike): void {
  if (tab.id == null) {
    return;
  }

  const nextGeneration = (tabStatusRefreshGeneration.get(tab.id) ?? 0) + 1;
  tabStatusRefreshGeneration.set(tab.id, nextGeneration);

  void refreshStatusForTrackedTab(tab.id, nextGeneration);
}

async function refreshStatusForTrackedTab(tabId: number, generation: number): Promise<void> {
  if (tabStatusRefreshGeneration.get(tabId) !== generation) {
    return;
  }

  const tab = await getTab(tabId);
  if (!tab?.url) {
    return;
  }

  await refreshStatusForTab(tab, getSettings, sendStatusMessageToTab, async (targetTabId, result) => {
    if (tabStatusRefreshGeneration.get(targetTabId) !== generation) {
      return;
    }

    await setActionState(targetTabId, result);
  });

  if (tabStatusRefreshGeneration.get(tabId) === generation) {
    tabStatusRefreshGeneration.delete(tabId);
  }
}

async function getTab(tabId: number): Promise<TabLike | null> {
  try {
    const tab = await browser.tabs.get(tabId);
    return { id: tab.id, url: tab.url };
  } catch {
    return null;
  }
}

async function queryActiveTab(): Promise<TabLike> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  return {
    id: activeTab?.id,
    url: activeTab?.url,
  };
}

async function sendToggleMessageToTab(tabId: number): Promise<ToggleBrandingResult> {
  const request: ToggleBrandingRequest = {
    type: TOGGLE_BRANDING_MESSAGE,
  };

  return sendMessageToTab(tabId, request);
}

async function sendStatusMessageToTab(tabId: number): Promise<ToggleBrandingResult> {
  const request: GetBrandingStatusRequest = {
    type: GET_BRANDING_STATUS_MESSAGE,
  };

  const result = await sendMessageToTab(tabId, request);

  if (result.status === 'error' && isMissingReceiverError(result.reason)) {
    return { status: 'not_found' };
  }

  return result;
}

async function sendMessageToTab(
  tabId: number,
  request: ToggleBrandingRequest | GetBrandingStatusRequest,
): Promise<ToggleBrandingResult> {
  try {
    const response = (await browser.tabs.sendMessage(tabId, request)) as
      | ToggleBrandingResult
      | undefined;

    if (!response) {
      return {
        status: 'error',
        reason: 'Content script did not return a response.',
      };
    }

    return response;
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unable to contact content script.',
    };
  }
}

function isMissingReceiverError(reason: string): boolean {
  const message = reason.toLowerCase();
  return (
    message.includes('receiving end does not exist') ||
    message.includes('could not establish connection')
  );
}

async function setActionState(tabId: number, result: ToggleBrandingResult): Promise<void> {
  const actionApi = getActionApi();
  const { text, color, title } = getActionStateForResult(result);
  const iconPath = getActionIconPathForResult(result);

  await Promise.all([
    actionApi.setBadgeText({ tabId, text }),
    actionApi.setBadgeBackgroundColor({ tabId, color }),
    actionApi.setTitle({ tabId, title }),
    actionApi.setIcon({ tabId, path: iconPath }),
  ]);
}

function getActionIconPathForResult(result: ToggleBrandingResult): ActionIconPathMap {
  switch (result.status) {
    case 'enabled':
      return ON_ACTION_ICON_PATHS;
    case 'not_found':
    case 'not_allowed':
      return NA_ACTION_ICON_PATHS;
    default:
      return OFF_ACTION_ICON_PATHS;
  }
}

function getActionStateForResult(result: ToggleBrandingResult): {
  text: string;
  color: string;
  title: string;
} {
  switch (result.status) {
    case 'disabled':
      return {
        text: '',
        color: '#b45309',
        title: 'SmartIdent branding disabled in this tab.',
      };
    case 'enabled':
      return {
        text: '',
        color: '#15803d',
        title: 'SmartIdent branding enabled in this tab.',
      };
    case 'not_found':
      return {
        text: '',
        color: '#4b5563',
        title: 'No #smartident-branding-css stylesheet was found on this page.',
      };
    case 'not_allowed':
      return {
        text: '',
        color: '#1d4ed8',
        title: 'This URL is not in the extension allowlist.',
      };
    case 'error':
      return {
        text: 'ERR',
        color: '#b91c1c',
        title: `Extension error: ${result.reason}`,
      };
    default:
      return {
        text: 'ERR',
        color: '#b91c1c',
        title: 'Unexpected extension state.',
      };
  }
}

function getActionApi(): BrowserActionApi {
  const actionApi = (browser.action ?? browser.browserAction) as BrowserActionApi | undefined;

  if (!actionApi) {
    throw new Error('No action API available in this browser context.');
  }

  return actionApi;
}

type BrowserActionApi = {
  onClicked: {
    addListener(callback: (tab: TabLike) => void): void;
  };
  setBadgeText(details: { tabId?: number; text: string }): Promise<void>;
  setBadgeBackgroundColor(details: {
    tabId?: number;
    color: string;
  }): Promise<void>;
  setTitle(details: { tabId?: number; title: string }): Promise<void>;
  setIcon(details: { tabId?: number; path: ActionIconPathMap }): Promise<void>;
};

type ActionIconPathMap = {
  16: string;
  32: string;
  48: string;
  96: string;
  128: string;
};
