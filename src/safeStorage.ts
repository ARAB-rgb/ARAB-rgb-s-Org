/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let isLocalStorageAvailable = false;

try {
  const testKey = "__test_storage_avail__";
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
  isLocalStorageAvailable = true;
} catch (e) {
  isLocalStorageAvailable = false;
  console.warn("⚠️ localStorage is not accessible in this context. Falling back to safe in-memory storage.");
}

const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    if (isLocalStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // Fallback
      }
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : null;
  },

  setItem(key: string, value: string): void {
    const strVal = String(value);
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, strVal);
        return;
      } catch (e) {
        // Fallback
      }
    }
    memoryStorage[key] = strVal;
  },

  removeItem(key: string): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback
      }
    }
    delete memoryStorage[key];
  },

  clear(): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        // Fallback
      }
    }
    for (const key of Object.keys(memoryStorage)) {
      delete memoryStorage[key];
    }
  }
};
