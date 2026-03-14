/**
 * Lightweight i18n system -- Zustand store + helper functions.
 *
 * - `useLocale()` -- React hook for locale state
 * - `t(key, vars?)` -- translate UI string (dot-path + {var} interpolation)
 * - `getLocale()` -- non-hook getter for outside React
 */

import { create } from "zustand";
import deStrings from "./locales/de.json";
import enStrings from "./locales/en.json";

// ---- Types ----

export type Locale = "de" | "en";

interface LocaleState {
  readonly locale: Locale;
  readonly setLocale: (l: Locale) => void;
  readonly toggleLocale: () => void;
}

// ---- String dictionaries ----

type StringDict = Record<string, unknown>;

const STRINGS: Record<Locale, StringDict> = {
  de: deStrings as StringDict,
  en: enStrings as StringDict,
};

// ---- Persistence ----

const STORAGE_KEY = "training_locale";

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch { /* SSR or blocked storage */ }
  return "de";
}

function saveLocale(l: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch { /* ignore */ }
}

// ---- Store ----

export const useLocale = create<LocaleState>((set) => ({
  locale: loadLocale(),

  setLocale: (l: Locale) => {
    saveLocale(l);
    set({ locale: l });
  },

  toggleLocale: () => {
    set((state) => {
      const next: Locale = state.locale === "de" ? "en" : "de";
      saveLocale(next);
      return { locale: next };
    });
  },
}));

// ---- Non-hook getter ----

export function getLocale(): Locale {
  return useLocale.getState().locale;
}

// ---- Dot-path lookup ----

function lookup(dict: StringDict, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

// ---- t() -- translate with interpolation ----

export function t(key: string, vars?: Record<string, string | number>): string {
  const locale = getLocale();
  let result = lookup(STRINGS[locale], key);

  // Fallback: try other locale, then return key
  if (result === undefined) {
    const fallback: Locale = locale === "de" ? "en" : "de";
    result = lookup(STRINGS[fallback], key);
  }
  if (result === undefined) return key;

  // Interpolate {var} placeholders
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.split(`{${k}}`).join(String(v));
    }
  }

  return result;
}
