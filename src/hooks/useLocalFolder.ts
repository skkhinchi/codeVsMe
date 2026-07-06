import { useCallback, useEffect, useState } from 'react';
import type { LocalFileEntry } from '../types/workspace';
import * as workspaceDb from '../storage/workspaceDb';
import { getTopLevelLocalFolderPaths } from '../utils/localFileTree';

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.txt']);
const LOCAL_DIR_HANDLE_KEY = 'localDirectory';

export type ExplorerSection = 'workspace' | 'local';

function hasCodeExtension(name: string) {
  const lower = name.toLowerCase();
  return [...CODE_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

function uniqueLocalName(base: string, siblings: Set<string>) {
  if (!siblings.has(base)) return base;

  const extMatch = base.match(/^(.*?)(\.[^.]+)?$/);
  const stem = extMatch?.[1] ?? base;
  const ext = extMatch?.[2] ?? '';

  let index = 2;
  while (siblings.has(`${stem}-${index}${ext}`)) index += 1;
  return `${stem}-${index}${ext}`;
}

function getLocalChildNames(
  parentPath: string | null,
  files: LocalFileEntry[],
  folderPaths: string[],
): Set<string> {
  const names = new Set<string>();

  for (const file of files) {
    const parts = file.path.split('/');
    if (parentPath === null) {
      names.add(parts[0]);
      continue;
    }

    const parentParts = parentPath.split('/');
    if (parts.length <= parentParts.length) continue;
    if (parts.slice(0, parentParts.length).join('/') !== parentPath) continue;
    names.add(parts[parentParts.length]);
  }

  for (const folderPath of folderPaths) {
    const parts = folderPath.split('/');
    if (parentPath === null) {
      names.add(parts[0]);
      continue;
    }

    const parentParts = parentPath.split('/');
    if (parts.length <= parentParts.length) continue;
    if (parts.slice(0, parentParts.length).join('/') !== parentPath) continue;
    names.add(parts[parentParts.length]);
  }

  return names;
}

async function resolveDirHandle(
  root: FileSystemDirectoryHandle,
  parentPath: string | null,
): Promise<FileSystemDirectoryHandle> {
  if (!parentPath) return root;

  let current = root;
  for (const part of parentPath.split('/')) {
    current = await current.getDirectoryHandle(part);
  }
  return current;
}

async function collectDirectoryStructure(
  dirHandle: FileSystemDirectoryHandle,
  prefix = '',
): Promise<{ files: LocalFileEntry[]; folderPaths: string[] }> {
  const files: LocalFileEntry[] = [];
  const folderPaths: string[] = [];

  for await (const [name, handle] of dirHandle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;

    if (handle.kind === 'file' && hasCodeExtension(name)) {
      files.push({ path, name, handle: handle as FileSystemFileHandle });
      continue;
    }

    if (handle.kind === 'directory') {
      folderPaths.push(path);
      const nested = await collectDirectoryStructure(handle as FileSystemDirectoryHandle, path);
      files.push(...nested.files);
      folderPaths.push(...nested.folderPaths);
    }
  }

  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    folderPaths: folderPaths.sort((a, b) => a.localeCompare(b)),
  };
}

async function queryDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  const permissionHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  };

  if (!permissionHandle.queryPermission) return 'granted';
  return permissionHandle.queryPermission({ mode: 'readwrite' });
}

async function requestDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const permissionHandle = handle as FileSystemDirectoryHandle & {
    requestPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  };

  if (!permissionHandle.requestPermission) return true;

  try {
    const requested = await permissionHandle.requestPermission({ mode: 'readwrite' });
    return requested === 'granted';
  } catch {
    return false;
  }
}

