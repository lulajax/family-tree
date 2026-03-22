/**
 * Minimal structured logger for v1.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'http';

function normalizeArgs(primary: unknown, secondary?: unknown): {
  message: string;
  meta?: unknown;
} {
  if (typeof primary === 'string') {
    return { message: primary, meta: secondary };
  }

  if (typeof secondary === 'string') {
    return { message: secondary, meta: primary };
  }

  return {
    message: typeof primary === 'object' ? 'log' : String(primary),
    meta: primary,
  };
}

function write(level: LogLevel, primary: unknown, secondary?: unknown): void {
  const { message, meta } = normalizeArgs(primary, secondary);
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  const consoleMethod =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'debug'
          ? console.debug
          : console.log;

  if (meta === undefined) {
    consoleMethod(prefix, message);
    return;
  }

  consoleMethod(prefix, message, meta);
}

export const logger = {
  debug(primary: unknown, secondary?: unknown): void {
    write('debug', primary, secondary);
  },
  info(primary: unknown, secondary?: unknown): void {
    write('info', primary, secondary);
  },
  warn(primary: unknown, secondary?: unknown): void {
    write('warn', primary, secondary);
  },
  error(primary: unknown, secondary?: unknown): void {
    write('error', primary, secondary);
  },
  http(primary: unknown, secondary?: unknown): void {
    write('http', primary, secondary);
  },
};

export class Logger {
  constructor(private readonly scope: string) {}

  debug(primary: unknown, secondary?: unknown): void {
    logger.debug(primary, this.withScope(secondary));
  }

  info(primary: unknown, secondary?: unknown): void {
    logger.info(primary, this.withScope(secondary));
  }

  warn(primary: unknown, secondary?: unknown): void {
    logger.warn(primary, this.withScope(secondary));
  }

  error(primary: unknown, secondary?: unknown): void {
    logger.error(primary, this.withScope(secondary));
  }

  private withScope(meta?: unknown): string | unknown {
    if (typeof meta === 'string') {
      return `[${this.scope}] ${meta}`;
    }

    return meta === undefined ? `[${this.scope}]` : { scope: this.scope, meta };
  }
}

export const logStream = {
  write(message: string): void {
    logger.http(message.trim());
  },
};

export default logger;
