import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppShellContextValue = {
  filtersToggle: (() => void) | null;
  registerFiltersToggle: (fn: (() => void) | null) => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [filtersToggle, setFiltersToggle] = useState<(() => void) | null>(null);

  // React treats a bare function as setState updater — wrap so we store the callback.
  const registerFiltersToggle = useCallback((fn: (() => void) | null) => {
    setFiltersToggle(() => fn);
  }, []);

  const value = useMemo(
    () => ({
      filtersToggle,
      registerFiltersToggle,
    }),
    [filtersToggle, registerFiltersToggle],
  );

  return (
    <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
  );
}

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
}
