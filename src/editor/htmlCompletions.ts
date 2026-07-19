import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';

const HTML_TAG_SNIPPETS: Completion[] = [
  { label: 'html', type: 'keyword', apply: 'html>\n<head>\n  <meta charset="UTF-8" />\n  <title></title>\n</head>\n<body>\n  \n</body>\n</html>', detail: 'document' },
  { label: 'head', type: 'keyword', apply: 'head>\n  <meta charset="UTF-8" />\n  <title></title>\n</head>', detail: 'tag' },
  { label: 'body', type: 'keyword', apply: 'body>\n  \n</body>', detail: 'tag' },
  { label: 'script', type: 'keyword', apply: 'script src=""></script>', detail: 'tag' },
  { label: 'script:inline', type: 'keyword', apply: 'script>\n  \n</script>', detail: 'inline script' },
  { label: 'link', type: 'keyword', apply: 'link rel="stylesheet" href="" />', detail: 'stylesheet' },
  { label: 'meta', type: 'keyword', apply: 'meta charset="UTF-8" />', detail: 'tag' },
  { label: 'meta:viewport', type: 'keyword', apply: 'meta name="viewport" content="width=device-width, initial-scale=1.0" />', detail: 'viewport' },
  { label: 'title', type: 'keyword', apply: 'title></title>', detail: 'tag' },
  { label: 'div', type: 'keyword', apply: 'div></div>', detail: 'tag' },
  { label: 'span', type: 'keyword', apply: 'span></span>', detail: 'tag' },
  { label: 'p', type: 'keyword', apply: 'p></p>', detail: 'tag' },
  { label: 'h1', type: 'keyword', apply: 'h1></h1>', detail: 'tag' },
  { label: 'h2', type: 'keyword', apply: 'h2></h2>', detail: 'tag' },
  { label: 'h3', type: 'keyword', apply: 'h3></h3>', detail: 'tag' },
  { label: 'a', type: 'keyword', apply: 'a href=""></a>', detail: 'tag' },
  { label: 'img', type: 'keyword', apply: 'img src="" alt="" />', detail: 'tag' },
  { label: 'ul', type: 'keyword', apply: 'ul>\n  <li></li>\n</ul>', detail: 'tag' },
  { label: 'ol', type: 'keyword', apply: 'ol>\n  <li></li>\n</ol>', detail: 'tag' },
  { label: 'li', type: 'keyword', apply: 'li></li>', detail: 'tag' },
  { label: 'button', type: 'keyword', apply: 'button type="button"></button>', detail: 'tag' },
  { label: 'input', type: 'keyword', apply: 'input type="text" />', detail: 'tag' },
  { label: 'form', type: 'keyword', apply: 'form>\n  \n</form>', detail: 'tag' },
  { label: 'section', type: 'keyword', apply: 'section>\n  \n</section>', detail: 'tag' },
  { label: 'header', type: 'keyword', apply: 'header>\n  \n</header>', detail: 'tag' },
  { label: 'footer', type: 'keyword', apply: 'footer>\n  \n</footer>', detail: 'tag' },
  { label: 'nav', type: 'keyword', apply: 'nav>\n  \n</nav>', detail: 'tag' },
  { label: 'main', type: 'keyword', apply: 'main>\n  \n</main>', detail: 'tag' },
  { label: 'style', type: 'keyword', apply: 'style>\n  \n</style>', detail: 'tag' },
  { label: 'br', type: 'keyword', apply: 'br />', detail: 'tag' },
  { label: 'hr', type: 'keyword', apply: 'hr />', detail: 'tag' },
  { label: 'table', type: 'keyword', apply: 'table>\n  <tr>\n    <td></td>\n  </tr>\n</table>', detail: 'tag' },
];

function filterByQuery(options: Completion[], query: string): Completion[] {
  const q = query.toLowerCase();
  if (!q) return options;
  return options.filter((option) => option.label.toLowerCase().startsWith(q));
}

/** Suggest common HTML tags after typing `<`. */
export function htmlTagCompletions(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(/<[\w:-]*$/);
  if (!before) return null;

  const query = before.text.slice(1);
  const options = filterByQuery(HTML_TAG_SNIPPETS, query);
  if (options.length === 0) return null;

  return {
    from: before.from + 1,
    options,
    validFor: /^[\w:-]*$/,
  };
}

export type PathCompletionOptions = {
  /** File names available in the current folder (and optional relative paths). */
  getSiblingFiles: () => string[];
};

/**
 * Suggest workspace/local files inside src="" / href="" attributes.
 */
export function createHtmlPathCompletions(options: PathCompletionOptions) {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const textBefore = line.text.slice(0, context.pos - line.from);

    const attrMatch = textBefore.match(
      /\b(src|href)\s*=\s*(["'])([^"'>\n]*)$/i,
    );
    if (!attrMatch) return null;

    const attrName = attrMatch[1].toLowerCase();
    const typed = attrMatch[3];
    const from = context.pos - typed.length;

    // Look back a bit to see which tag we're in
    const lookbackStart = Math.max(0, context.pos - 200);
    const lookback = context.state.doc.sliceString(lookbackStart, context.pos);
    const tagMatch = lookback.match(/<\s*([a-zA-Z][\w:-]*)\b[^<]*$/);
    const tagName = tagMatch?.[1]?.toLowerCase() ?? '';

    let files = options.getSiblingFiles();

    if (tagName === 'script' || (attrName === 'src' && tagName !== 'img' && tagName !== 'link')) {
      files = files.filter((name) => /\.(m?js|cjs)$/i.test(name));
    } else if (tagName === 'link' || (attrName === 'href' && /rel\s*=\s*["']?stylesheet/i.test(lookback))) {
      files = files.filter((name) => /\.css$/i.test(name));
    } else if (tagName === 'img') {
      files = files.filter((name) => /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(name));
    }

    const query = typed.toLowerCase();
    const completions: Completion[] = files
      .filter((name) => name.toLowerCase().includes(query) || name.toLowerCase().startsWith(query))
      .map((name) => ({
        label: name,
        type: 'text',
        detail: 'file',
        boost: name.toLowerCase().startsWith(query) ? 2 : 0,
      }));

    if (completions.length === 0) return null;

    return {
      from,
      options: completions,
      validFor: /^[^"'>\n]*$/,
    };
  };
}
