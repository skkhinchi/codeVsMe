import { useEffect, useState } from 'react';

export function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ?? initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore quota or privacy errors.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
