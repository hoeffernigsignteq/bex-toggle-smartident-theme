import {
  getBrandingStylesheetStatus,
  toggleBrandingStylesheet,
  type ToggleBrandingElementStatus,
} from '@/lib/toggle-branding';
import {
  GET_BRANDING_STATUS_MESSAGE,
  TOGGLE_BRANDING_MESSAGE,
  type GetBrandingStatusRequest,
  type ToggleBrandingRequest,
  type ToggleBrandingResult,
} from '@/lib/types';
import { SUPPORTED_MATCH_PATTERNS } from '@/lib/host-patterns';

const STATUS_WAIT_TIMEOUT_MS = 15_000;

export default defineContentScript({
  matches: [...SUPPORTED_MATCH_PATTERNS],
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (isToggleBrandingMessage(message)) {
        sendResponse(handleToggleRequest());
        return true;
      }

      if (isGetBrandingStatusMessage(message)) {
        void handleStatusRequest().then(sendResponse);
        return true;
      }

      return undefined;
    });
  },
});

function isToggleBrandingMessage(message: unknown): message is ToggleBrandingRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === TOGGLE_BRANDING_MESSAGE
  );
}

function isGetBrandingStatusMessage(message: unknown): message is GetBrandingStatusRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === GET_BRANDING_STATUS_MESSAGE
  );
}

function handleToggleRequest(): ToggleBrandingResult {
  try {
    const status = toggleBrandingStylesheet();
    return { status };
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unknown content script error.',
    };
  }
}

async function handleStatusRequest(): Promise<ToggleBrandingResult> {
  try {
    const status = await waitForBrandingStylesheetStatus(document, STATUS_WAIT_TIMEOUT_MS);
    return { status };
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unknown content script error.',
    };
  }
}

function waitForBrandingStylesheetStatus(
  doc: Document,
  timeoutMs: number,
): Promise<ToggleBrandingElementStatus> {
  const immediate = getBrandingStylesheetStatus(doc);
  if (immediate !== 'not_found') {
    return Promise.resolve(immediate);
  }

  return new Promise<ToggleBrandingElementStatus>((resolve) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const resolveOnce = (status: ToggleBrandingElementStatus): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      observer.disconnect();
      doc.removeEventListener('DOMContentLoaded', onDomContentLoaded);
      resolve(status);
    };

    const probeStatus = (): void => {
      const status = getBrandingStylesheetStatus(doc);
      if (status !== 'not_found') {
        resolveOnce(status);
      }
    };

    const onDomContentLoaded = (): void => {
      probeStatus();
    };

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', onDomContentLoaded, { once: true });
    }

    const observerTarget = doc.documentElement;
    const observer = new MutationObserver(() => {
      probeStatus();
    });

    observer.observe(observerTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'disabled', 'style'],
    });

    probeStatus();

    timeoutId = setTimeout(() => {
      resolveOnce('not_found');
    }, timeoutMs);
  });
}
