export interface Span {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attrs: Record<string, string | number | boolean>): void;
  recordError(error: Error): void;
  end(): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span;
  withSpan<T>(name: string, fn: () => T, attributes?: Record<string, string | number | boolean>): T;
  withSpanAsync<T>(name: string, fn: () => Promise<T>, attributes?: Record<string, string | number | boolean>): Promise<T>;
}

export const NOOP_TRACER: Tracer = {
  startSpan() {
    return {
      setAttribute() {},
      setAttributes() {},
      recordError() {},
      end() {},
    };
  },
  withSpan(_name, fn) {
    return fn();
  },
  withSpanAsync(_name, fn) {
    return fn();
  },
};
