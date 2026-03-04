export const TOGGLE_BRANDING_MESSAGE = 'TOGGLE_BRANDING';
export const GET_BRANDING_STATUS_MESSAGE = 'GET_BRANDING_STATUS';

export type ToggleBrandingRequest = {
  type: typeof TOGGLE_BRANDING_MESSAGE;
};

export type GetBrandingStatusRequest = {
  type: typeof GET_BRANDING_STATUS_MESSAGE;
};

export type ToggleBrandingResult =
  | { status: 'enabled' }
  | { status: 'disabled' }
  | { status: 'not_found' }
  | { status: 'not_allowed' }
  | { status: 'error'; reason: string };

export type ExtensionSettings = {
  allowedMatchPatterns: string[];
};

export type ToggleStatus = ToggleBrandingResult['status'];
