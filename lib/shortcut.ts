export const DEFAULT_TOGGLE_SHORTCUT = 'Alt+Shift+S';
const TOGGLE_SHORTCUT_COMMAND_NAMES = [
  '_execute_action',
  '_execute_browser_action',
  'toggle-branding',
] as const;
const TOGGLE_SHORTCUT_COMMAND_NAME_SET = new Set<string>(TOGGLE_SHORTCUT_COMMAND_NAMES);

const CHROME_SHORTCUTS_URL = 'chrome://extensions/shortcuts';
const FIREFOX_SHORTCUTS_URL = 'about:addons#shortcuts';

type PlatformOs = 'mac' | 'win' | 'linux' | 'other';
export type BrowserFamily = 'firefox' | 'chromium' | 'other';

export type ShortcutSettingsLink = {
  label: string;
  url: string;
};

type BrowserApi = {
  commands?: {
    getAll?: () => Promise<Array<{ name?: string; shortcut?: string }>>;
    openShortcutSettings?: () => Promise<void>;
    onChanged?: {
      addListener?: (callback: (command: { name?: string; shortcut?: string }) => void) => void;
      removeListener?: (callback: (command: { name?: string; shortcut?: string }) => void) => void;
    };
  };
  runtime?: {
    getPlatformInfo?: () => Promise<{ os?: string }>;
    getBrowserInfo?: () => Promise<{ name?: string }>;
  };
  tabs?: {
    create?: (details: { url: string }) => Promise<unknown>;
  };
};

const MAC_SHORTCUT_TOKEN_MAP: Record<string, string> = {
  Alt: 'Option',
  Ctrl: 'Control',
  MacCtrl: 'Control',
  Command: 'Command',
  Shift: 'Shift',
};

export async function getToggleShortcutLabel(): Promise<string> {
  const [platform, commandShortcut] = await Promise.all([
    detectPlatformOs(),
    getCommandShortcut(TOGGLE_SHORTCUT_COMMAND_NAMES),
  ]);

  const effectiveShortcut = commandShortcut ?? DEFAULT_TOGGLE_SHORTCUT;
  return formatShortcutForPlatform(effectiveShortcut, platform);
}

export async function getShortcutSettingsLink(): Promise<ShortcutSettingsLink | null> {
  const browserFamily = await detectBrowserFamily();
  const url = getShortcutSettingsUrl(browserFamily);

  if (!url) {
    return null;
  }

  return {
    url,
    label: 'Open settings to change shortcut',
  };
}

export async function openShortcutSettingsPage(
  shortcutSettingsLink: ShortcutSettingsLink,
): Promise<{ opened: boolean; error?: string }> {
  const browserApi = getBrowserApi();

  if (browserApi?.commands?.openShortcutSettings) {
    try {
      await browserApi.commands.openShortcutSettings();
      return { opened: true };
    } catch {
      // Fall through to URL-based navigation fallback.
    }
  }

  if (!browserApi?.tabs?.create) {
    return {
      opened: false,
      error: 'Shortcut settings API is not available in this browser context.',
    };
  }

  try {
    await browserApi.tabs.create({ url: shortcutSettingsLink.url });
    return { opened: true };
  } catch (error) {
    return {
      opened: false,
      error: error instanceof Error ? error.message : 'Unable to open shortcut settings.',
    };
  }
}

export function subscribeToToggleShortcutChanges(
  onChange: () => void,
): (() => void) | null {
  const browserApi = getBrowserApi();
  const commandChanged = browserApi?.commands?.onChanged;

  if (!commandChanged?.addListener || !commandChanged?.removeListener) {
    return null;
  }

  const listener = (command: { name?: string }): void => {
    if (command.name && TOGGLE_SHORTCUT_COMMAND_NAME_SET.has(command.name)) {
      onChange();
    }
  };

  commandChanged.addListener(listener);

  return () => {
    commandChanged.removeListener?.(listener);
  };
}

export function formatShortcutForPlatform(shortcut: string, os: PlatformOs): string {
  if (os !== 'mac') {
    return shortcut;
  }

  return shortcut
    .split('+')
    .map((part) => MAC_SHORTCUT_TOKEN_MAP[part] ?? part)
    .join('+');
}

export function detectBrowserFamilyFromUserAgent(userAgent: string): BrowserFamily {
  const ua = userAgent.toLowerCase();

  if (ua.includes('firefox')) {
    return 'firefox';
  }

  if (
    ua.includes('chrome') ||
    ua.includes('chromium') ||
    ua.includes('edg/') ||
    ua.includes('opr/')
  ) {
    return 'chromium';
  }

  return 'other';
}

export function getShortcutSettingsUrl(browserFamily: BrowserFamily): string | null {
  if (browserFamily === 'firefox') {
    return FIREFOX_SHORTCUTS_URL;
  }

  if (browserFamily === 'chromium') {
    return CHROME_SHORTCUTS_URL;
  }

  return null;
}

async function detectPlatformOs(): Promise<PlatformOs> {
  const browserApi = getBrowserApi();

  if (browserApi?.runtime?.getPlatformInfo) {
    try {
      const info = await browserApi.runtime.getPlatformInfo();
      return normalizePlatform(info.os);
    } catch {
      // Fall through to user-agent based detection.
    }
  }

  const userAgent = globalThis.navigator?.userAgent?.toLowerCase() ?? '';
  if (userAgent.includes('mac')) {
    return 'mac';
  }
  if (userAgent.includes('win')) {
    return 'win';
  }
  if (userAgent.includes('linux')) {
    return 'linux';
  }

  return 'other';
}

async function detectBrowserFamily(): Promise<BrowserFamily> {
  const browserApi = getBrowserApi();

  if (browserApi?.runtime?.getBrowserInfo) {
    try {
      const browserInfo = await browserApi.runtime.getBrowserInfo();
      const browserName = browserInfo?.name?.toLowerCase() ?? '';
      if (browserName.includes('firefox')) {
        return 'firefox';
      }
      if (browserName.includes('chrome') || browserName.includes('chromium')) {
        return 'chromium';
      }
    } catch {
      // Fall through to user-agent based detection.
    }
  }

  return detectBrowserFamilyFromUserAgent(globalThis.navigator?.userAgent ?? '');
}

async function getCommandShortcut(commandNames: readonly string[]): Promise<string | null> {
  const browserApi = getBrowserApi();

  if (!browserApi?.commands?.getAll) {
    return null;
  }

  try {
    const commands = await browserApi.commands.getAll();
    const commandShortcutByName = new Map<string, string | undefined>();

    commands.forEach((entry) => {
      if (entry.name) {
        commandShortcutByName.set(entry.name, entry.shortcut);
      }
    });

    for (const commandName of commandNames) {
      const shortcut = commandShortcutByName.get(commandName)?.trim();
      if (shortcut) {
        return shortcut;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function normalizePlatform(rawOs: string | undefined): PlatformOs {
  switch (rawOs) {
    case 'mac':
      return 'mac';
    case 'win':
      return 'win';
    case 'linux':
      return 'linux';
    default:
      return 'other';
  }
}

function getBrowserApi(): BrowserApi | undefined {
  if (typeof browser !== 'undefined') {
    return browser as unknown as BrowserApi;
  }

  return (globalThis as { browser?: BrowserApi }).browser;
}