export function useLocalFolder() {
  const [supported] = useState(
    () => typeof (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function',
  );
  const [folderName, setFolderName] = useState<string | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<LocalFileEntry[]>([]);
  const [folderPaths, setFolderPaths] = useState<string[]>([]);
  const [activeLocalPath, setActiveLocalPathState] = useState<string | null>(null);
  const [selectedLocalFolderPath, setSelectedLocalFolderPathState] = useState<string | null>(null);
  const [explorerSection, setExplorerSectionState] = useState<ExplorerSection>('workspace');
  const [expandedLocalPaths, setExpandedLocalPaths] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistLocalUi = useCallback(
    async (
      paths: Set<string>,
      activePath: string | null,
      selectedFolderPath: string | null,
      section: ExplorerSection,
      name: string | null,
    ) => {
      await workspaceDb.setMeta('expandedLocalPaths', [...paths]);
      await workspaceDb.setMeta('activeLocalPath', activePath);
      await workspaceDb.setMeta('selectedLocalFolderPath', selectedFolderPath);
      await workspaceDb.setMeta('explorerSection', section);
      await workspaceDb.setMeta('localFolderName', name);
    },
    [],
  );

  const setActiveLocalPath = useCallback(
    (path: string | null) => {
      setActiveLocalPathState(path);
      void persistLocalUi(expandedLocalPaths, path, selectedLocalFolderPath, explorerSection, folderName);
    },
    [expandedLocalPaths, explorerSection, folderName, persistLocalUi, selectedLocalFolderPath],
  );

  const setSelectedLocalFolderPath = useCallback(
    (path: string | null) => {
      setSelectedLocalFolderPathState(path);
      setExplorerSectionState('local');
      void persistLocalUi(expandedLocalPaths, activeLocalPath, path, 'local', folderName);
    },
    [activeLocalPath, expandedLocalPaths, folderName, persistLocalUi],
  );

  const setExplorerSection = useCallback(
    (section: ExplorerSection) => {
      setExplorerSectionState(section);
      void persistLocalUi(expandedLocalPaths, activeLocalPath, selectedLocalFolderPath, section, folderName);
    },
    [activeLocalPath, expandedLocalPaths, folderName, persistLocalUi, selectedLocalFolderPath],
  );

  const refreshStructure = useCallback(async (handle: FileSystemDirectoryHandle) => {
    const next = await collectDirectoryStructure(handle);
    setFiles(next.files);
    setFolderPaths(next.folderPaths);
    return next;
  }, []);

  const mountDirectory = useCallback(
    async (
      handle: FileSystemDirectoryHandle,
      options?: { savedExpanded?: string[] | null; requestAccess?: boolean },
    ) => {
      const requestAccess = options?.requestAccess ?? true;
      const permission = await queryDirectoryPermission(handle);

      if (permission !== 'granted') {
        if (!requestAccess) {
          setDirHandle(handle);
          setFolderName(handle.name);
          setNeedsPermission(true);
          setFiles([]);
          setFolderPaths([]);
          setError(null);
          return 'pending-permission' as const;
        }

        const allowed = await requestDirectoryPermission(handle);
        if (!allowed) {
          setError('Folder permission denied. Click Reconnect to try again.');
          return false;
        }
      }

      setNeedsPermission(false);
      setDirHandle(handle);
      setFolderName(handle.name);
      await workspaceDb.putDirectoryHandle(LOCAL_DIR_HANDLE_KEY, handle);
      await workspaceDb.setMeta('localFolderName', handle.name);

      const next = await collectDirectoryStructure(handle);
      setFiles(next.files);
      setFolderPaths(next.folderPaths);

      const expanded =
        options?.savedExpanded && options.savedExpanded.length > 0
          ? new Set(options.savedExpanded)
          : new Set(getTopLevelLocalFolderPaths(next.files, next.folderPaths));
      setExpandedLocalPaths(expanded);
      setSelectedLocalFolderPathState(null);
      setExplorerSectionState('local');
      await workspaceDb.setMeta('expandedLocalPaths', [...expanded]);
      await workspaceDb.setMeta('selectedLocalFolderPath', null);
      await workspaceDb.setMeta('explorerSection', 'local');
      setError(null);
      return true;
    },
    [],
  );

  useEffect(() => {
    void (async () => {
      const [savedExpanded, savedActivePath, savedFolderName, savedSelectedFolderPath, savedSection] =
        await Promise.all([
          workspaceDb.getMeta<string[]>('expandedLocalPaths'),
          workspaceDb.getMeta<string>('activeLocalPath'),
          workspaceDb.getMeta<string>('localFolderName'),
          workspaceDb.getMeta<string | null>('selectedLocalFolderPath'),
          workspaceDb.getMeta<ExplorerSection>('explorerSection'),
        ]);

      if (savedActivePath) setActiveLocalPathState(savedActivePath);
      if (savedFolderName) setFolderName(savedFolderName);
      if (savedExpanded) setExpandedLocalPaths(new Set(savedExpanded));
      if (savedSelectedFolderPath !== undefined) setSelectedLocalFolderPathState(savedSelectedFolderPath);
      if (savedSection) setExplorerSectionState(savedSection);

      const savedHandle = await workspaceDb.getDirectoryHandle(LOCAL_DIR_HANDLE_KEY);
      if (savedHandle) {
        await mountDirectory(savedHandle, { savedExpanded: savedExpanded ?? undefined, requestAccess: false });
      }

      setReady(true);
    })();
  }, [mountDirectory]);

  const reconnectFolder = useCallback(async () => {
    if (!dirHandle) return false;

    try {
      const result = await mountDirectory(dirHandle, { requestAccess: true });
      return result === true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reconnect folder');
      return false;
    }
  }, [dirHandle, mountDirectory]);

  const toggleLocalPath = useCallback(
    (path: string) => {
      setExpandedLocalPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        void persistLocalUi(next, activeLocalPath, selectedLocalFolderPath, explorerSection, folderName);
        return next;
      });
    },
    [activeLocalPath, explorerSection, folderName, persistLocalUi, selectedLocalFolderPath],
  );

  const openFolder = useCallback(async () => {
    if (!supported) {
      setError('Local folders need Chrome or Edge.');
      return null;
    }

    try {
      const picker = (window as unknown as {
        showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker;
      const handle = await picker({ mode: 'readwrite' });
      setError(null);
      await mountDirectory(handle, { requestAccess: true });
      return handle;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      setError(err instanceof Error ? err.message : 'Could not open folder');
      return null;
    }
  }, [mountDirectory, supported]);

  const createLocalFile = useCallback(
    async (fileName = 'untitled.js', parentPath: string | null = null) => {
      if (!dirHandle) return null;

      try {
        const parent = await resolveDirHandle(dirHandle, parentPath);
        const siblings = getLocalChildNames(parentPath, files, folderPaths);
        const name = uniqueLocalName(fileName, siblings);
        const handle = await parent.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write('');
        await writable.close();

        const path = parentPath ? `${parentPath}/${name}` : name;
        const entry: LocalFileEntry = { path, name, handle };

        await refreshStructure(dirHandle);
        setExpandedLocalPaths((prev) => {
          const next = new Set(prev);
          if (parentPath) next.add(parentPath);
          void persistLocalUi(next, activeLocalPath, parentPath, 'local', folderName);
          return next;
        });
        setSelectedLocalFolderPathState(parentPath);
        setExplorerSectionState('local');

        return entry;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create file');
        return null;
      }
    },
    [activeLocalPath, dirHandle, files, folderName, folderPaths, persistLocalUi, refreshStructure],
  );

  const createLocalFolder = useCallback(
    async (folderNameInput = 'New Folder', parentPath: string | null = null) => {
      if (!dirHandle) return null;

      try {
        const parent = await resolveDirHandle(dirHandle, parentPath);
        const siblings = getLocalChildNames(parentPath, files, folderPaths);
        const name = uniqueLocalName(folderNameInput, siblings);
        await parent.getDirectoryHandle(name, { create: true });
        const path = parentPath ? `${parentPath}/${name}` : name;

        await refreshStructure(dirHandle);
        setExpandedLocalPaths((prev) => {
          const next = new Set(prev);
          if (parentPath) next.add(parentPath);
          next.add(path);
          void persistLocalUi(next, activeLocalPath, path, 'local', folderName);
          return next;
        });
        setSelectedLocalFolderPathState(path);
        setExplorerSectionState('local');

        return path;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create folder');
        return null;
      }
    },
    [activeLocalPath, dirHandle, files, folderName, folderPaths, persistLocalUi, refreshStructure],
  );

  const deleteLocalFile = useCallback(
    async (entry: LocalFileEntry) => {
      if (!dirHandle) return false;

      try {
        const parts = entry.path.split('/');
        const fileName = parts.pop();
        if (!fileName) return false;

        let current = dirHandle;
        for (const part of parts) {
          current = await current.getDirectoryHandle(part);
        }

        await current.removeEntry(fileName);
        await workspaceDb.deleteLocalDraft(entry.path);
        await refreshStructure(dirHandle);
        if (activeLocalPath === entry.path) setActiveLocalPath(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete file');
        return false;
      }
    },
    [activeLocalPath, dirHandle, refreshStructure, setActiveLocalPath],
  );

  const deleteLocalFolder = useCallback(
    async (folderPath: string) => {
      if (!dirHandle) return false;

      try {
        const parts = folderPath.split('/');
        const deletedFolderName = parts.pop();
        if (!deletedFolderName) return false;

        let current = dirHandle;
        for (const part of parts) {
          current = await current.getDirectoryHandle(part);
        }

        await current.removeEntry(deletedFolderName, { recursive: true });

        for (const file of files) {
          if (file.path === folderPath || file.path.startsWith(`${folderPath}/`)) {
            await workspaceDb.deleteLocalDraft(file.path);
          }
        }

        await refreshStructure(dirHandle);

        const parentPath = parts.length > 0 ? parts.join('/') : null;
        const shouldClearActive =
          activeLocalPath !== null &&
          (activeLocalPath === folderPath || activeLocalPath.startsWith(`${folderPath}/`));
        const nextActivePath = shouldClearActive ? null : activeLocalPath;
        const shouldUpdateSelection =
          selectedLocalFolderPath !== null &&
          (selectedLocalFolderPath === folderPath || selectedLocalFolderPath.startsWith(`${folderPath}/`));
        const nextSelectedPath = shouldUpdateSelection ? parentPath : selectedLocalFolderPath;

        if (shouldClearActive) setActiveLocalPath(null);
        if (shouldUpdateSelection) setSelectedLocalFolderPath(parentPath);

        setExpandedLocalPaths((prev) => {
          const next = new Set(
            [...prev].filter((path) => path !== folderPath && !path.startsWith(`${folderPath}/`)),
          );
          void persistLocalUi(next, nextActivePath, nextSelectedPath, explorerSection, folderName);
          return next;
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete folder');
        return false;
      }
    },
    [
      activeLocalPath,
      dirHandle,
      explorerSection,
      files,
      folderName,
      persistLocalUi,
      refreshStructure,
      selectedLocalFolderPath,
      setActiveLocalPath,
      setSelectedLocalFolderPath,
    ],
  );

  const findLocalEntry = useCallback(
    (path: string) => files.find((file) => file.path === path) ?? null,
    [files],
  );

  return {
    supported,
    ready,
    folderName,
    dirHandle,
    files,
    folderPaths,
    activeLocalPath,
    selectedLocalFolderPath,
    explorerSection,
    expandedLocalPaths,
    needsPermission,
    error,
    setActiveLocalPath,
    setSelectedLocalFolderPath,
    setExplorerSection,
    toggleLocalPath,
    openFolder,
    reconnectFolder,
    createLocalFile,
    createLocalFolder,
    deleteLocalFile,
    deleteLocalFolder,
    refreshFiles: refreshStructure,
    findLocalEntry,
  };
}
