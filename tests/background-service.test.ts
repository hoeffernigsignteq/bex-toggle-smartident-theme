import {
  refreshStatusForActiveTab,
  refreshStatusForTab,
  toggleForActiveTab,
  toggleForTab,
} from '@/lib/background-service';
import type { ToggleBrandingResult } from '@/lib/types';

describe('background toggle orchestration', () => {
  const settingsProvider = async () => ({
    allowedMatchPatterns: ['https://verify.smartident.io/*'],
  });

  it('toggles on allowlisted URLs', async () => {
    const executeToggle = vi
      .fn<() => Promise<ToggleBrandingResult>>()
      .mockResolvedValue({ status: 'disabled' });
    const setActionState = vi.fn(async () => undefined);

    const result = await toggleForTab(
      { id: 100, url: 'https://verify.smartident.io/flow' },
      settingsProvider,
      executeToggle,
      setActionState,
    );

    expect(result).toEqual({ status: 'disabled' });
    expect(executeToggle).toHaveBeenCalledWith(100);
    expect(setActionState).toHaveBeenCalledWith(100, { status: 'disabled' });
  });

  it('returns not_allowed for non-allowlisted URLs without calling toggle executor', async () => {
    const executeToggle = vi
      .fn<() => Promise<ToggleBrandingResult>>()
      .mockResolvedValue({ status: 'disabled' });
    const setActionState = vi.fn(async () => undefined);

    const result = await toggleForTab(
      { id: 7, url: 'https://example.com/' },
      settingsProvider,
      executeToggle,
      setActionState,
    );

    expect(result).toEqual({ status: 'not_allowed' });
    expect(executeToggle).not.toHaveBeenCalled();
    expect(setActionState).toHaveBeenCalledWith(7, { status: 'not_allowed' });
  });

  it('uses the same code path for command and icon click handling', async () => {
    const executeToggle = vi
      .fn<() => Promise<ToggleBrandingResult>>()
      .mockResolvedValue({ status: 'enabled' });
    const setActionState = vi.fn(async () => undefined);

    const iconResult = await toggleForTab(
      { id: 42, url: 'https://verify.smartident.io/report' },
      settingsProvider,
      executeToggle,
      setActionState,
    );

    const commandResult = await toggleForActiveTab(
      async () => ({ id: 42, url: 'https://verify.smartident.io/report' }),
      settingsProvider,
      executeToggle,
      setActionState,
    );

    expect(iconResult).toEqual(commandResult);
    expect(executeToggle).toHaveBeenCalledTimes(2);
    expect(setActionState).toHaveBeenNthCalledWith(1, 42, { status: 'enabled' });
    expect(setActionState).toHaveBeenNthCalledWith(2, 42, { status: 'enabled' });
  });

  it('refreshes ON/OFF state on allowlisted pages without requiring a click', async () => {
    const readStatus = vi
      .fn<() => Promise<ToggleBrandingResult>>()
      .mockResolvedValue({ status: 'enabled' });
    const setActionState = vi.fn(async () => undefined);

    const directResult = await refreshStatusForTab(
      { id: 12, url: 'https://verify.smartident.io/session' },
      settingsProvider,
      readStatus,
      setActionState,
    );

    const activeResult = await refreshStatusForActiveTab(
      async () => ({ id: 12, url: 'https://verify.smartident.io/session' }),
      settingsProvider,
      readStatus,
      setActionState,
    );

    expect(directResult).toEqual({ status: 'enabled' });
    expect(activeResult).toEqual({ status: 'enabled' });
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(setActionState).toHaveBeenNthCalledWith(1, 12, { status: 'enabled' });
    expect(setActionState).toHaveBeenNthCalledWith(2, 12, { status: 'enabled' });
  });
});
