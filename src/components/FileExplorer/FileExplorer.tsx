import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { ExplorerSection } from '../../hooks/useLocalFolder';
import type { LocalFileEntry, WorkspaceNode } from '../../types/workspace';
import { buildLocalFileTree, type LocalTreeNode } from '../../utils/localFileTree';
import { useUi } from '../ui/UiProvider';
import { TreeContextMenu, type TreeContextMenuItem } from './TreeContextMenu';
import { CollapseAllIcon, ExpandAllIcon, NewFileIcon, NewFolderIcon, RefreshIcon } from './TreeIcons';

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
  onSetExpandedFolders: (ids: Iterable<string>) => void;
  onOpenWorkspaceFile: (fileId: string) => void;
  onOpenLocalFile: (entry: LocalFileEntry) => void;
  onToggleLocalPath: (path: string) => void;
  onSetExpandedLocalPaths: (paths: Iterable<string>) => void;
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

function collectWorkspaceFolderIds(nodes: WorkspaceNode[], rootId: string): string[] {
  const ids: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    ids.push(id);
    for (const node of nodes) {
      if (node.type === 'folder' && node.parentId === id) queue.push(node.id);
    }
  }
  return ids;
}

function collectLocalFolderPaths(folderPaths: string[], rootPath: string | null): string[] {
  if (rootPath === null) return [...folderPaths];
  return folderPaths.filter((path) => path === rootPath || path.startsWith(`${rootPath}/`));
}

