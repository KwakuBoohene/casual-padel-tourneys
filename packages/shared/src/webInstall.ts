interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

const browser = typeof window === "undefined" ? undefined : window;
const standalone = browser?.matchMedia("(display-mode: standalone)");
let installPrompt: InstallPromptEvent | undefined;
let installed = false;

// Register when the client bundle loads, before the UI or session is ready.
browser?.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event as InstallPromptEvent;
});
browser?.addEventListener("appinstalled", () => {
  installPrompt = undefined;
  installed = true;
});

export function isWebAppInstalled(): boolean {
  const navigator = browser?.navigator as (Navigator & { standalone?: boolean }) | undefined;
  return installed || standalone?.matches === true || navigator?.standalone === true;
}

export function subscribeToWebInstall(onChange: () => void): () => void {
  standalone?.addEventListener("change", onChange);
  browser?.addEventListener("appinstalled", onChange);
  return () => {
    standalone?.removeEventListener("change", onChange);
    browser?.removeEventListener("appinstalled", onChange);
  };
}

export async function requestWebInstall(): Promise<boolean> {
  const prompt = installPrompt;
  if (!prompt) return false;
  installPrompt = undefined;
  try {
    await prompt.prompt();
    return true;
  } catch {
    // The browser can withdraw the prompt. Use the manual steps in that case.
    return false;
  }
}

export function webInstallInstructions({ userAgent, maxTouchPoints }: Navigator): string[] {
  const isMac = /Macintosh/.test(userAgent);
  if (/iPhone|iPad|iPod/.test(userAgent) || (isMac && maxTouchPoints > 1)) {
    return [
      "Open this site in Safari. Tap Share (under More if needed), then Add to Home Screen. Leave Open as Web App on if shown, then tap Add."
    ];
  }
  if (/Android/.test(userAgent)) {
    return [
      "Open this site in Chrome. Tap More (⋮), choose Install and create shortcut (or Add to home screen), then tap Install."
    ];
  }
  const steps = [
    "Chrome · Use the install icon in the address bar or choose Install page as app under Cast, save, and share.",
    "Edge · Open More tools → Apps → Install this site as an app."
  ];
  if (isMac) steps.push("Safari · Choose File → Add to Dock.");
  if (/Windows/.test(userAgent)) steps.push("Firefox · Select the web apps button in the address bar if available.");
  return steps;
}

export const webInstallBrowserHint = "If you opened the link inside another app, open it in your browser first.";
