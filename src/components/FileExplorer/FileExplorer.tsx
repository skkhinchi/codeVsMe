import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { ExplorerSection } from '../../hooks/useLocalFolder';
import type { LocalFileEntry, WorkspaceNode } from '../../types/workspace';
import { buildLocalFileTree, type LocalTreeNode } from '../../utils/localFileTree';
import { useUi } from '../ui/UiProvider';
import { TreeContextMenu, type TreeContextMenuItem } from './TreeContextMenu';
import { DeleteIcon, DiskGlyph, FileGlyph, FolderGlyph, NewFileIcon, NewFolderIcon, RefreshIcon, WorkspaceGlyph } from './TreeIcons';

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
  onImportFile: (file: File, parentId?: string | null) => void;
  onOpenLocalFolder: () => void;
  onReconnectLocalFolder: () => void;
  onDeleteLocalFile: (entry: LocalFileEntry) => void;
  onDeleteLocalFolder: (folderPath: string) => void;
  onRefreshWorkspace: () => void;
  onRefreshLocal: () => void;
  onSetExplorerSection: (section: ExplorerSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  items: TreeContextMenuItem[];
};

function Chevron({ expanded }: { expanded: boolean }) {
  return <span className={`tree-row__chevron ${expanded ? 'tree-row__chevron--open' : ''}`}>›</span>;
}

function FolderActions({
  onNewFile,
  onNewFolder,
  onRefresh,
  onDelete,
}: {
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="tree-row__actions">
      <button
        type="button"
        className="tree-row__icon-btn"
        data-tooltip="New file"
        aria-label="New file"
        onClick={(event) => {
          event.stopPropagation();
          onNewFile();
        }}
      >
        <NewFileIcon />
      </button>
      <button
        type="button"
        className="tree-row__icon-btn"
        data-tooltip="New folder"
        aria-label="New folder"
        onClick={(event) => {
          event.stopPropagation();
          onNewFolder();
        }}
      >
        <NewFolderIcon />
      </button>
      <button
        type="button"
        className="tree-row__icon-btn"
        data-tooltip="Refresh"
        aria-label="Refresh"
        onClick={(event) => {
          event.stopPropagation();
          onRefresh();
        }}
      >
        <RefreshIcon />
      </button>
      {onDelete ? (
        <button
          type="button"
          className="tree-row__icon-btn tree-row__icon-btn--danger"
          data-tooltip="Delete"
          aria-label="Delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <DeleteIcon />
        </button>
      ) : null}
    </div>
  );
}

