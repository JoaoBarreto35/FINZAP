import { useCallback } from "react";

export function useLocalStorage() {
  const getItem = useCallback((key: string) => {
    return window.localStorage.getItem(key);
  }, []);

  const setItem = useCallback((key: string, value: string) => {
    window.localStorage.setItem(key, value);
  }, []);

  const removeItem = useCallback((key: string) => {
    window.localStorage.removeItem(key);
  }, []);

  return {
    getItem,
    setItem,
    removeItem,
  };
}