import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import {SSRProvider} from 'react-aria';
import {handleDarkAndLightModeEls} from "~/utils/theme-provider";


function hydrate() {
    handleDarkAndLightModeEls();
  startTransition(() => {
    hydrateRoot(
      document,
        <SSRProvider>
          <RemixBrowser />
        </SSRProvider>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1);
}
