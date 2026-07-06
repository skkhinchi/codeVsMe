import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  completeFromList,
} from '@codemirror/autocomplete';
import { localCompletionSource, snippets } from '@codemirror/lang-javascript';
import { playgroundScope } from './playgroundScope';

const IDENT = /^[\w$]+$/;

const KEYWORDS = [
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'of',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
];

function enumerateMembers(obj: unknown): Completion[] {
  const options: Completion[] = [];
  const seen = new Set<string>();
  let current: unknown = obj;
  let depth = 0;

  while (current && (typeof current === 'object' || typeof current === 'function')) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (!IDENT.test(name) || seen.has(name)) continue;
      seen.add(name);

      let value: unknown;
      try {
        value = (obj as Record<string, unknown>)[name];
      } catch {
        continue;
      }

      options.push({
        label: name,
        type: typeof value === 'function' ? 'method' : 'property',
        boost: -depth,
      });
    }

    const next = Object.getPrototypeOf(current);
    if (!next) break;
    current = next;
    depth += 1;
  }

  return options;
}

function memberCompletions(context: CompletionContext): CompletionResult | null {
  const member = context.matchBefore(/[\w$]+\.[\w$]*$/);
  if (!member) return null;

  const dot = member.text.lastIndexOf('.');
  const objectName = member.text.slice(0, dot);
  const partial = member.text.slice(dot + 1).toLowerCase();
  const obj = playgroundScope[objectName];

  if (obj === undefined) return null;

  const options = enumerateMembers(obj).filter((option) =>
    option.label.toLowerCase().startsWith(partial),
  );

  if (options.length === 0 && partial.length > 0) return null;

  return {
    from: member.from + dot + 1,
    options,
    validFor: /^[\w$]*$/,
  };
}

function topLevelCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w$]*$/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const query = word.text.toLowerCase();
  const globals = Object.keys(playgroundScope).map((label) => ({
    label,
    type: 'variable' as const,
  }));
  const keywords = KEYWORDS.map((label) => ({ label, type: 'keyword' as const }));

  const options = [...globals, ...keywords]
    .filter((option) => option.label.toLowerCase().startsWith(query))
    .slice(0, 50);

  if (options.length === 0) return null;

  return { from: word.from, options, validFor: /^[\w$]*$/ };
}

export function playgroundCompletions(context: CompletionContext): CompletionResult | null {
  return memberCompletions(context) ?? topLevelCompletions(context);
}

export const playgroundCompletionSources = [
  playgroundCompletions,
  localCompletionSource,
  completeFromList(snippets),
];
