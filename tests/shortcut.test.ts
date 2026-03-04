import {
  detectBrowserFamilyFromUserAgent,
  formatShortcutForPlatform,
  getShortcutSettingsUrl,
  getToggleShortcutLabel,
  openShortcutSettingsPage,
  subscribeToToggleShortcutChanges,
} from '@/lib/shortcut';

describe('shortcut formatting and detection', () => {
  let originalBrowser: unknown;

  beforeEach(() => {
    originalBrowser = (globalThis as { browser?: unknown }).browser;
  });

  afterEach(() => {
    if (originalBrowser === undefined) {
      delete (globalThis as { browser?: unknown }).browser;
    } else {
      (globalThis as { browser?: unknown }).browser = originalBrowser;
    }

    vi.restoreAllMocks();
  });

  it('maps Alt to Option on macOS labels', () => {
    expect(formatShortcutForPlatform('Alt+Shift+S', 'mac')).toBe('Option+Shift+S');
  });

  it('keeps non-mac labels unchanged', () => {
    expect(formatShortcutForPlatform('Alt+Shift+S', 'win')).toBe('Alt+Shift+S');
    expect(formatShortcutForPlatform('Alt+Shift+S', 'linux')).toBe('Alt+Shift+S');
  });

  it('detects browser family from user-agent string', () => {
    expect(detectBrowserFamilyFromUserAgent('Mozilla/5.0 Firefox/135.0')).toBe('firefox');
    expect(detectBrowserFamilyFromUserAgent('Mozilla/5.0 Chrome/132.0.0.0')).toBe('chromium');
    expect(detectBrowserFamilyFromUserAgent('Mozilla/5.0 Safari/617.1')).toBe('other');
  });

  it('returns browser-specific shortcuts management URLs', () => {
    expect(getShortcutSettingsUrl('firefox')).toBe('about:addons#shortcuts');
    expect(getShortcutSettingsUrl('chromium')).toBe('chrome://extensions/shortcuts');
    expect(getShortcutSettingsUrl('other')).toBeNull();
  });

  it('uses the active configured command shortcut when available', async () => {
    (globalThis as { browser?: unknown }).browser = {
      commands: {
        getAll: vi.fn().mockResolvedValue([{ name: '_execute_action', shortcut: 'Alt+Shift+B' }]),
      },
      runtime: {
        getPlatformInfo: vi.fn().mockResolvedValue({ os: 'mac' }),
      },
    };

    await expect(getToggleShortcutLabel()).resolves.toBe('Option+Shift+B');
  });

  it('falls back to default shortcut when no active shortcut is configured', async () => {
    (globalThis as { browser?: unknown }).browser = {
      commands: {
        getAll: vi.fn().mockResolvedValue([{ name: '_execute_action', shortcut: '' }]),
      },
      runtime: {
        getPlatformInfo: vi.fn().mockResolvedValue({ os: 'win' }),
      },
    };

    await expect(getToggleShortcutLabel()).resolves.toBe('Alt+Shift+S');
  });

  it('reads Firefox action shortcut when browser-action command is present', async () => {
    (globalThis as { browser?: unknown }).browser = {
      commands: {
        getAll: vi
          .fn()
          .mockResolvedValue([{ name: '_execute_browser_action', shortcut: 'Alt+Shift+F' }]),
      },
      runtime: {
        getPlatformInfo: vi.fn().mockResolvedValue({ os: 'win' }),
      },
    };

    await expect(getToggleShortcutLabel()).resolves.toBe('Alt+Shift+F');
  });

  it('opens shortcuts settings through commands API when available', async () => {
    const openShortcutSettings = vi.fn().mockResolvedValue(undefined);

    (globalThis as { browser?: unknown }).browser = {
      commands: {
        openShortcutSettings,
      },
    };

    await expect(
      openShortcutSettingsPage({
        label: 'Open shortcut settings',
        url: 'chrome://extensions/shortcuts',
      }),
    ).resolves.toEqual({ opened: true });
    expect(openShortcutSettings).toHaveBeenCalledTimes(1);
  });

  it('falls back to tabs.create when commands.openShortcutSettings is unavailable', async () => {
    const create = vi.fn().mockResolvedValue(undefined);

    (globalThis as { browser?: unknown }).browser = {
      tabs: {
        create,
      },
    };

    await expect(
      openShortcutSettingsPage({
        label: 'Open shortcut settings',
        url: 'about:addons#shortcuts',
      }),
    ).resolves.toEqual({ opened: true });
    expect(create).toHaveBeenCalledWith({ url: 'about:addons#shortcuts' });
  });

  it('subscribes to command shortcut changes and notifies only for action shortcuts', () => {
    const listeners: Array<(command: { name?: string }) => void> = [];
    const addListener = vi.fn((listener: (command: { name?: string }) => void) => {
      listeners.push(listener);
    });
    const removeListener = vi.fn((listener: (command: { name?: string }) => void) => {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    });

    (globalThis as { browser?: unknown }).browser = {
      commands: {
        onChanged: {
          addListener,
          removeListener,
        },
      },
    };

    const onChange = vi.fn();
    const unsubscribe = subscribeToToggleShortcutChanges(onChange);

    expect(addListener).toHaveBeenCalledTimes(1);
    expect(typeof unsubscribe).toBe('function');
    expect(listeners).toHaveLength(1);

    listeners[0]?.({ name: 'some-other-command' });
    expect(onChange).not.toHaveBeenCalled();

    listeners[0]?.({ name: '_execute_action' });
    expect(onChange).toHaveBeenCalledTimes(1);

    listeners[0]?.({ name: '_execute_browser_action' });
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe?.();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('returns null subscription when command change events are unavailable', () => {
    (globalThis as { browser?: unknown }).browser = {
      commands: {},
    };

    expect(subscribeToToggleShortcutChanges(vi.fn())).toBeNull();
  });
});
