type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const configuredLevel = (process.env.API_LOG_LEVEL as LogLevel | undefined) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[configuredLevel];
}

const COLORS: Record<LogLevel | "reset", string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m"
};

const useAnsiColors = typeof process !== "undefined" && Boolean((process.stdout as unknown as { isTTY?: boolean })?.isTTY);

function formatPrefix(level: LogLevel): string {
  const base = `[api][${level.toUpperCase()}]`;
  if (!useAnsiColors) {
    return base;
  }
  return `${COLORS[level]}${base}${COLORS.reset}`;
}

export const logger = {
  debug(...args: unknown[]) {
    if (shouldLog("debug")) {
      // eslint-disable-next-line no-console
      console.debug(formatPrefix("debug"), ...args);
    }
  },
  info(...args: unknown[]) {
    if (shouldLog("info")) {
      // eslint-disable-next-line no-console
      console.info(formatPrefix("info"), ...args);
    }
  },
  warn(...args: unknown[]) {
    if (shouldLog("warn")) {
      // eslint-disable-next-line no-console
      console.warn(formatPrefix("warn"), ...args);
    }
  },
  error(...args: unknown[]) {
    if (shouldLog("error")) {
      // eslint-disable-next-line no-console
      console.error(formatPrefix("error"), ...args);
    }
  }
};

