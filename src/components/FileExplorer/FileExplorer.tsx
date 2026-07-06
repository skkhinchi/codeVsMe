import { useMemo, useRef } from 'react';
import type { ExplorerSection } from '../../hooks/useLocalFolder';
import type { LocalFileEntry, WorkspaceNode } from '../../types/workspace';
import { buildLocalFileTree, type LocalTreeNode } from '../../utils/localFileTree';
import { useUi } from '../ui/UiProvider';

type FileExplorerProps = {
  nodes: WorkspaceNode[];
  activeFileId: string | null;
  activeLocalPath: string | null;
  selectedFolderId: string | null;
  selectedLocalFolderPath: string | null;
  explorerSection: ExplorerSection;
  expandedFolderIds: Set<string>;
  localFolderName: string | null;
  localNeedsPermission: boolean;
  localFiles: LocalFileEntry[];
  localFolderPaths: string[];
  expandedLocalPaths: Set<string>;
  localSupported: boolean;
  onSelectFolder: (folderId: string | null) => void;
  onSelectLocalFolder: (path: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  onOpenWorkspaceFile: (fileId: string) => void;
  onOpenLocalFile: (entry: LocalFileEntry) => void;
  onToggleLocalPath: (path: string) => void;
  onCreateFile: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateLocalFile: (parentPath: string | null) => void;
  onCreateLocalFolder: (parentPath: string | null) => void;
  onDeleteWorkspaceNode: (nodeId: string) => void;
  onRenameWorkspaceNode: (nodeId: string, nextName: string) => void;
  onImportFile: (file: File) => void;
  onOpenLocalFolder: () => void;
  onReconnectLocalFolder: () => void;
  onDeleteLocalFile: (entry: LocalFileEntry) => void;
  onDeleteLocalFolder: (folderPath: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function Chevron({ expanded }: { expanded: boolean }) {
  return <span className={`tree-row__chevron ${expanded ? 'tree-row__chevron--open' : ''}`}>›</span>;
}

function WorkspaceTreeNodes({
  nodes,
  parentId,
  depth,
  activeFileId,
  selectedFolderId,
  expandedFolderIds,
  onSelectFolder,
  onToggleFolder,
  onOpenWorkspaceFile,
  onRequestRename,
}: {
  nodes: WorkspaceNode[];
  parentId: string | null;
  depth: number;
  activeFileId: string | null;
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;
  onSelectFolder: (folderId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  onOpenWorkspaceFile: (fileId: string) => void;
  onRequestRename: (nodeId: string, currentName: string) => void;
}) {
  const children = nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <>
      {children.map((node) => {
        if (node.type === 'folder') {
          const expanded = expandedFolderIds.has(node.id);
          return (
            <div key={node.id} className="tree-branch">
              <div
                className={`tree-row tree-row--folder ${selectedFolderId === node.id ? 'tree-row--selected' : ''}`}
                style={{ paddingLeft: `${depth * 12 + 4}px` }}
              >
                <button
                  type="button"
                  className="tree-row__chevron-btn"
                  aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
                  onClick={() => onToggleFolder(node.id)}
                >
                  <Chevron expanded={expanded} />
                </button>
                <button
                  type="button"
                  className="tree-row__label-btn"
                  onClick={() => onSelectFolder(node.id)}
                >
                  <span className="tree-row__icon">📁</span>
                  <span className="tree-row__label">{node.name}</span>
                </button>
              </div>
              {expanded ? (
                <WorkspaceTreeNodes
                  nodes={nodes}
                  parentId={node.id}
                  depth={depth + 1}
                  activeFileId={activeFileId}
                  selectedFolderId={selectedFolderId}
                  expandedFolderIds={expandedFolderIds}
                  onSelectFolder={onSelectFolder}
                  onToggleFolder={onToggleFolder}
                  onOpenWorkspaceFile={onOpenWorkspaceFile}
                  onRequestRename={onRequestRename}
                />
              ) : null}
            </div>
          );
        }

        return (
          <div
            key={node.id}
            className={`tree-row tree-row--file ${activeFileId === node.id ? 'tree-row--active' : ''}`}
            style={{ paddingLeft: `${depth * 12 + 22}px` }}
          >
            <button
              type="button"
              className="tree-row__label-btn"
              onClick={() => onOpenWorkspaceFile(node.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                onRequestRename(node.id, node.name);
              }}
            >
              <span className="tree-row__icon">📄</span>
              <span className="tree-row__label">{node.name}</span>
            </button>
          </div>
        );
      })}
    </>
  );
}

function LocalTreeNodes({
  tree,
  depth,
  activeLocalPath,
  selectedLocalFolderPath,
  expandedLocalPaths,
  onToggleLocalPath,
  onSelectLocalFolder,
  onOpenLocalFile,
  onDeleteLocalFile,
  onRequestDeleteLocal,
  onRequestDeleteLocalFolder,
}: {
  tree: LocalTreeNode[];
  depth: number;
  activeLocalPath: string | null;
  selectedLocalFolderPath: string | null;
  expandedLocalPaths: Set<string>;
  onToggleLocalPath: (path: string) => void;
  onSelectLocalFolder: (path: string | null) => void;
  onOpenLocalFile: (entry: LocalFileEntry) => void;
  onDeleteLocalFile: (entry: LocalFileEntry) => void;
  onRequestDeleteLocal: (entry: LocalFileEntry) => void;
  onRequestDeleteLocalFolder: (folderPath: string) => void;
}) {
  return (
    <>
      {tree.map((node) => {
        if (node.type === 'folder') {
          const expanded = expandedLocalPaths.has(node.path);
          return (
            <div key={node.path} className="tree-branch">
              <div
                className={`tree-row tree-row--folder ${selectedLocalFolderPath === node.path ? 'tree-row--selected' : ''}`}
                style={{ paddingLeft: `${depth * 12 + 4}px` }}
              >
                <button
                  type="button"
                  className="tree-row__chevron-btn"
                  aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
                  onClick={() => onToggleLocalPath(node.path)}
                >
                  <Chevron expanded={expanded} />
                </button>
                <button
                  type="button"
                  className="tree-row__label-btn"
                  onClick={() => onSelectLocalFolder(node.path)}
                >
                  <span className="tree-row__icon">📁</span>
                  <span className="tree-row__label">{node.name}</span>
                </button>
                <button
                  type="button"
                  className="tree-row__action"
                  title="Delete folder"
                  onClick={() => onRequestDeleteLocalFolder(node.path)}
                >
                  ×
                </button>
              </div>
              {expanded ? (
                <LocalTreeNodes
                  tree={node.children}
                  depth={depth + 1}
                  activeLocalPath={activeLocalPath}
                  selectedLocalFolderPath={selectedLocalFolderPath}
                  expandedLocalPaths={expandedLocalPaths}
                  onToggleLocalPath={onToggleLocalPath}
                  onSelectLocalFolder={onSelectLocalFolder}
                  onOpenLocalFile={onOpenLocalFile}
                  onDeleteLocalFile={onDeleteLocalFile}
                  onRequestDeleteLocal={onRequestDeleteLocal}
                  onRequestDeleteLocalFolder={onRequestDeleteLocalFolder}
                />
              ) : null}
            </div>
          );
        }

        return (
          <div
            key={node.path}
            className={`tree-row tree-row--file ${activeLocalPath === node.path ? 'tree-row--active' : ''}`}
            style={{ paddingLeft: `${depth * 12 + 22}px` }}
          >
            <button
              type="button"
              className="tree-row__label-btn"
              onClick={() => onOpenLocalFile(node.entry)}
            >
              <span className="tree-row__icon">📄</span>
              <span className="tree-row__label">{node.name}</span>
            </button>
            <button
              type="button"
              className="tree-row__action"
              title="Delete file"
              onClick={() => onRequestDeleteLocal(node.entry)}
            >
              ×
            </button>
          </div>
        );
      })}
    </>
  );
}

export function FileExplorer({
  nodes,
  activeFileId,
  activeLocalPath,
  selectedFolderId,
  selectedLocalFolderPath,
  explorerSection,
  expandedFolderIds,
  localFolderName,
  localNeedsPermission,
  localFiles,
  localFolderPaths,
  expandedLocalPaths,
  localSupported,
  onSelectFolder,
  onSelectLocalFolder,
  onToggleFolder,
  onOpenWorkspaceFile,
  onOpenLocalFile,
  onToggleLocalPath,
  onCreateFile,
  onCreateFolder,
  onCreateLocalFile,
  onCreateLocalFolder,
  onDeleteWorkspaceNode,
  onRenameWorkspaceNode,
  onImportFile,
  onOpenLocalFolder,
  onReconnectLocalFolder,
  onDeleteLocalFile,
  onDeleteLocalFolder,
  collapsed,
  onToggleCollapse,
}: FileExplorerProps) {
  const { confirm, prompt } = useUi();
  const importInputRef = useRef<HTMLInputElement>(null);
  const localTree = useMemo(
    () => buildLocalFileTree(localFiles, localFolderPaths),
    [localFiles, localFolderPaths],
  );
  const useLocalActions = explorerSection === 'local' && Boolean(localFolderName) && !localNeedsPermission;

  const selectedNode = selectedFolderId
    ? nodes.find((node) => node.id === selectedFolderId)
    : null;
  const deleteTargetId =
    activeFileId ??
    (selectedNode?.type === 'file' ? selectedNode.id : null) ??
    selectedFolderId;

  const activeLocalEntry = activeLocalPath
    ? localFiles.find((file) => file.path === activeLocalPath) ?? null
    : null;

  const canDeleteLocal =
    useLocalActions && (activeLocalEntry !== null || selectedLocalFolderPath !== null);

  const showDeleteButton = useLocalActions ? canDeleteLocal : Boolean(deleteTargetId);

  const handleRequestRename = async (nodeId: string, currentName: string) => {
    const nextName = await prompt({
      title: 'Rename file',
      label: 'File name',
      defaultValue: currentName,
      submitLabel: 'Rename',
    });
    if (nextName) onRenameWorkspaceNode(nodeId, nextName);
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteTargetId) return;
    const target = nodes.find((node) => node.id === deleteTargetId);
    const label = target?.name ?? 'item';
    const confirmed = await confirm({
      title: 'Delete item',
      message: `Delete "${label}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (confirmed) onDeleteWorkspaceNode(deleteTargetId);
  };

  const handleRequestDeleteLocal = async (entry: LocalFileEntry) => {
    const confirmed = await confirm({
      title: 'Delete file',
      message: `Delete "${entry.path}" from disk? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (confirmed) onDeleteLocalFile(entry);
  };

  const handleRequestDeleteLocalFolder = async (folderPath: string) => {
    const confirmed = await confirm({
      title: 'Delete folder',
      message: `Delete "${folderPath}" and everything inside from disk? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (confirmed) onDeleteLocalFolder(folderPath);
  };

  const handleDelete = async () => {
    if (useLocalActions) {
      if (activeLocalEntry) {
        await handleRequestDeleteLocal(activeLocalEntry);
        return;
      }
      if (selectedLocalFolderPath) {
        await handleRequestDeleteLocalFolder(selectedLocalFolderPath);
      }
      return;
    }
    await handleDeleteWorkspace();
  };

  return (
    <aside className={`file-explorer ${collapsed ? 'file-explorer--collapsed' : ''}`}>
      <div className="file-explorer__header">
        {!collapsed ? <h2>Explorer</h2> : null}
        <button
          type="button"
          className="file-explorer__toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Explorer' : 'Collapse Explorer'}
          aria-label={collapsed ? 'Expand Explorer' : 'Collapse Explorer'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!collapsed ? (
        <div className="file-explorer__content">
            <div className="file-explorer__actions">
              <button
                type="button"
                className="btn btn--small"
                onClick={() =>
                  useLocalActions ? onCreateLocalFile(selectedLocalFolderPath) : onCreateFile(selectedFolderId)
                }
                title={useLocalActions ? 'New file in local folder' : 'New file'}
              >
                + File
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() =>
                  useLocalActions
                    ? onCreateLocalFolder(selectedLocalFolderPath)
                    : onCreateFolder(selectedFolderId)
                }
                title={useLocalActions ? 'New folder in local folder' : 'New folder'}
              >
                + Folder
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => importInputRef.current?.click()}
                title="Import from computer"
              >
                Import
              </button>
              {showDeleteButton ? (
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  onClick={() => void handleDelete()}
                  title="Delete selected"
                >
                  Delete
                </button>
              ) : null}
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".js,.mjs,.cjs,.ts,.tsx,.jsx,.txt"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImportFile(file);
                event.target.value = '';
              }}
            />

            <div className="file-explorer__scroll">
        <div className="file-explorer__section">
          <div className="file-explorer__section-title">My Workspace</div>
          <div className="file-explorer__tree">
            <div
              className={`tree-row tree-row--folder ${selectedFolderId === null ? 'tree-row--selected' : ''}`}
              style={{ paddingLeft: '4px' }}
            >
              <span className="tree-row__chevron-spacer" />
              <button type="button" className="tree-row__label-btn" onClick={() => onSelectFolder(null)}>
                <span className="tree-row__icon">🏠</span>
                <span className="tree-row__label">Root</span>
              </button>
            </div>
            <WorkspaceTreeNodes
              nodes={nodes}
              parentId={null}
              depth={0}
              activeFileId={activeFileId}
              selectedFolderId={selectedFolderId}
              expandedFolderIds={expandedFolderIds}
              onSelectFolder={onSelectFolder}
              onToggleFolder={onToggleFolder}
              onOpenWorkspaceFile={onOpenWorkspaceFile}
              onRequestRename={handleRequestRename}
            />
          </div>
        </div>

        <div className="file-explorer__section">
          <div className="file-explorer__section-title">Local Folder</div>
          <div className="file-explorer__actions file-explorer__actions--local">
            <button type="button" className="btn btn--small" onClick={onOpenLocalFolder} disabled={!localSupported}>
              Open Folder
            </button>
          </div>
          {!localSupported ? (
            <p className="file-explorer__hint">Use Chrome or Edge to edit local folders.</p>
          ) : null}
          {localFolderName ? (
            <>
              {localNeedsPermission ? (
                <div className="file-explorer__permission-banner">
                  <p className="file-explorer__hint">
                    Reconnect to <strong>{localFolderName}</strong> to access local files.
                  </p>
                  <button type="button" className="btn btn--small btn--primary" onClick={onReconnectLocalFolder}>
                    Reconnect folder
                  </button>
                </div>
              ) : null}
              <div
                className={`file-explorer__root-folder ${explorerSection === 'local' && selectedLocalFolderPath === null ? 'file-explorer__root-folder--selected' : ''}`}
              >
                <button
                  type="button"
                  className="tree-row__label-btn"
                  onClick={() => onSelectLocalFolder(null)}
                >
                  <span className="tree-row__icon">📂</span>
                  <span className="file-explorer__folder-name">{localFolderName}</span>
                </button>
              </div>
              <div className="file-explorer__tree">
                {localTree.length === 0 ? (
                  <p className="file-explorer__hint">Empty folder — use + File or + Folder to add items.</p>
                ) : (
                  <LocalTreeNodes
                    tree={localTree}
                    depth={0}
                    activeLocalPath={activeLocalPath}
                    selectedLocalFolderPath={selectedLocalFolderPath}
                    expandedLocalPaths={expandedLocalPaths}
                    onToggleLocalPath={onToggleLocalPath}
                    onSelectLocalFolder={onSelectLocalFolder}
                    onOpenLocalFile={onOpenLocalFile}
                    onDeleteLocalFile={onDeleteLocalFile}
                    onRequestDeleteLocal={handleRequestDeleteLocal}
                    onRequestDeleteLocalFolder={handleRequestDeleteLocalFolder}
                  />
                )}
              </div>
            </>
          ) : (
            <p className="file-explorer__hint">Open a folder from your computer to edit files on disk.</p>
          )}
        </div>
            </div>
          </div>
      ) : null}
    </aside>
  );
}
