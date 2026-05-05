import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { SUPPORTED_MATCH_PATTERNS } from './lib/host-patterns';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser, manifestVersion }) => ({
    name: 'SmartIdent Branding Toggle',
    short_name: 'Branding Toggle',
    description: 'Toggle SmartIdent custom branding styles.',
    permissions: ['storage', 'tabs', ...(browser === 'firefox' ? ['contextMenus'] : [])],
    host_permissions: [...SUPPORTED_MATCH_PATTERNS],
    commands: {
      [manifestVersion === 3 ? '_execute_action' : '_execute_browser_action']: {
        suggested_key: {
          default: 'Alt+Shift+S',
        },
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'smartident-branding-toggle@signteq.local',
      },
    },
    ...(manifestVersion === 3
      ? {
          action: {
            default_title: 'Toggle SmartIdent branding stylesheet',
          },
        }
      : {
          browser_action: {
            default_title: 'Toggle SmartIdent branding stylesheet',
          },
        }),
  }),
});
