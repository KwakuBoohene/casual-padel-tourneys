type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const configuredLevel = (process.env.EXPO_PUBLIC_LOG_LEVEL as LogLevel | undefined) ?? "debug";

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[configuredLevel];
}

function formatPrefix(level: LogLevel): string {
  return `[mobile][${level.toUpperCase()}]`;
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

