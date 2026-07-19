import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippetCompletion,
} from '@codemirror/autocomplete';

/**
 * Adaptive JS control-structure snippets.
 * Matches partial prefixes like `for(`, `for(let i = 0`, `if(`, etc. and
 * expands them into full skeleton code (structure only, no business logic).
 */

type StructureSnippet = {
  /** Matches text immediately before the cursor (no leading whitespace required). */
  pattern: RegExp;
  label: string;
  detail: string;
  /** Build a CodeMirror snippet template from the match. */
  template: (match: RegExpMatchArray) => string;
  boost?: number;
};

const STRUCTURE_SNIPPETS: StructureSnippet[] = [
  // for (let i = 0 …) — keep typed initializer
  {
    pattern: /^for\s*\(\s*(let|var|const)\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n;]*?)\s*$/,
    label: 'for',
    detail: 'complete counted loop',
    boost: 99,
    template: (m) => {
      const decl = m[1];
      const name = m[2];
      const start = m[3].trimEnd() || '0';
      return `for (${decl} ${name} = ${start}; ${name} < \${array}.length; ${name}++) {\n\t\${}\n}`;
    },
  },
  // for (let i = 0; i < n
  {
    pattern:
      /^for\s*\(\s*(let|var|const)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);\s*([^\n;]*?)\s*$/,
    label: 'for',
    detail: 'complete counted loop',
    boost: 99,
    template: (m) => {
      const decl = m[1];
      const name = m[2];
      const start = m[3].trim();
      const cond = m[4].trim();
      if (cond.includes(name) && /[<>!=]/.test(cond)) {
        return `for (${decl} ${name} = ${start}; ${cond}; ${name}++) {\n\t\${}\n}`;
      }
      const condition = cond || `${name} < \${array}.length`;
      return `for (${decl} ${name} = ${start}; ${condition}; ${name}++) {\n\t\${}\n}`;
    },
  },
  // for (const x of …
  {
    pattern: /^for\s*\(\s*(const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s*([^\n)]*?)\s*$/,
    label: 'for…of',
    detail: 'complete for-of loop',
    boost: 99,
    template: (m) => {
      const decl = m[1];
      const name = m[2];
      const iterable = m[3].trim() || '${iterable}';
      return `for (${decl} ${name} of ${iterable}) {\n\t\${}\n}`;
    },
  },
  // for (const x in …
  {
    pattern: /^for\s*\(\s*(const|let|var)\s+([A-Za-z_$][\w$]*)\s+in\s*([^\n)]*?)\s*$/,
    label: 'for…in',
    detail: 'complete for-in loop',
    boost: 98,
    template: (m) => {
      const decl = m[1];
      const name = m[2];
      const obj = m[3].trim() || '${object}';
      return `for (${decl} ${name} in ${obj}) {\n\t\${}\n}`;
    },
  },
  // for(  or  for (
  {
    pattern: /^for\s*\(\s*$/,
    label: 'for',
    detail: 'counted loop',
    boost: 99,
    template: () => 'for (let ${i} = 0; ${i} < ${array}.length; ${i}++) {\n\t${}\n}',
  },
  // bare "for" / "fo" etc. handled below with word triggers too
  {
    pattern: /^for$/,
    label: 'for',
    detail: 'counted loop',
    boost: 90,
    template: () => 'for (let ${i} = 0; ${i} < ${array}.length; ${i}++) {\n\t${}\n}',
  },
  {
    pattern: /^for$/,
    label: 'for…of',
    detail: 'iterate values',
    boost: 89,
    template: () => 'for (const ${item} of ${iterable}) {\n\t${}\n}',
  },

  // if (
  {
    pattern: /^if\s*\(\s*$/,
    label: 'if',
    detail: 'if block',
    boost: 99,
    template: () => 'if (${condition}) {\n\t${}\n}',
  },
  // if (condition   — no closing paren yet
  {
    pattern: /^if\s*\(\s*([^\n)]+?)\s*$/,
    label: 'if',
    detail: 'complete if block',
    boost: 99,
    template: (m) => {
      const condition = m[1].trim() || '${condition}';
      return `if (${condition}) {\n\t\${}\n}`;
    },
  },
  {
    pattern: /^if$/,
    label: 'if',
    detail: 'if block',
    boost: 90,
    template: () => 'if (${condition}) {\n\t${}\n}',
  },
  {
    pattern: /^if$/,
    label: 'if…else',
    detail: 'if / else block',
    boost: 88,
    template: () => 'if (${condition}) {\n\t${}\n} else {\n\t${}\n}',
  },

  // while
  {
    pattern: /^while\s*\(\s*$/,
    label: 'while',
    detail: 'while loop',
    boost: 99,
    template: () => 'while (${condition}) {\n\t${}\n}',
  },
  {
    pattern: /^while\s*\(\s*([^\n)]+?)\s*$/,
    label: 'while',
    detail: 'complete while loop',
    boost: 99,
    template: (m) => {
      const condition = m[1].trim() || '${condition}';
      return `while (${condition}) {\n\t\${}\n}`;
    },
  },
  {
    pattern: /^while$/,
    label: 'while',
    detail: 'while loop',
    boost: 90,
    template: () => 'while (${condition}) {\n\t${}\n}',
  },

  // switch
  {
    pattern: /^switch\s*\(\s*$/,
    label: 'switch',
    detail: 'switch block',
    boost: 99,
    template: () =>
      'switch (${expression}) {\n\tcase ${value}:\n\t\t${}\n\t\tbreak;\n\tdefault:\n\t\t${}\n}',
  },
  {
    pattern: /^switch$/,
    label: 'switch',
    detail: 'switch block',
    boost: 90,
    template: () =>
      'switch (${expression}) {\n\tcase ${value}:\n\t\t${}\n\t\tbreak;\n\tdefault:\n\t\t${}\n}',
  },

  // try
  {
    pattern: /^try$/,
    label: 'try',
    detail: 'try / catch',
    boost: 90,
    template: () => 'try {\n\t${}\n} catch (${error}) {\n\t${}\n}',
  },

  // function
  {
    pattern: /^function\s*$/,
    label: 'function',
    detail: 'function declaration',
    boost: 90,
    template: () => 'function ${name}(${params}) {\n\t${}\n}',
  },
  {
    pattern: /^function$/,
    label: 'function',
    detail: 'function declaration',
    boost: 90,
    template: () => 'function ${name}(${params}) {\n\t${}\n}',
  },

  // async function
  {
    pattern: /^async\s+function$/,
    label: 'async function',
    detail: 'async function',
    boost: 90,
    template: () => 'async function ${name}(${params}) {\n\t${}\n}',
  },

  // arrow stubs when typing common prefixes
  {
    pattern: /^=>$/,
    label: '=> { }',
    detail: 'arrow block',
    boost: 80,
    template: () => '=> {\n\t${}\n}',
  },
];

/** Longest match first so adaptive partials win over bare `for`. */
function findPrefixStart(lineText: string, cursorInLine: number): number {
  // Walk back over the structure prefix (identifier + spaces + ( + inner text)
  let i = cursorInLine;
  while (i > 0) {
    const ch = lineText[i - 1];
    if (/[\w$]/.test(ch) || ch === ' ' || ch === '(' || ch === '=' || ch === '<' || ch === '>' ||
        ch === '!' || ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' ||
        ch === '.' || ch === '[' || ch === ']' || ch === '"' || ch === "'" || ch === '`' ||
        ch === ',' || ch === ';' || ch === ':') {
      i -= 1;
      continue;
    }
    break;
  }
  // Prefer starting at a keyword boundary
  const before = lineText.slice(0, cursorInLine);
  const keyword = before.match(
    /(?:^|[^$\w])((?:async\s+function|function|for|if|while|switch|try|=>)\b[\s\S]*)$/,
  );
  if (keyword) {
    return cursorInLine - keyword[1].length;
  }
  return i;
}

export function jsStructureSnippets(context: CompletionContext): CompletionResult | null {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);

  // Don't suggest inside strings/comments if we can cheaply detect quotes imbalance on the line
  const trimmedStart = before.trimStart();
  if (!trimmedStart) return null;

  const startInLine = findPrefixStart(line.text, pos - line.from);
  const prefix = line.text.slice(startInLine, pos - line.from).trimStart();
  if (!prefix) return null;

  // Only activate for structure-like prefixes
  if (
    !/^(async\s+function|function|for|if|while|switch|try|=>)/.test(prefix) &&
    !context.explicit
  ) {
    // Still allow when user typed "(" after a keyword — prefix includes it
    if (!/^(for|if|while|switch)\s*\(/.test(prefix)) return null;
  }

  const options: Completion[] = [];
  const seen = new Set<string>();

  for (const rule of STRUCTURE_SNIPPETS) {
    const match = prefix.match(rule.pattern);
    if (!match) continue;

    const key = `${rule.label}::${rule.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);

    options.push(
      snippetCompletion(rule.template(match), {
        label: rule.label,
        detail: rule.detail,
        type: 'keyword',
        boost: rule.boost ?? 50,
      }),
    );
  }

  if (options.length === 0) return null;

  // Replace from where the structure keyword starts (skip leading spaces on the line segment)
  let from = line.from + startInLine;
  while (from < pos && /\s/.test(state.doc.sliceString(from, from + 1))) from += 1;

  return {
    from,
    options,
    // Stay active while typing inside the unfinished header
    validFor: /^[\w$\s()=<>!+\-*/%.;,"'`[\]:]*$/,
  };
}
