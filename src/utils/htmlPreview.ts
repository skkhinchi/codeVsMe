export type PreviewFile = {
  /** Virtual path using `/` separators, e.g. `Practice/index.html` */
  path: string;
  content: string;
};

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
}

export function dirname(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf('/');
  return idx === -1 ? '' : normalized.slice(0, idx);
}

export function joinPath(baseDir: string, relative: string): string {
  if (relative.startsWith('/')) return normalizePath(relative.slice(1));
  return normalizePath(baseDir ? `${baseDir}/${relative}` : relative);
}

export function workspaceFilePath(
  nodes: { id: string; name: string; parentId: string | null }[],
  fileId: string,
): string {
  const parts: string[] = [];
  let current = nodes.find((node) => node.id === fileId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? nodes.find((node) => node.id === current!.parentId) : undefined;
  }
  return parts.join('/');
}

export function workspacePreviewFiles(
  nodes: { id: string; name: string; parentId: string | null; type: string; content?: string }[],
): PreviewFile[] {
  return nodes
    .filter((node) => node.type === 'file')
    .map((node) => ({
      path: workspaceFilePath(nodes, node.id),
      content: node.content ?? '',
    }));
}

function findFile(files: PreviewFile[], path: string): PreviewFile | undefined {
  const target = normalizePath(path).toLowerCase();
  return files.find((file) => file.path.toLowerCase() === target);
}

function rewriteAttributeUrls(
  html: string,
  attribute: 'src' | 'href',
  entryDir: string,
  files: PreviewFile[],
  blobUrls: Map<string, string>,
): string {
  const pattern =
    attribute === 'src'
      ? /(<script\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi
      : /(<link\b[^>]*?\bhref\s*=\s*)(["'])([^"']+)\2/gi;

  return html.replace(pattern, (full, prefix: string, quote: string, rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url || /^(https?:|data:|blob:|\/\/)/i.test(url)) return full;

    const resolved = joinPath(entryDir, url);
    const file = findFile(files, resolved);
    if (!file) return full;

    let blobUrl = blobUrls.get(file.path);
    if (!blobUrl) {
      const mime = file.path.toLowerCase().endsWith('.css')
        ? 'text/css'
        : file.path.toLowerCase().endsWith('.html') || file.path.toLowerCase().endsWith('.htm')
          ? 'text/html'
          : 'text/javascript';
      blobUrl = URL.createObjectURL(new Blob([file.content], { type: mime }));
      blobUrls.set(file.path, blobUrl);
    }

    return `${prefix}${quote}${blobUrl}${quote}`;
  });
}

function buildImportMap(files: PreviewFile[], entryDir: string, blobUrls: Map<string, string>): string {
  const imports: Record<string, string> = {};

  for (const file of files) {
    if (!/\.m?js$/i.test(file.path)) continue;

    let blobUrl = blobUrls.get(file.path);
    if (!blobUrl) {
      blobUrl = URL.createObjectURL(new Blob([file.content], { type: 'text/javascript' }));
      blobUrls.set(file.path, blobUrl);
    }

    const absolute = `/${file.path}`;
    imports[absolute] = blobUrl;

    if (entryDir && file.path.startsWith(`${entryDir}/`)) {
      const relative = `./${file.path.slice(entryDir.length + 1)}`;
      imports[relative] = blobUrl;
      imports[file.path.slice(entryDir.length + 1)] = blobUrl;
    } else if (!entryDir) {
      imports[`./${file.path}`] = blobUrl;
      imports[file.path] = blobUrl;
    }
  }

  if (Object.keys(imports).length === 0) return '';
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
}

function ensureHtmlDocument(content: string): string {
  const trimmed = content.trim();
  if (/<html[\s>]/i.test(trimmed)) return content;
  if (/<!doctype/i.test(trimmed)) return content;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
</head>
<body>
${content}
</body>
</html>`;
}

function cssPreviewDocument(css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CSS Preview</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; margin: 1.25rem; line-height: 1.5; }
    .preview-note { opacity: 0.7; font-size: 0.9rem; margin-bottom: 1rem; }
  </style>
  <style>
${css}
  </style>
</head>
<body>
  <p class="preview-note">CSS preview — your stylesheet is applied below.</p>
  <h1>Heading</h1>
  <p>Sample paragraph text for typography and color checks.</p>
  <button type="button">Button</button>
  <a href="#">Link</a>
  <div class="box" style="margin-top:1rem;padding:1rem;border:1px dashed currentColor;">.box sample</div>
  <ul><li>List item one</li><li>List item two</li></ul>
</body>
</html>`;
}

export type BuildPreviewResult = {
  html: string;
  /** Call when discarding the preview to free blob URLs. */
  revoke: () => void;
};

export function buildWebPreview(options: {
  entryPath: string;
  entryContent: string;
  files: PreviewFile[];
  entryIsCss?: boolean;
}): BuildPreviewResult {
  const blobUrls = new Map<string, string>();
  const entryDir = dirname(options.entryPath);
  const revoke = () => {
    for (const url of blobUrls.values()) URL.revokeObjectURL(url);
    blobUrls.clear();
  };

  let html = options.entryIsCss
    ? cssPreviewDocument(options.entryContent)
    : ensureHtmlDocument(options.entryContent);

  html = rewriteAttributeUrls(html, 'src', entryDir, options.files, blobUrls);
  html = rewriteAttributeUrls(html, 'href', entryDir, options.files, blobUrls);

  const importMap = buildImportMap(options.files, entryDir, blobUrls);
  if (importMap) {
    if (/<head[\s>]/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${importMap}`);
    } else {
      html = `${importMap}${html}`;
    }
  }

  return { html, revoke };
}
