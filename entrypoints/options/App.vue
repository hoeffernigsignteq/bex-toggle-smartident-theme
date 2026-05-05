<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { parseAllowedMatchPatterns, type PatternValidationError } from '@/lib/allowlist';
import {
  DEFAULT_TOGGLE_SHORTCUT,
  getShortcutSettingsLink,
  getToggleShortcutLabel,
  openShortcutSettingsPage,
  subscribeToToggleShortcutChanges,
  type ShortcutSettingsLink,
} from '@/lib/shortcut';
import {
  DEFAULT_ALLOWED_MATCH_PATTERNS,
  getSettings,
  resetSettings,
  saveAllowedMatchPatterns,
} from '@/lib/settings';

type FeedbackKind = 'success' | 'error' | 'info';

const patternsText = ref('');
const validationErrors = ref<PatternValidationError[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const feedbackMessage = ref('');
const feedbackKind = ref<FeedbackKind>('info');
const shortcutLabel = ref(DEFAULT_TOGGLE_SHORTCUT);
const shortcutSettingsLink = ref<ShortcutSettingsLink | null>(null);
const shortcutSubscriptionCleanups: Array<() => void> = [];

const parsedPatternCount = computed(
  () => parseAllowedMatchPatterns(patternsText.value).patterns.length,
);

const feedbackToneClass = computed(() => {
  if (feedbackKind.value === 'success') {
    return 'text-success-300';
  }
  if (feedbackKind.value === 'error') {
    return 'text-error-300';
  }
  return 'text-neutral-300';
});

onMounted(async () => {
  await Promise.all([loadSettings(), refreshShortcutUi(), loadShortcutSettingsLink()]);
  setupShortcutRefreshHandlers();
});

onBeforeUnmount(() => {
  shortcutSubscriptionCleanups.forEach((cleanup) => cleanup());
  shortcutSubscriptionCleanups.length = 0;
});

async function loadSettings(): Promise<void> {
  isLoading.value = true;

  try {
    const settings = await getSettings();
    patternsText.value = settings.allowedMatchPatterns.join('\n');
    validationErrors.value = [];
    setFeedback('Allowlist loaded.', 'info');
  } catch (error) {
    setFeedback(
      `Unable to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
  } finally {
    isLoading.value = false;
  }
}

async function onSave(): Promise<void> {
  isSaving.value = true;

  try {
    const parsed = validateInput();

    if (parsed.errors.length > 0) {
      setFeedback('Fix invalid match patterns before saving.', 'error');
      return;
    }

    const settings = await saveAllowedMatchPatterns(parsed.patterns);
    patternsText.value = settings.allowedMatchPatterns.join('\n');
    setFeedback('Allowlist saved.', 'success');
  } catch (error) {
    setFeedback(
      `Unable to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
  } finally {
    isSaving.value = false;
  }
}

async function onResetToDefault(): Promise<void> {
  isSaving.value = true;

  try {
    const settings = await resetSettings();
    patternsText.value = settings.allowedMatchPatterns.join('\n');
    validationErrors.value = [];
    setFeedback('Default allowlist restored.', 'success');
  } catch (error) {
    setFeedback(
      `Unable to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
  } finally {
    isSaving.value = false;
  }
}

function validateInput(): ReturnType<typeof parseAllowedMatchPatterns> {
  const parsed = parseAllowedMatchPatterns(patternsText.value);
  validationErrors.value = parsed.errors;
  return parsed;
}

function setFeedback(message: string, kind: FeedbackKind): void {
  feedbackMessage.value = message;
  feedbackKind.value = kind;
}

async function refreshShortcutUi(): Promise<void> {
  try {
    shortcutLabel.value = await getToggleShortcutLabel();
  } catch {
    shortcutLabel.value = DEFAULT_TOGGLE_SHORTCUT;
  }
}

async function loadShortcutSettingsLink(): Promise<void> {
  try {
    shortcutSettingsLink.value = await getShortcutSettingsLink();
  } catch {
    shortcutSettingsLink.value = null;
  }
}

async function onOpenShortcutSettings(): Promise<void> {
  if (!shortcutSettingsLink.value) {
    setFeedback('Shortcut settings page is not available in this browser.', 'info');
    return;
  }

  const result = await openShortcutSettingsPage(shortcutSettingsLink.value);
  if (result.opened) {
    setFeedback('Opened shortcut settings page in a new tab.', 'info');
    return;
  }

  setFeedback(
    `Could not open shortcut settings automatically. Open ${shortcutSettingsLink.value.url} manually.`,
    'error',
  );
}

function setupShortcutRefreshHandlers(): void {
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void refreshShortcutUi();
    }
  };

  const onWindowFocus = (): void => {
    void refreshShortcutUi();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onWindowFocus);

  shortcutSubscriptionCleanups.push(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
  shortcutSubscriptionCleanups.push(() => {
    window.removeEventListener('focus', onWindowFocus);
  });

  const unsubscribeShortcutEvents = subscribeToToggleShortcutChanges(() => {
    void refreshShortcutUi();
  });

  if (unsubscribeShortcutEvents) {
    shortcutSubscriptionCleanups.push(unsubscribeShortcutEvents);
  }
}
</script>

<template>
  <main class="min-h-dvh px-4 py-9 text-neutral-50">
    <section class="mx-auto max-w-[760px] rounded-xl border border-neutral-700 bg-neutral-900/95 p-7 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
      <header class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-tighter text-neutral-300">
          SmartIdent Branding Toggle
        </p>
        <h1 class="-mt-2 text-3xl font-bold">Allowed Hosts</h1>
        <p class="text-neutral-300">
          The extension will only toggle SmartIdent branding styles on URLs that match the
          patterns listed below. This includes
          <code class="rounded bg-neutral-800/75 px-1 py-0.5 font-mono text-xs text-neutral-100"
            >#smartident-branding-css</code
          >, typography and focus-ring style elements, plus inline
          <code class="rounded bg-neutral-800/75 px-1 py-0.5 font-mono text-xs text-neutral-100"
            >--color-*</code
          >
          variables on the
          <code class="rounded bg-neutral-800/75 px-1 py-0.5 font-mono text-xs text-neutral-100"
            >&lt;html&gt;</code
          >
          element.
        </p>
      </header>

      <div class="flex flex-col gap-2.5">
        <span class="inline-flex items-center rounded-full bg-neutral-800/70 px-3 py-1.5 text-xs font-semibold text-neutral-200 w-max">
          Current shortcut: {{ shortcutLabel }}
        </span>
        <button
          v-if="shortcutSettingsLink"
          type="button"
          :disabled="isLoading || isSaving"
          class="inline-flex items-center border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-brand-700/25 disabled:cursor-default disabled:opacity-60 w-max"
          @click="onOpenShortcutSettings"
        >
          {{ shortcutSettingsLink.label }}
        </button>
      </div>

      <p class="rounded-full bg-success-700 px-3 py-1.5 text-xs font-semibold text-brand-100 w-max">
        {{ parsedPatternCount }} valid pattern{{ parsedPatternCount === 1 ? '' : 's' }}
      </p>

      <label
        for="allowlist-input"
        class="inline-block text-sm font-semibold text-neutral-100"
      >
        Match patterns (one per line)
      </label>
      <textarea
        id="allowlist-input"
        v-model="patternsText"
        spellcheck="false"
        :disabled="isLoading || isSaving"
        rows="5"
        placeholder="https://verify.smartident.io/*"
        class="-mt-2 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-800/85 px-3.5 py-3 text-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        @blur="validateInput"
      />

      <p class="text-neutral-300">
        Use match patterns such as
        <code class="rounded bg-neutral-800/75 px-1 py-0.5 font-mono text-xs text-neutral-100"
          >https://*.example.com/*</code
        >.
        Exact ports are also supported (for example
        <code class="rounded bg-neutral-800/75 px-1 py-0.5 font-mono text-xs text-neutral-100"
          >https://localhost:5173/*</code
        >).
      </p>

      <div
        v-if="validationErrors.length"
        role="alert"
        aria-live="polite"
        class="rounded-xl border border-error-400/45 bg-error-950/70 p-3 flex flex-col gap-2"
      >
        <h2 class="text-base font-semibold text-error-300">Validation errors</h2>
        <ul class="grid list-disc gap-1.5 pl-8">
          <li v-for="error in validationErrors" :key="`${error.line}-${error.pattern}`">
            Line {{ error.line }}:
            <code class="rounded bg-neutral-800/75 px-1 py-0.5 font-mono text-xs text-neutral-100">{{ error.pattern }}</code>
            - {{ error.message }}
          </li>
        </ul>
      </div>

      <p
        role="note"
        class="rounded-lg border border-warning-400/45 bg-warning-950/74 px-3 py-2.5 text-warning-200"
      >
        Disclaimer: disabling branding does not fully revert every custom branding change. Most
        notably, colors baked into Lottie animations remain custom-branded.
      </p>

      <div class="flex flex-wrap gap-2.5">
        <button
          type="button"
          :disabled="isLoading || isSaving"
          class="border border-neutral-700 text-white px-4 py-2.5 font-semibold transition bg-brand-500 hover:bg-brand-700 w-max disabled:cursor-not-allowed disabled:opacity-60"
          @click="onSave"
        >
          {{ isSaving ? 'Saving...' : 'Save allowlist' }}
        </button>
        <button
          type="button"
          :disabled="isLoading || isSaving"
          class="border border-neutral-700 text-neutral-100 px-4 py-2.5 font-semibold transition bg-neutral-800 hover:bg-neutral-700 w-max disabled:cursor-not-allowed disabled:opacity-60"
          @click="onResetToDefault"
        >
          Reset to defaults
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        class="text-sm font-medium"
        :class="feedbackToneClass"
      >
        {{ feedbackMessage }}
      </p>

      <hr class="border-t border-dashed border-neutral-700" />

      <details>
        <summary class="font-semibold text-neutral-100">Default patterns</summary>
        <ul class="grid list-disc gap-1.5 ml-8">
          <li v-for="pattern in DEFAULT_ALLOWED_MATCH_PATTERNS" :key="pattern">
            <code class="rounded bg-neutral-800/75 px-1 py-0.5 font-mono text-xs text-neutral-100">{{ pattern }}</code>
          </li>
        </ul>
      </details>
    </section>
  </main>
</template>
