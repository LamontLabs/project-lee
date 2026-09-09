type LogFields = Record<string, unknown>;

export type RequestLogger = {
  level: string;
  trace(fieldsOrMessage?: unknown, message?: string): void;
  debug(fieldsOrMessage?: unknown, message?: string): void;
  info(fieldsOrMessage?: unknown, message?: string): void;
  warn(fieldsOrMessage?: unknown, message?: string): void;
  error(fieldsOrMessage?: unknown, message?: string): void;
  fatal(fieldsOrMessage?: unknown, message?: string): void;
  child(bindings?: LogFields): RequestLogger;
};

declare global {
  namespace Express {
    interface Request {
      log: RequestLogger;
    }
    interface Response {
      log: RequestLogger;
    }
  }
}

function normalize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value && typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
}

function write(level: string, bindings: LogFields, fieldsOrMessage?: unknown, message?: string): void {
  const fields: LogFields = fieldsOrMessage && typeof fieldsOrMessage === "object"
    ? normalize(fieldsOrMessage) as LogFields
    : {};
  const text = message ?? (fieldsOrMessage === undefined ? "" : String(fieldsOrMessage));
  process.stdout.write(`${JSON.stringify({ level, time: Date.now(), ...bindings, ...fields, msg: text })}\n`);
}

function createLogger(bindings: LogFields = {}): RequestLogger {
  const log = (level: string, fieldsOrMessage?: unknown, message?: string) => write(level, bindings, fieldsOrMessage, message);
  return {
    level: "info",
    trace: log.bind(null, "trace"),
    debug: log.bind(null, "debug"),
    info: log.bind(null, "info"),
    warn: log.bind(null, "warn"),
    error: log.bind(null, "error"),
    fatal: log.bind(null, "fatal"),
    child(childBindings: LogFields = {}) {
      return createLogger({ ...bindings, ...childBindings });
    },
  };
}

export const logger = createLogger();