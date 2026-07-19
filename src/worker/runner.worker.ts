export type ConsoleLevel = 'log' | 'error' | 'warn';

export type WorkerOutMessage =
  | { type: 'console'; level: ConsoleLevel; args: string[] }
  | { type: 'error'; message: string; line?: number }
  | { type: 'result'; value: string }
  | { type: 'done' }
  | { type: 'output-limit' };

type WorkerInMessage =
  | { type: 'run'; code: string }
  | { type: 'repl-reset' }
  | { type: 'repl-exec'; input: string };

const MAX_CONSOLE_MESSAGES = 500;

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...fnArgs: unknown[]) => Promise<unknown>;

function serialize(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'function') return value.toString();
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function extractLine(err: unknown): number | undefined {
  if (!(err instanceof Error) || !err.stack) return undefined;

  // AsyncFunction wraps user code roughly as:
  //   async function anonymous(...args) {
  //   ${userCode}
  //   }
  // so V8 stack lines are offset by 2 from the user's source.
  const ASYNC_FUNCTION_LINE_OFFSET = 2;

  const match =
    err.stack.match(/<anonymous>:(\d+):\d+/) ??
    err.stack.match(/eval:(\d+):\d+/) ??
    err.stack.match(/Function:(\d+):\d+/);

  if (!match) return undefined;

  const rawLine = Number.parseInt(match[1], 10);
  if (!Number.isFinite(rawLine)) return undefined;

  const adjusted = rawLine - ASYNC_FUNCTION_LINE_OFFSET;
  return adjusted > 0 ? adjusted : rawLine;
}

/** Prefer "ReferenceError: …" over a bare message so console output matches browsers. */
function formatCaughtError(err: unknown): { message: string; line?: number } {
  if (err instanceof Error) {
    const name = err.name?.trim();
    const detail = err.message?.trim() || 'Unknown error';
    const message = name && name !== 'Error' ? `${name}: ${detail}` : detail;
    return { message, line: extractLine(err) };
  }
  return { message: String(err) };
}

let consoleMessageCount = 0;
let outputLimitReached = false;
let replSession = '';

function createUserConsole() {
  return {
    log: (...args: unknown[]) => postConsole('log', args),
    error: (...args: unknown[]) => postConsole('error', args),
    warn: (...args: unknown[]) => postConsole('warn', args),
  };
}

function resetConsoleLimit() {
  consoleMessageCount = 0;
  outputLimitReached = false;
}

async function runCode(code: string) {
  resetConsoleLimit();
  const userConsole = createUserConsole();

  try {
    const run = new AsyncFunction('console', code);
    await run(userConsole);
    post({ type: 'done' });
  } catch (err) {
    const { message, line } = formatCaughtError(err);
    post({ type: 'error', message, line });
  }
}

async function runReplInput(input: string) {
  resetConsoleLimit();
  const trimmed = input.trim();
  if (!trimmed) {
    post({ type: 'done' });
    return;
  }

  const userConsole = createUserConsole();

  try {
    const expressionCode = `${replSession}return (${trimmed});`;
    const expressionRunner = new AsyncFunction('console', expressionCode);
    const result = await expressionRunner(userConsole);
    if (result !== undefined) {
      post({ type: 'result', value: serialize(result) });
    }
    post({ type: 'done' });
    return;
  } catch (exprErr) {
    if (!(exprErr instanceof SyntaxError)) {
      const { message, line } = formatCaughtError(exprErr);
      post({ type: 'error', message, line });
      return;
    }
  }

  replSession += `${trimmed}\n`;

  try {
    const statementRunner = new AsyncFunction('console', replSession);
    await statementRunner(userConsole);
    post({ type: 'done' });
  } catch (err) {
    replSession = replSession.slice(0, -trimmed.length - 1);
    const { message, line } = formatCaughtError(err);
    post({ type: 'error', message, line });
  }
}

function post(message: WorkerOutMessage) {
  self.postMessage(message);
}

function postConsole(level: ConsoleLevel, args: unknown[]) {
  if (outputLimitReached) return;

  consoleMessageCount += 1;
  if (consoleMessageCount > MAX_CONSOLE_MESSAGES) {
    outputLimitReached = true;
    post({ type: 'output-limit' });
    return;
  }

  post({ type: 'console', level, args: args.map(serialize) });
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;

  if (message.type === 'repl-reset') {
    replSession = '';
    resetConsoleLimit();
    return;
  }

  if (message.type === 'repl-exec') {
    void runReplInput(message.input);
    return;
  }

  if (message.type === 'run') {
    void runCode(message.code);
  }
};
