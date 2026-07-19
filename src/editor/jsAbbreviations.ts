import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippetCompletion,
} from '@codemirror/autocomplete';

/**
 * Short abbreviations (VS Code / Emmet style) for the JS playground.
 * Accepting a suggestion inserts a snippet; the first placeholder (e.g. name)
 * is selected so you can type over it immediately.
 */
type Abbreviation = {
  abbrev: string;
  label: string;
  detail: string;
  /** CodeMirror snippet — first `${…}` is selected after insert. */
  template: string;
  boost?: number;
};

const ABBREVIATIONS: Abbreviation[] = [
  // ── console ──────────────────────────────────────────────
  {
    abbrev: 'clg',
    label: 'clg',
    detail: 'console.log',
    template: 'console.log(${})',
    boost: 99,
  },
  {
    abbrev: 'clog',
    label: 'clog',
    detail: 'console.log',
    template: 'console.log(${})',
    boost: 98,
  },
  {
    abbrev: 'clw',
    label: 'clw',
    detail: 'console.warn',
    template: 'console.warn(${})',
    boost: 90,
  },
  {
    abbrev: 'cle',
    label: 'cle',
    detail: 'console.error',
    template: 'console.error(${})',
    boost: 90,
  },
  {
    abbrev: 'clt',
    label: 'clt',
    detail: 'console.table',
    template: 'console.table(${})',
    boost: 85,
  },

  // ── functions (name selected first — type to rename) ─────
  {
    abbrev: 'waf',
    label: 'waf',
    detail: 'arrow function',
    // ${name} is the first tabstop → selected after expand
    template: 'const ${name} = (${params}) => {\n\t${}\n}',
    boost: 99,
  },
  {
    abbrev: 'aaf',
    label: 'aaf',
    detail: 'async arrow function',
    template: 'const ${name} = async (${params}) => {\n\t${}\n}',
    boost: 95,
  },
  {
    abbrev: 'fn',
    label: 'fn',
    detail: 'function declaration',
    template: 'function ${name}(${params}) {\n\t${}\n}',
    boost: 90,
  },
  {
    abbrev: 'af',
    label: 'af',
    detail: 'async function',
    template: 'async function ${name}(${params}) {\n\t${}\n}',
    boost: 90,
  },
  {
    abbrev: 'afn',
    label: 'afn',
    detail: 'anonymous arrow function',
    template: '(${params}) => {\n\t${}\n}',
    boost: 95,
  },
  {
    abbrev: 'iife',
    label: 'iife',
    detail: 'IIFE',
    template: '(() => {\n\t${}\n})()',
    boost: 88,
  },

  // ── control flow ─────────────────────────────────────────
  {
    abbrev: 'fre',
    label: 'fre',
    detail: 'for…of loop',
    template: 'for (const ${item} of ${iterable}) {\n\t${}\n}',
    boost: 90,
  },
  {
    abbrev: 'fin',
    label: 'fin',
    detail: 'for…in loop',
    template: 'for (const ${key} in ${object}) {\n\t${}\n}',
    boost: 88,
  },
  {
    abbrev: 'fori',
    label: 'fori',
    detail: 'counted for loop',
    template: 'for (let ${i} = 0; ${i} < ${array}.length; ${i}++) {\n\t${}\n}',
    boost: 90,
  },
  {
    abbrev: 'ife',
    label: 'ife',
    detail: 'if / else',
    template: 'if (${condition}) {\n\t${}\n} else {\n\t${}\n}',
    boost: 90,
  },
  {
    abbrev: 'tc',
    label: 'tc',
    detail: 'try / catch',
    template: 'try {\n\t${}\n} catch (${error}) {\n\t${}\n}',
    boost: 90,
  },
  {
    abbrev: 'tcf',
    label: 'tcf',
    detail: 'try / catch / finally',
    template: 'try {\n\t${}\n} catch (${error}) {\n\t${}\n} finally {\n\t${}\n}',
    boost: 88,
  },
  {
    abbrev: 'sw',
    label: 'sw',
    detail: 'switch',
    template:
      'switch (${expression}) {\n\tcase ${value}:\n\t\t${}\n\t\tbreak;\n\tdefault:\n\t\t${}\n}',
    boost: 88,
  },
  {
    abbrev: 'ret',
    label: 'ret',
    detail: 'return',
    template: 'return ${};',
    boost: 85,
  },
  {
    abbrev: 'prom',
    label: 'prom',
    detail: 'new Promise',
    template: 'new Promise((resolve, reject) => {\n\t${}\n})',
    boost: 88,
  },
  {
    abbrev: 'sto',
    label: 'sto',
    detail: 'setTimeout',
    template: 'setTimeout(() => {\n\t${}\n}, ${delay})',
    boost: 88,
  },
  {
    abbrev: 'si',
    label: 'si',
    detail: 'setInterval',
    template: 'setInterval(() => {\n\t${}\n}, ${delay})',
    boost: 85,
  },
  {
    abbrev: 'map',
    label: 'map',
    detail: 'array.map',
    template: '${array}.map((${item}) => {\n\treturn ${}\n})',
    boost: 80,
  },
  {
    abbrev: 'filter',
    label: 'filter',
    detail: 'array.filter',
    template: '${array}.filter((${item}) => {\n\treturn ${}\n})',
    boost: 80,
  },
  {
    abbrev: 'json',
    label: 'json',
    detail: 'JSON.stringify',
    template: 'JSON.stringify(${}, null, 2)',
    boost: 85,
  },
  {
    abbrev: 'jp',
    label: 'jp',
    detail: 'JSON.parse',
    template: 'JSON.parse(${})',
    boost: 85,
  },
];

export function jsAbbreviations(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[A-Za-z_$][\w$]*$/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const query = word.text.toLowerCase();
  if (query.length < 1) return null;

  const options: Completion[] = [];

  for (const item of ABBREVIATIONS) {
    if (!item.abbrev.startsWith(query) && item.abbrev !== query) continue;
    const exactBoost = item.abbrev === query ? 20 : 0;
    options.push(
      snippetCompletion(item.template, {
        label: item.label,
        detail: item.detail,
        type: 'snippet',
        boost: (item.boost ?? 50) + exactBoost,
      }),
    );
  }

  if (options.length === 0) return null;

  return {
    from: word.from,
    options,
    validFor: /^[\w$]*$/,
  };
}
