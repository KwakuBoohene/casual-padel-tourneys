"use client";

import { formatKohLastResult, formatKohPair, type KohPublicCourt } from "./kohTypes";

export function KohCourtCard({ court }: { court: KohPublicCourt }) {
  const last = formatKohLastResult(court.lastResult);
  return (
    <article className="rounded-2xl border border-padel-border bg-padel-surface overflow-hidden">
      <header className="bg-padel-primary px-4 py-3">
        <h2 className="text-[17px] font-bold text-padel-onPrimary">Court {court.courtNumber}</h2>
        {court.tempSwap ? (
          <p className="text-xs font-semibold text-padel-onPrimary/80 mt-1">
            Temp swap · {court.tempSwap.slot}
          </p>
        ) : null}
      </header>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-padel-primary">KING</p>
          <p className="text-lg font-bold text-padel-text">{formatKohPair(court.king)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-padel-muted">NEXT</p>
          <p className="text-base font-semibold text-padel-text">{formatKohPair(court.challenger)}</p>
        </div>
        {court.waiting.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-widest text-padel-muted">WAITING</p>
            {court.waiting.map((unit) => (
              <p key={unit.id} className="text-sm text-padel-muted">
                {formatKohPair(unit)}
              </p>
            ))}
          </div>
        ) : null}
        {last ? <p className="text-sm text-padel-muted pt-1 border-t border-padel-border">{last}</p> : null}
      </div>
    </article>
  );
}
