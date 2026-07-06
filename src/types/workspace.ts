export type NodeType = 'file' | 'folder';

export type WorkspaceNode = {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  content?: string;
  updatedAt: number;
};

export type LocalFileEntry = {
  path: string;
  name: string;
  handle: FileSystemFileHandle;
};

export type EditorTab = {
  id: string;
  kind: 'workspace' | 'local';
  name: string;
  fileId?: string;
  path?: string;
};

export type EditorSource =
  | { kind: 'workspace'; fileId: string; name: string }
  | { kind: 'local'; path: string; name: string; handle: FileSystemFileHandle };

export function tabIdFromSource(source: EditorSource) {
  return source.kind === 'workspace' ? `workspace:${source.fileId}` : `local:${source.path}`;
}

export function editorTabFromSource(source: EditorSource): EditorTab {
  if (source.kind === 'workspace') {
    return { id: tabIdFromSource(source), kind: 'workspace', name: source.name, fileId: source.fileId };
  }
  return { id: tabIdFromSource(source), kind: 'local', name: source.name, path: source.path };
}