function FileActions({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="tree-row__actions">
      <button
        type="button"
        className="tree-row__icon-btn tree-row__icon-btn--danger"
        data-tooltip="Delete"
        aria-label="Delete"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <DeleteIcon />
      </button>
    </div>
  );
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
  onContextMenu,
  onCreateFile,
  onCreateFolder,
  onRefresh,
  onDelete,
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
  onContextMenu: (event: MouseEvent, node: WorkspaceNode) => void;
  onCreateFile: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRefresh: (folderId: string) => void;
  onDelete: (nodeId: string) => void;
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
                onContextMenu={(event) => onContextMenu(event, node)}
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
                  <span className="tree-row__icon tree-row__icon--folder">
                    <FolderGlyph />
                  </span>
                  <span className="tree-row__label">{node.name}</span>
                </button>
                <FolderActions
                  onNewFile={() => {
                    onSelectFolder(node.id);
                    onCreateFile(node.id);
                  }}
                  onNewFolder={() => {
                    onSelectFolder(node.id);
                    onCreateFolder(node.id);
                  }}
                  onRefresh={() => onRefresh(node.id)}
                  onDelete={() => onDelete(node.id)}
                />
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
                  onContextMenu={onContextMenu}
                  onCreateFile={onCreateFile}
                  onCreateFolder={onCreateFolder}
                  onRefresh={onRefresh}
                  onDelete={onDelete}
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
            onContextMenu={(event) => onContextMenu(event, node)}
          >
            <button
              type="button"
              className="tree-row__label-btn"
              onClick={() => onOpenWorkspaceFile(node.id)}
            >
              <span className="tree-row__icon tree-row__icon--file">
                <FileGlyph />
              </span>
              <span className="tree-row__label">{node.name}</span>
            </button>
            <FileActions onDelete={() => onDelete(node.id)} />
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
  onContextMenuFolder,
  onContextMenuFile,
  onCreateLocalFile,
  onCreateLocalFolder,
  onRefresh,
  onDeleteFolder,
  onDeleteFile,
}: {
  tree: LocalTreeNode[];
  depth: number;
  activeLocalPath: string | null;
  selectedLocalFolderPath: string | null;
  expandedLocalPaths: Set<string>;
  onToggleLocalPath: (path: string) => void;
  onSelectLocalFolder: (path: string | null) => void;
  onOpenLocalFile: (entry: LocalFileEntry) => void;
  onContextMenuFolder: (event: MouseEvent, folderPath: string) => void;
  onContextMenuFile: (event: MouseEvent, entry: LocalFileEntry) => void;
  onCreateLocalFile: (parentPath: string | null) => void;
  onCreateLocalFolder: (parentPath: string | null) => void;
  onRefresh: () => void;
  onDeleteFolder: (folderPath: string) => void;
  onDeleteFile: (entry: LocalFileEntry) => void;
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
                onContextMenu={(event) => onContextMenuFolder(event, node.path)}
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
                  <span className="tree-row__icon tree-row__icon--folder">
                    <FolderGlyph />
                  </span>
                  <span className="tree-row__label">{node.name}</span>
                </button>
                <FolderActions
                  onNewFile={() => {
                    onSelectLocalFolder(node.path);
                    onCreateLocalFile(node.path);
                  }}
                  onNewFolder={() => {
                    onSelectLocalFolder(node.path);
                    onCreateLocalFolder(node.path);
                  }}
                  onRefresh={onRefresh}
                  onDelete={() => onDeleteFolder(node.path)}
                />
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
                  onContextMenuFolder={onContextMenuFolder}
                  onContextMenuFile={onContextMenuFile}
                  onCreateLocalFile={onCreateLocalFile}
                  onCreateLocalFolder={onCreateLocalFolder}
                  onRefresh={onRefresh}
                  onDeleteFolder={onDeleteFolder}
                  onDeleteFile={onDeleteFile}
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
            onContextMenu={(event) => onContextMenuFile(event, node.entry)}
          >
            <button
              type="button"
              className="tree-row__label-btn"
              onClick={() => onOpenLocalFile(node.entry)}
            >
              <span className="tree-row__icon tree-row__icon--file">
                <FileGlyph />
              </span>
              <span className="tree-row__label">{node.name}</span>
            </button>
            <FileActions onDelete={() => onDeleteFile(node.entry)} />
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
  onRefreshWorkspace,
  onRefreshLocal,
  onSetExplorerSection,
  collapsed,
  onToggleCollapse,
}: FileExplorerProps) {
  const { confirm, prompt, toast } = useUi();
  const importInputRef = useRef<HTMLInputElement>(null);
  const importParentRef = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const localTree = useMemo(
    () => buildLocalFileTree(localFiles, localFolderPaths),
    [localFiles, localFolderPaths],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleRequestRename = useCallback(
    async (nodeId: string, currentName: string) => {
      const target = nodes.find((node) => node.id === nodeId);
      const isFolder = target?.type === 'folder';
      const nextName = await prompt({
        title: isFolder ? 'Rename folder' : 'Rename file',
        label: isFolder ? 'Folder name' : 'File name',
        defaultValue: currentName,
        submitLabel: 'Rename',
      });
      if (nextName) onRenameWorkspaceNode(nodeId, nextName);
    },
    [nodes, onRenameWorkspaceNode, prompt],
  );

  const handleDeleteWorkspaceNode = useCallback(
    async (nodeId: string) => {
      const target = nodes.find((node) => node.id === nodeId);
      const label = target?.name ?? 'item';
      const kind = target?.type === 'folder' ? 'Folder' : 'File';
      const confirmed = await confirm({
        title: 'Delete item',
        message: `Delete "${label}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!confirmed) return;
      try {
        onDeleteWorkspaceNode(nodeId);
        toast.success({ title: `${kind} deleted`, message: `"${label}" was removed from your workspace.` });
      } catch (error) {
        console.error(error);
        toast.error({ title: `Could not delete ${kind.toLowerCase()}`, message: 'Please try again.' });
      }
    },
    [confirm, nodes, onDeleteWorkspaceNode, toast],
  );

  const handleRequestDeleteLocal = useCallback(
    async (entry: LocalFileEntry) => {
      const confirmed = await confirm({
        title: 'Delete file',
        message: `Delete "${entry.path}" from disk? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!confirmed) return;
      try {
        await onDeleteLocalFile(entry);
        toast.success({ title: 'File deleted', message: `"${entry.path}" was removed from disk.` });
      } catch (error) {
        console.error(error);
        toast.error({ title: 'Could not delete file', message: 'Check folder permission and try again.' });
      }
    },
    [confirm, onDeleteLocalFile, toast],
  );

  const handleRequestDeleteLocalFolder = useCallback(
    async (folderPath: string) => {
      const confirmed = await confirm({
        title: 'Delete folder',
        message: `Delete "${folderPath}" and everything inside from disk? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!confirmed) return;
      try {
        await onDeleteLocalFolder(folderPath);
        toast.success({ title: 'Folder deleted', message: `"${folderPath}" was removed from disk.` });
      } catch (error) {
        console.error(error);
        toast.error({ title: 'Could not delete folder', message: 'Check folder permission and try again.' });
      }
    },
    [confirm, onDeleteLocalFolder, toast],
  );

  const startImport = useCallback((parentId: string | null) => {
    importParentRef.current = parentId;
    importInputRef.current?.click();
  }, []);

  const openWorkspaceContextMenu = useCallback(
    (event: MouseEvent, node: WorkspaceNode) => {
      event.preventDefault();
      event.stopPropagation();

      if (node.type === 'folder') onSelectFolder(node.id);
      else void onOpenWorkspaceFile(node.id);

      const items: TreeContextMenuItem[] = [
        {
          id: 'rename',
          label: 'Rename',
          onSelect: () => {
            void handleRequestRename(node.id, node.name);
          },
        },
      ];

      if (node.type === 'folder') {
        items.push(
          {
            id: 'new-file',
            label: 'New File',
            onSelect: () => onCreateFile(node.id),
          },
          {
            id: 'new-folder',
            label: 'New Folder',
            onSelect: () => onCreateFolder(node.id),
          },
          {
            id: 'import',
            label: 'Import File',
            onSelect: () => startImport(node.id),
          },
          {
            id: 'refresh',
            label: 'Refresh',
            onSelect: () => onRefreshWorkspace(),
          },
        );
      }

      items.push({
        id: 'delete',
        label: 'Delete',
        danger: true,
        onSelect: () => {
          void handleDeleteWorkspaceNode(node.id);
        },
      });

      setContextMenu({ x: event.clientX, y: event.clientY, items });
    },
    [
      handleDeleteWorkspaceNode,
      handleRequestRename,
      onCreateFile,
      onCreateFolder,
      onOpenWorkspaceFile,
      onRefreshWorkspace,
      onSelectFolder,
      startImport,
    ],
  );

  const openLocalFileContextMenu = useCallback(
    (event: MouseEvent, entry: LocalFileEntry) => {
      event.preventDefault();
      event.stopPropagation();
      void onOpenLocalFile(entry);

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            id: 'open',
            label: 'Open',
            onSelect: () => {
              void onOpenLocalFile(entry);
            },
          },
          {
            id: 'delete',
            label: 'Delete',
            danger: true,
            onSelect: () => {
              void handleRequestDeleteLocal(entry);
            },
          },
        ],
      });
    },
    [handleRequestDeleteLocal, onOpenLocalFile],
  );

  const openLocalFolderContextMenu = useCallback(
    (event: MouseEvent, folderPath: string) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectLocalFolder(folderPath);

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            id: 'new-file',
            label: 'New File',
            onSelect: () => onCreateLocalFile(folderPath),
          },
          {
            id: 'new-folder',
            label: 'New Folder',
            onSelect: () => onCreateLocalFolder(folderPath),
          },
          {
            id: 'refresh',
            label: 'Refresh',
            onSelect: () => onRefreshLocal(),
          },
          {
            id: 'delete',
            label: 'Delete',
            danger: true,
            onSelect: () => {
              void handleRequestDeleteLocalFolder(folderPath);
            },
          },
        ],
      });
    },
    [
      handleRequestDeleteLocalFolder,
      onCreateLocalFile,
      onCreateLocalFolder,
      onRefreshLocal,
      onSelectLocalFolder,
    ],
  );

  const refreshWorkspaceFolder = useCallback(
    (folderId: string) => {
      onSelectFolder(folderId);
      if (!expandedFolderIds.has(folderId)) onToggleFolder(folderId);
      onRefreshWorkspace();
    },
    [expandedFolderIds, onRefreshWorkspace, onSelectFolder, onToggleFolder],
  );

  return (
    <aside className={`file-explorer ${collapsed ? 'file-explorer--collapsed' : ''}`} aria-label="File explorer">
      <div className="file-explorer__chrome">
        <div className="file-explorer__header">
          {!collapsed ? (
            <div className="file-explorer__brand">
              <span className="file-explorer__brand-mark" aria-hidden />
              <h2>Files</h2>
            </div>
          ) : null}
          <button
            type="button"
            className="file-explorer__toggle"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand Files' : 'Collapse Files'}
            aria-label={collapsed ? 'Expand Files' : 'Collapse Files'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed ? (
          <div className="file-explorer__source-switch" role="tablist" aria-label="File source">
            <button
              type="button"
              role="tab"
              aria-selected={explorerSection === 'workspace'}
              className={`file-explorer__source-btn ${explorerSection === 'workspace' ? 'file-explorer__source-btn--active' : ''}`}
              onClick={() => onSetExplorerSection('workspace')}
            >
              <WorkspaceGlyph />
              <span>Workspace</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={explorerSection === 'local'}
              className={`file-explorer__source-btn ${explorerSection === 'local' ? 'file-explorer__source-btn--active' : ''}`}
              onClick={() => onSetExplorerSection('local')}
            >
              <DiskGlyph />
              <span>On disk</span>
              {localFolderName ? <span className="file-explorer__source-dot" aria-hidden /> : null}
            </button>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="file-explorer__content">
          <input
            ref={importInputRef}
            type="file"
            accept=".js,.mjs,.cjs,.ts,.tsx,.jsx,.txt,.html,.htm,.css"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportFile(file, importParentRef.current);
              event.target.value = '';
              importParentRef.current = null;
            }}
          />

          <div className="file-explorer__scroll" key={explorerSection}>
            {explorerSection === 'workspace' ? (
              <div className="file-explorer__pane file-explorer__pane--enter">
                <div className="file-explorer__pane-head file-explorer__pane-head--row">
                  <div>
                    <p className="file-explorer__pane-kicker">In browser</p>
                    <p className="file-explorer__pane-copy">Saved here — no upload required.</p>
                  </div>
                  <div className="file-explorer__quick-actions">
                    <button
                      type="button"
                      className="tree-row__icon-btn"
                      data-tooltip="New file at root"
                      aria-label="New file at workspace root"
                      onClick={() => {
                        onSelectFolder(null);
                        onCreateFile(null);
                      }}
                    >
                      <NewFileIcon />
                    </button>
                    <button
                      type="button"
                      className="tree-row__icon-btn"
                      data-tooltip="New folder at root"
                      aria-label="New folder at workspace root"
                      onClick={() => {
                        onSelectFolder(null);
                        onCreateFolder(null);
                      }}
                    >
                      <NewFolderIcon />
                    </button>
                  </div>
                </div>
                {nodes.length === 0 ? (
                  <div className="file-explorer__empty file-explorer__empty--cta">
                    <WorkspaceGlyph />
                    <p>Start your practice space</p>
                    <span>Create a folder or drop in a file to begin.</span>
                    <button type="button" className="btn btn--primary" onClick={() => onCreateFolder(null)}>
                      New folder
                    </button>
                  </div>
                ) : (
                  <div className="file-explorer__tree">
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
                      onContextMenu={openWorkspaceContextMenu}
                      onCreateFile={onCreateFile}
                      onCreateFolder={onCreateFolder}
                      onRefresh={refreshWorkspaceFolder}
                      onDelete={(nodeId) => {
                        void handleDeleteWorkspaceNode(nodeId);
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="file-explorer__pane file-explorer__pane--enter">
                <div className="file-explorer__pane-head file-explorer__pane-head--row">
                  <div>
                    <p className="file-explorer__pane-kicker">On your machine</p>
                    <p className="file-explorer__pane-copy">
                      {localFolderName ? `Connected to “${localFolderName}”` : 'Pick a folder to edit on disk.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--small file-explorer__open-btn"
                    onClick={onOpenLocalFolder}
                    disabled={!localSupported}
                  >
                    {localFolderName ? 'Change' : 'Open'}
                  </button>
                </div>

                {!localSupported ? (
                  <div className="file-explorer__empty">
                    <p>Chrome or Edge required for disk access.</p>
                  </div>
                ) : null}

                {localSupported && localFolderName && localNeedsPermission ? (
                  <div className="file-explorer__reconnect">
                    <div>
                      <strong>{localFolderName}</strong>
                      <span>Permission expired — reconnect to continue.</span>
                    </div>
                    <button type="button" className="btn btn--small btn--primary" onClick={onReconnectLocalFolder}>
                      Reconnect
                    </button>
                  </div>
                ) : null}

                {localSupported && localFolderName && !localNeedsPermission ? (
                  <>
                    <div
                      className={`file-explorer__root-folder tree-row ${selectedLocalFolderPath === null ? 'file-explorer__root-folder--selected tree-row--selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="tree-row__label-btn"
                        onClick={() => onSelectLocalFolder(null)}
                      >
                        <span className="tree-row__icon tree-row__icon--folder">
                          <FolderGlyph />
                        </span>
                        <span className="file-explorer__folder-name">{localFolderName}</span>
                      </button>
                      <FolderActions
                        onNewFile={() => {
                          onSelectLocalFolder(null);
                          onCreateLocalFile(null);
                        }}
                        onNewFolder={() => {
                          onSelectLocalFolder(null);
                          onCreateLocalFolder(null);
                        }}
                        onRefresh={onRefreshLocal}
                      />
                    </div>
                    <div className="file-explorer__tree">
                      {localTree.length === 0 ? (
                        <div className="file-explorer__empty">
                          <p>Empty folder</p>
                          <span>Hover the folder name to add a file.</span>
                        </div>
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
                          onContextMenuFolder={openLocalFolderContextMenu}
                          onContextMenuFile={openLocalFileContextMenu}
                          onCreateLocalFile={onCreateLocalFile}
                          onCreateLocalFolder={onCreateLocalFolder}
                          onRefresh={onRefreshLocal}
                          onDeleteFolder={(folderPath) => {
                            void handleRequestDeleteLocalFolder(folderPath);
                          }}
                          onDeleteFile={(entry) => {
                            void handleRequestDeleteLocal(entry);
                          }}
                        />
                      )}
                    </div>
                  </>
                ) : null}

                {localSupported && !localFolderName ? (
                  <div className="file-explorer__empty file-explorer__empty--cta">
                    <DiskGlyph />
                    <p>Bring a project from your machine</p>
                    <span>Edits write back to disk with Chrome’s folder picker.</span>
                    <button type="button" className="btn btn--primary" onClick={onOpenLocalFolder}>
                      Open folder
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {contextMenu ? (
        <TreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      ) : null}
    </aside>
  );
}
