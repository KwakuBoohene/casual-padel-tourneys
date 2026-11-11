import type { ReactNode } from "react";
import { resolveSentryProjectUrl } from "../../lib/admin/sentryProject";

export function SentryLink({ className, icon }: { className?: string; icon?: ReactNode }) {
  const url = resolveSentryProjectUrl(window.__PADEL_CONFIG__?.sentryProjectUrl);
  if (!url) return null;
  return (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      title="Sentry manages its own sign-in and project permissions."
    >
      {icon}
      <span>Sentry errors &amp; traces <span aria-hidden="true">↗</span></span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
