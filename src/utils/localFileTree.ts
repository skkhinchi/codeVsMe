import type { LocalFileEntry } from '../types/workspace';

export type LocalTreeFolder = {
  type: 'folder';
  name: string;
  path: string;
  children: LocalTreeNode[];
};

export type LocalTreeFile = {
  type: 'file';
  name: string;
  path: string;
  entry: LocalFileEntry;
};

export type LocalTreeNode = LocalTreeFolder | LocalTreeFile;

function sortTree(nodes: LocalTreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.type === 'folder') sortTree(node.children);
  }
}

export function buildLocalFileTree(files: LocalFileEntry[], folderPaths: string[] = []): LocalTreeNode[] {
  const root: LocalTreeFolder = { type: 'folder', name: '', path: '', children: [] };
  const folderMap = new Map<string, LocalTreeFolder>([['', root]]);

  const ensureFolder = (folderPath: string) => {
    if (folderMap.has(folderPath)) return;

    const parts = folderPath.split('/');
    for (let i = 0; i < parts.length; i++) {
      const path = parts.slice(0, i + 1).join('/');
      if (folderMap.has(path)) continue;

      const folder: LocalTreeFolder = {
        type: 'folder',
        name: parts[i],
        path,
        children: [],
      };
      folderMap.set(path, folder);

      const parentPath = i === 0 ? '' : parts.slice(0, i).join('/');
      folderMap.get(parentPath)?.children.push(folder);
    }
  };

  for (const folderPath of folderPaths) {
    ensureFolder(folderPath);
  }

  for (const file of files) {
    const parts = file.path.split('/');
    ensureFolder(parts.length === 1 ? '' : parts.slice(0, -1).join('/'));

    const parentPath = parts.length === 1 ? '' : parts.slice(0, -1).join('/');
    folderMap.get(parentPath)?.children.push({
      type: 'file',
      name: parts.at(-1) ?? file.name,
      path: file.path,
      entry: file,
    });
  }

  sortTree(root.children);
  return root.children;
}

export function getTopLevelLocalFolderPaths(files: LocalFileEntry[], folderPaths: string[] = []): string[] {
  const paths = new Set<string>();
  for (const file of files) {
    const parts = file.path.split('/');
    if (parts.length > 1) paths.add(parts[0]);
  }
  for (const folderPath of folderPaths) {
    const top = folderPath.split('/')[0];
    if (top) paths.add(top);
  }
  return [...paths];
}
