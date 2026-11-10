import {
  isWebAppInstalled,
  requestWebInstall,
  subscribeToWebInstall,
  webInstallBrowserHint,
  webInstallInstructions
} from "@padel/shared/webInstall";
import { useId, useRef, useSyncExternalStore } from "react";

export function InstallApp() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const installed = useSyncExternalStore(subscribeToWebInstall, isWebAppInstalled);

  async function handleInstall() {
    if (!(await requestWebInstall())) dialog.current?.showModal();
  }

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-md px-1 text-xs font-semibold text-padel-primary hover:underline"
      >
        Install app
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md overflow-auto rounded-2xl border border-padel-border bg-padel-surface p-5 text-padel-text shadow-xl backdrop:bg-black/60"
      >
        <h2 id={titleId} className="text-lg font-bold">Install Casual Padel Tourneys</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed">
          {webInstallInstructions(navigator).map((step) => <p key={step}>{step}</p>)}
          <p className="text-padel-muted">{webInstallBrowserHint}</p>
        </div>
        <form method="dialog" className="mt-4 flex justify-end">
          <button type="submit" className="min-h-11 cursor-pointer rounded-xl border border-padel-border px-4 text-sm font-semibold">
            Done
          </button>
        </form>
      </dialog>
    </>
  );
}