function FolderActions({
  expandedDeep,
  onNewFile,
  onNewFolder,
  onRefresh,
  onToggleExpandCollapse,
}: {
  expandedDeep: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onToggleExpandCollapse: () => void;
}) {
  return (
    <div className="tree-row__actions">
      <button
        type="button"
        className="tree-row__icon-btn"
        data-tooltip="Create new file"
        aria-label="Create new file"
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
        data-tooltip="Create new folder"
        aria-label="Create new folder"
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
      <button
        type="button"
        className="tree-row__icon-btn"
        data-tooltip={expandedDeep ? 'Collapse all folders' : 'Expand all folders'}
        aria-label={expandedDeep ? 'Collapse all folders' : 'Expand all folders'}
        onClick={(event) => {
          event.stopPropagation();
          onToggleExpandCollapse();
        }}
      >
        {expandedDeep ? <CollapseAllIcon /> : <ExpandAllIcon />}
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
  onToggleExpandCollapse,
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
  onToggleExpandCollapse: (folderId: string) => void;
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
          const folderIds = collectWorkspaceFolderIds(nodes, node.id);
          const expandedDeep = folderIds.some((id) => expandedFolderIds.has(id));
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
                  <span className="tree-row__icon">📁</span>
                  <span className="tree-row__label">{node.name}</span>
                </button>
                <FolderActions
                  expandedDeep={expandedDeep}
                  onNewFile={() => {
                    onSelectFolder(node.id);
                    onCreateFile(node.id);
                  }}
                  onNewFolder={() => {
                    onSelectFolder(node.id);
                    onCreateFolder(node.id);
                  }}
                  onRefresh={() => onRefresh(node.id)}
                  onToggleExpandCollapse={() => onToggleExpandCollapse(node.id)}
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
                  onToggleExpandCollapse={onToggleExpandCollapse}
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
  localFolderPaths,
  onToggleLocalPath,
  onSelectLocalFolder,
  onOpenLocalFile,
  onContextMenuFolder,
  onContextMenuFile,
  onCreateLocalFile,
  onCreateLocalFolder,
  onRefresh,
  onToggleExpandCollapse,
}: {
  tree: LocalTreeNode[];
  depth: number;
  activeLocalPath: string | null;
  selectedLocalFolderPath: string | null;
  expandedLocalPaths: Set<string>;
  localFolderPaths: string[];
  onToggleLocalPath: (path: string) => void;
  onSelectLocalFolder: (path: string | null) => void;
  onOpenLocalFile: (entry: LocalFileEntry) => void;
  onContextMenuFolder: (event: MouseEvent, folderPath: string) => void;
  onContextMenuFile: (event: MouseEvent, entry: LocalFileEntry) => void;
  onCreateLocalFile: (parentPath: string | null) => void;
  onCreateLocalFolder: (parentPath: string | null) => void;
  onRefresh: () => void;
  onToggleExpandCollapse: (folderPath: string) => void;
}) {
  return (
    <>
      {tree.map((node) => {
        if (node.type === 'folder') {
          const expanded = expandedLocalPaths.has(node.path);
          const folderPaths = collectLocalFolderPaths(localFolderPaths, node.path);
          const expandedDeep = folderPaths.some((path) => expandedLocalPaths.has(path));
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
                  <span className="tree-row__icon">📁</span>
                  <span className="tree-row__label">{node.name}</span>
                </button>
                <FolderActions
                  expandedDeep={expandedDeep}
                  onNewFile={() => {
                    onSelectLocalFolder(node.path);
                    onCreateLocalFile(node.path);
                  }}
                  onNewFolder={() => {
                    onSelectLocalFolder(node.path);
                    onCreateLocalFolder(node.path);
                  }}
                  onRefresh={onRefresh}
                  onToggleExpandCollapse={() => onToggleExpandCollapse(node.path)}
                />
              </div>
              {expanded ? (
                <LocalTreeNodes
                  tree={node.children}
                  depth={depth + 1}
                  activeLocalPath={activeLocalPath}
                  selectedLocalFolderPath={selectedLocalFolderPath}
                  expandedLocalPaths={expandedLocalPaths}
                  localFolderPaths={localFolderPaths}
                  onToggleLocalPath={onToggleLocalPath}
                  onSelectLocalFolder={onSelectLocalFolder}
                  onOpenLocalFile={onOpenLocalFile}
                  onContextMenuFolder={onContextMenuFolder}
                  onContextMenuFile={onContextMenuFile}
                  onCreateLocalFile={onCreateLocalFile}
                  onCreateLocalFolder={onCreateLocalFolder}
                  onRefresh={onRefresh}
                  onToggleExpandCollapse={onToggleExpandCollapse}
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
              <span className="tree-row__icon">📄</span>
              <span className="tree-row__label">{node.name}</span>
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
  onSetExpandedFolders,
  onOpenWorkspaceFile,
  onOpenLocalFile,
  onToggleLocalPath,
  onSetExpandedLocalPaths,
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
  collapsed,
  onToggleCollapse,
}: FileExplorerProps) {
  const { confirm, prompt } = useUi();
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
      const confirmed = await confirm({
        title: 'Delete item',
        message: `Delete "${label}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (confirmed) onDeleteWorkspaceNode(nodeId);
    },
    [confirm, nodes, onDeleteWorkspaceNode],
  );

  const handleRequestDeleteLocal = useCallback(
    async (entry: LocalFileEntry) => {
      const confirmed = await confirm({
        title: 'Delete file',
        message: `Delete "${entry.path}" from disk? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (confirmed) onDeleteLocalFile(entry);
    },
    [confirm, onDeleteLocalFile],
  );

  const handleRequestDeleteLocalFolder = useCallback(
    async (folderPath: string) => {
      const confirmed = await confirm({
        title: 'Delete folder',
        message: `Delete "${folderPath}" and everything inside from disk? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (confirmed) onDeleteLocalFolder(folderPath);
    },
    [confirm, onDeleteLocalFolder],
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

  const toggleWorkspaceExpandCollapse = useCallback(
    (folderId: string) => {
      const folderIds = collectWorkspaceFolderIds(nodes, folderId);
      const anyExpanded = folderIds.some((id) => expandedFolderIds.has(id));
      if (anyExpanded) {
        const next = new Set(expandedFolderIds);
        for (const id of folderIds) next.delete(id);
        onSetExpandedFolders(next);
        return;
      }
      const next = new Set(expandedFolderIds);
      for (const id of folderIds) next.add(id);
      onSetExpandedFolders(next);
    },
    [expandedFolderIds, nodes, onSetExpandedFolders],
  );

  const toggleLocalExpandCollapse = useCallback(
    (folderPath: string | null) => {
      const folderPaths = collectLocalFolderPaths(localFolderPaths, folderPath);
      const anyExpanded = folderPaths.some((path) => expandedLocalPaths.has(path));
      if (anyExpanded) {
        const next = new Set(expandedLocalPaths);
        for (const path of folderPaths) next.delete(path);
        onSetExpandedLocalPaths(next);
        return;
      }
      const next = new Set(expandedLocalPaths);
      for (const path of folderPaths) next.add(path);
      onSetExpandedLocalPaths(next);
    },
    [expandedLocalPaths, localFolderPaths, onSetExpandedLocalPaths],
  );

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
          <input
            ref={importInputRef}
            type="file"
            accept=".js,.mjs,.cjs,.ts,.tsx,.jsx,.txt"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportFile(file, importParentRef.current);
              event.target.value = '';
              importParentRef.current = null;
            }}
          />

          <div className="file-explorer__scroll">
            <div className="file-explorer__section">
              <div className="file-explorer__section-title">My Workspace</div>
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
                  onToggleExpandCollapse={toggleWorkspaceExpandCollapse}
                />
              </div>
            </div>

            <div className="file-explorer__section">
              <div className="file-explorer__section-header">
                <div className="file-explorer__section-title">Local Folder</div>
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={onOpenLocalFolder}
                  disabled={!localSupported}
                >
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
                    className={`file-explorer__root-folder tree-row ${explorerSection === 'local' && selectedLocalFolderPath === null ? 'file-explorer__root-folder--selected tree-row--selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="tree-row__label-btn"
                      onClick={() => onSelectLocalFolder(null)}
                    >
                      <span className="tree-row__icon">📂</span>
                      <span className="file-explorer__folder-name">{localFolderName}</span>
                    </button>
                    {!localNeedsPermission ? (
                      <FolderActions
                        expandedDeep={localFolderPaths.some((path) => expandedLocalPaths.has(path))}
                        onNewFile={() => {
                          onSelectLocalFolder(null);
                          onCreateLocalFile(null);
                        }}
                        onNewFolder={() => {
                          onSelectLocalFolder(null);
                          onCreateLocalFolder(null);
                        }}
                        onRefresh={onRefreshLocal}
                        onToggleExpandCollapse={() => toggleLocalExpandCollapse(null)}
                      />
                    ) : null}
                  </div>
                  <div className="file-explorer__tree">
                    {localTree.length === 0 ? (
                      <p className="file-explorer__hint">Empty folder — hover the folder name and use New File / New Folder.</p>
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
                        localFolderPaths={localFolderPaths}
                        onToggleExpandCollapse={toggleLocalExpandCollapse}
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
