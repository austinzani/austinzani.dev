import { useFetcher } from "@remix-run/react";
import * as React from "react";

enum Accent {
  ORANGE = "orange",
  BLUE = "blue",
  GREEN = "green",
  PINK = "pink",
}

const accents: Array<Accent> = Object.values(Accent);

type AccentContextType = [
  Accent,
  React.Dispatch<React.SetStateAction<Accent>>,
];

const AccentContext = React.createContext<AccentContextType | undefined>(
  undefined
);
AccentContext.displayName = "AccentContext";

/**
 * Provides the site accent preference and persists changes to a signed cookie.
 */
function AccentProvider({
  children,
  specifiedAccent,
}: {
  children: React.ReactNode;
  specifiedAccent: Accent | null;
}) {
  const [accent, setAccentState] = React.useState<Accent>(() => {
    if (specifiedAccent && accents.includes(specifiedAccent)) {
      return specifiedAccent;
    }

    return Accent.ORANGE;
  });

  const persistAccent = useFetcher();
  const persistAccentRef = React.useRef(persistAccent);
  React.useEffect(() => {
    persistAccentRef.current = persistAccent;
  }, [persistAccent]);

  const setAccent = React.useCallback(
    (cb: Parameters<typeof setAccentState>[0]) => {
      const newAccent = typeof cb === "function" ? cb(accent) : cb;
      persistAccentRef.current.submit(
        { accent: newAccent },
        { action: "action/set-accent", method: "post" }
      );
      setAccentState(newAccent);
    },
    [accent]
  );

  return (
    <AccentContext.Provider value={[accent, setAccent]}>
      {children}
    </AccentContext.Provider>
  );
}

function useAccent() {
  const context = React.useContext(AccentContext);
  if (context === undefined) {
    throw new Error("useAccent must be used within an AccentProvider");
  }
  return context;
}

function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && accents.includes(value as Accent);
}

export { AccentProvider, useAccent, accents, Accent, isAccent };
