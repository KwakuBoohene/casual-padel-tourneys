import {
  USAGE_BATCH_LIMIT,
  usageSessionSchema,
  visitTransition,
  type UsageRoute,
  type UsageVisit
} from "@padel/shared";

export interface VisitAdapters {
  read(): Promise<string | null>;
  write(value: string | null): Promise<void>;
  lock(work: () => Promise<void>): Promise<void>;
  uuid(): string;
  send(events: UsageVisit[], signal: AbortSignal): Promise<void>;
  visible(): boolean;
}
export class VisitClient {
  private active = true;
  private generation = 0;
  private queue: UsageVisit[] = [];
  private sending = false;
  private attempts = 0;
  private controller?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private readonly adapters: VisitAdapters,
    private readonly actor: string
  ) {}
  async visit(route: UsageRoute): Promise<void> {
    if (!this.active || !this.adapters.visible()) return;
    const generation = this.generation;
    try {
      await this.adapters.lock(async () => {
        if (!this.active || generation !== this.generation || !this.adapters.visible()) return;
        const raw = await this.adapters.read();
        const parsed = usageSessionSchema.safeParse(raw ? JSON.parse(raw) : null);
        const now = Date.now();
        const next = visitTransition(parsed.success ? parsed.data : null, {
          now,
          route,
          id: this.adapters.uuid(),
          actor: this.actor
        });
        if (!this.active || generation !== this.generation) return;
        await this.adapters.write(JSON.stringify(next.session));
        if (!this.active) {
          await this.adapters.write(null);
          return;
        }
        if (generation !== this.generation || !this.adapters.visible()) return;
        if (next.emit && this.queue.length < USAGE_BATCH_LIMIT)
          this.queue.push({
            id: this.adapters.uuid(),
            sessionId: next.session.id,
            route,
            occurredAt: new Date(now).toISOString()
          });
      });
      void this.flush();
    } catch {
      /* Optional storage and telemetry must never break organizer navigation. */
    }
  }
  pause(): void {
    this.generation++;
    this.queue = [];
    this.controller?.abort();
    clearTimeout(this.timer);
    this.attempts = 0;
  }
  stop(): void {
    this.active = false;
    this.pause();
  }
  private async flush(): Promise<void> {
    if (!this.active || this.sending || !this.queue.length || !this.adapters.visible()) return;
    this.sending = true;
    const generation = this.generation;
    const batch = this.queue.slice(0, USAGE_BATCH_LIMIT);
    this.controller = new AbortController();
    const timeout = setTimeout(() => this.controller?.abort(), 5000);
    let retry = false;
    try {
      await this.adapters.send(batch, this.controller.signal);
      const sent = new Set(batch.map((event) => event.id));
      this.queue = this.queue.filter((event) => !sent.has(event.id));
      this.attempts = 0;
    } catch {
      if (generation !== this.generation) return;
      retry = this.active && this.adapters.visible() && this.attempts++ < 2;
      if (!retry) this.queue = [];
    } finally {
      clearTimeout(timeout);
      this.sending = false;
      if (this.active && this.queue.length)
        this.timer = setTimeout(
          () => {
            void this.flush();
          },
          retry ? 1000 * 2 ** this.attempts : 0
        );
    }
  }
}
