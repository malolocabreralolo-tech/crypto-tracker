const STORAGE_KEY = 'crypto-tracker-settings';

export interface Settings {
  alchemyApiKey?: string;
  heliusApiKey?: string;
  currency: 'USD';
  theme: 'dark' | 'light';
}

const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  theme: 'dark',
};

/**
 * Get current settings, merged with defaults.
 */
export function getSettings(): Settings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const stored = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Update settings (partial merge).
 */
export function updateSettings(updates: Partial<Settings>): Settings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  const current = getSettings();
  const merged: Settings = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
