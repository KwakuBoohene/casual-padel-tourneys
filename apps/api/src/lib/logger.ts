type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LOG_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);

export function resolveApiLogLevel(): LogLevel {
  const raw = process.env.API_LOG_LEVEL;
  if (raw && LOG_LEVELS.has(raw as LogLevel)) {
    return raw as LogLevel;
  }
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.NODE_TEST_CONTEXT)
  ) {
    return "info";
  }
  return "debug";
}

const configuredLevel = resolveApiLogLevel();

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
      console.debug(formatPrefix("debug"), ...args);
    }
  },
  info(...args: unknown[]) {
    if (shouldLog("info")) {
      console.info(formatPrefix("info"), ...args);
    }
  },
  warn(...args: unknown[]) {
    if (shouldLog("warn")) {
      console.warn(formatPrefix("warn"), ...args);
    }
  },
  error(...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(formatPrefix("error"), ...args);
    }
  }
};
