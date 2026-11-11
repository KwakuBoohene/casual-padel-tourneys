import { useId, useRef, type ReactNode } from "react";

export function ReportTooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const hovered = useRef(false);

  function open() {
    const button = trigger.current;
    const panel = tooltip.current;
    if (!button || !panel || panel.matches(":popover-open")) return;
    panel.showPopover();
    const anchor = button.getBoundingClientRect();
    const { clientWidth, clientHeight } = document.documentElement;
    const margin = 8;
    const above = anchor.top - margin;
    const below = clientHeight - anchor.bottom - margin;
    panel.style.maxHeight = "";
    const placeAbove = panel.offsetHeight > below && above > below;
    panel.style.maxHeight = `${Math.max(0, placeAbove ? above : below)}px`;
    panel.style.top = `${placeAbove ? anchor.top - panel.offsetHeight : anchor.bottom}px`;
    panel.style.left = `${Math.max(margin, Math.min(anchor.right - panel.offsetWidth, clientWidth - panel.offsetWidth - margin))}px`;
  }

  function closeIfIdle() {
    if (!hovered.current && !pinned.current && !trigger.current?.matches(":focus-visible")) {
      tooltip.current?.hidePopover();
    }
  }

  return (
    <div
      className="inline-flex shrink-0 align-middle"
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") {
          hovered.current = true;
          open();
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") {
          hovered.current = false;
          closeIfIdle();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-describedby={id}
        popoverTarget={id}
        className="grid size-8 place-items-center rounded-full text-padel-muted hover:bg-padel-surface-alt hover:text-padel-primary"
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) open();
        }}
        onBlur={closeIfIdle}
        onClick={(event) => {
          event.preventDefault();
          if (pinned.current) tooltip.current?.hidePopover();
          else {
            pinned.current = true;
            open();
          }
        }}
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v5m0-8v1" />
        </svg>
      </button>
      <div
        ref={tooltip}
        id={id}
        role="tooltip"
        popover="auto"
        className="fixed inset-auto m-0 max-h-[60dvh] w-96 max-w-[calc(100vw-1rem)] space-y-2 overflow-auto rounded-lg border border-padel-border bg-padel-surface p-3 text-left text-sm text-padel-text shadow-xl"
        onToggle={(event) => {
          if (event.newState === "closed") pinned.current = false;
        }}
      >
        {children}
      </div>
    </div>
  );
}
