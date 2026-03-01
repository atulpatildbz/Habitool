type StorageDriver = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryStore = new Map<string, string>();

const memoryStorage: StorageDriver = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  },
};

function getStorageDriver(): StorageDriver {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryStorage;
  }

  try {
    const testKey = '__habitool_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

export const storage = getStorageDriver();
