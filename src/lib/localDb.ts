// Simple localStorage wrapper usable in client components.
// For server components you’d replace this with a DB layer.

export const localDb = {
  async get<T>(key: string, fallback: T): Promise<T> {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};
