import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const CrumbLabelContext = createContext<{
  label: string | null;
  setLabel: (label: string | null) => void;
} | null>(null);

/**
 * Lets a detail page override the final breadcrumb segment with the entity's
 * slug/name instead of the raw route id (US1/AC2, FR-003).
 */
export function CrumbLabelProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <CrumbLabelContext.Provider value={{ label, setLabel }}>
      {children}
    </CrumbLabelContext.Provider>
  );
}

export function useCrumbLabel(): string | null {
  return useContext(CrumbLabelContext)?.label ?? null;
}

/** Registers `label` as the current page crumb; cleared on unmount/change. */
export function useSetCrumbLabel(label: string | null) {
  const ctx = useContext(CrumbLabelContext);
  useEffect(() => {
    ctx?.setLabel(label);
    return () => ctx?.setLabel(null);
  }, [ctx, label]);
}
