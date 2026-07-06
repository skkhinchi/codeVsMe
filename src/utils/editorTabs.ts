import type { EditorTab } from '../types/workspace';

export function getWorkspaceBreadcrumb(nodes: { id: string; name: string; parentId: string | null }[], fileId: string) {
  const parts: string[] = [];
  let current = nodes.find((node) => node.id === fileId);

  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? nodes.find((node) => node.id === current!.parentId) : undefined;
  }

  return ['Workspace', ...parts];
}

export function getLocalBreadcrumb(folderName: string | null, filePath: string) {
  const parts = filePath.split('/');
  return [folderName ?? 'Local', ...parts];
}

export function getTabBreadcrumb(
  tab: EditorTab | null,
  nodes: { id: string; name: string; parentId: string | null }[],
  localFolderName: string | null,
) {
  if (!tab) return [];
  if (tab.kind === 'workspace' && tab.fileId) return getWorkspaceBreadcrumb(nodes, tab.fileId);
  if (tab.kind === 'local' && tab.path) return getLocalBreadcrumb(localFolderName, tab.path);
  return [];
}
