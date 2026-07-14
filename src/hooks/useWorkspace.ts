import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_CODE } from '../data/snippets';
import * as workspaceDb from '../storage/workspaceDb';
import type { EditorSource, EditorTab, WorkspaceNode } from '../types/workspace';
import { editorTabFromSource, tabIdFromSource } from '../types/workspace';

const LEGACY_STORAGE_KEY = 'js-playground-code';
const SAVE_DEBOUNCE_MS = 300;

function makeId() {
  return crypto.randomUUID();
}

function uniqueName(base: string, siblings: WorkspaceNode[]) {
  const names = new Set(siblings.map((node) => node.name));
  if (!names.has(base)) return base;

  const extMatch = base.match(/^(.*?)(\.[^.]+)?$/);
  const stem = extMatch?.[1] ?? base;
  const ext = extMatch?.[2] ?? '';

  let index = 2;
  while (names.has(`${stem}-${index}${ext}`)) index += 1;
  return `${stem}-${index}${ext}`;
}

async function createDefaultWorkspace(): Promise<{ nodes: WorkspaceNode[]; activeFileId: string }> {
  const legacyCode = localStorage.getItem(LEGACY_STORAGE_KEY);
  const now = Date.now();

  const practiceId = makeId();
  const welcomeId = makeId();

  const nodes: WorkspaceNode[] = [
    { id: practiceId, name: 'Practice', type: 'folder', parentId: null, updatedAt: now },
    {
      id: welcomeId,
      name: 'welcome.js',
      type: 'file',
      parentId: practiceId,
      content: legacyCode ?? DEFAULT_CODE,
      updatedAt: now,
    },
  ];

  for (const node of nodes) {
    await workspaceDb.putNode(node);
  }
  await workspaceDb.setActiveFileId(welcomeId);

  if (legacyCode) localStorage.removeItem(LEGACY_STORAGE_KEY);

  return { nodes, activeFileId: welcomeId };
}

/** Drop the legacy root DSA folder (and its children) from older workspaces. */
async function removeLegacyDsaFolder(nodes: WorkspaceNode[]): Promise<WorkspaceNode[]> {
  const dsaRoots = nodes.filter((node) => node.type === 'folder' && node.parentId === null && node.name === 'DSA');
  if (dsaRoots.length === 0) return nodes;

  const removeIds = new Set<string>();
  const queue = dsaRoots.map((node) => node.id);
  while (queue.length > 0) {
    const id = queue.pop()!;
    removeIds.add(id);
    for (const child of nodes) {
      if (child.parentId === id && !removeIds.has(child.id)) queue.push(child.id);
    }
  }

  await Promise.all([...removeIds].map((id) => workspaceDb.deleteNode(id)));
  return nodes.filter((node) => !removeIds.has(node.id));
}

/** Ensure Practice/welcome.js exists and is the default active file. */
async function ensureWelcomeFile(nodes: WorkspaceNode[]): Promise<{ nodes: WorkspaceNode[]; welcomeId: string }> {
  let nextNodes = nodes;

  let practice = nextNodes.find(
    (node) => node.type === 'folder' && node.parentId === null && node.name === 'Practice',
  );
  if (!practice) {
    practice = {
      id: makeId(),
      name: 'Practice',
      type: 'folder',
      parentId: null,
      updatedAt: Date.now(),
    };
    await workspaceDb.putNode(practice);
    nextNodes = [...nextNodes, practice];
  }

  let welcome =
    nextNodes.find((node) => node.type === 'file' && node.parentId === practice!.id && node.name === 'welcome.js') ??
    nextNodes.find((node) => node.type === 'file' && node.name === 'welcome.js');

  if (!welcome) {
    welcome = {
      id: makeId(),
      name: 'welcome.js',
      type: 'file',
      parentId: practice.id,
      content: DEFAULT_CODE,
      updatedAt: Date.now(),
    };
    await workspaceDb.putNode(welcome);
    nextNodes = [...nextNodes, welcome];
  }

  await workspaceDb.setActiveFileId(welcome.id);
  return { nodes: nextNodes, welcomeId: welcome.id };
}

type LocalFolderApi = {
  ready: boolean;
  findLocalEntry: (path: string) => { path: string; name: string; handle: FileSystemFileHandle } | null;
  setActiveLocalPath: (path: string | null) => void;
};

export function useWorkspace(localFolder: LocalFolderApi) {
  const [nodes, setNodes] = useState<WorkspaceNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderIdState] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [code, setCode] = useState('');
  const [editorSource, setEditorSource] = useState<EditorSource | null>(null);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [dirtyTabIds, setDirtyTabIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const codeRef = useRef(code);
  const editorSourceRef = useRef(editorSource);
  const tabContentsRef = useRef<Record<string, string>>({});
  const openTabsRef = useRef(openTabs);
  const activeTabIdRef = useRef(activeTabId);

  codeRef.current = code;
  editorSourceRef.current = editorSource;
  openTabsRef.current = openTabs;
  activeTabIdRef.current = activeTabId;

  const activeFile = nodes.find((node) => node.id === activeFileId && node.type === 'file') ?? null;

  const refreshNodes = useCallback(async () => {
    const nextNodes = await workspaceDb.getAllNodes();
    setNodes(nextNodes);
    return nextNodes;
  }, []);

  const persistEditorSource = useCallback(async (source: EditorSource | null) => {
    if (!source) {
      await workspaceDb.setMeta('editorSourceKind', null);
      await workspaceDb.setMeta('editorSourceId', null);
      return;
    }

    await workspaceDb.setMeta('editorSourceKind', source.kind);
    await workspaceDb.setMeta('editorSourceId', source.kind === 'workspace' ? source.fileId : source.path);
  }, []);

  const persistTabsMeta = useCallback(async (tabs = openTabsRef.current, tabId = activeTabIdRef.current) => {
    await workspaceDb.setMeta('openEditorTabs', tabs);
    await workspaceDb.setMeta('activeEditorTabId', tabId);
  }, []);

  const saveCurrentTabBuffer = useCallback(() => {
    const source = editorSourceRef.current;
    if (!source) return;
    tabContentsRef.current[tabIdFromSource(source)] = codeRef.current;
  }, []);

  const markTabDirty = useCallback((tabId: string) => {
    setDirtyTabIds((prev) => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  }, []);

  const clearTabDirty = useCallback((tabId: string) => {
    setDirtyTabIds((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const persistWorkspaceFile = useCallback(async (fileId: string, content: string) => {
    const allNodes = await workspaceDb.getAllNodes();
    const node = allNodes.find((item) => item.id === fileId);
    if (!node || node.type !== 'file') return;

    const updated: WorkspaceNode = { ...node, content, updatedAt: Date.now() };
    await workspaceDb.putNode(updated);
    setNodes((prev) => prev.map((item) => (item.id === fileId ? updated : item)));
  }, []);

  const persistLocalDraft = useCallback(async (path: string, content: string) => {
    await workspaceDb.putLocalDraft({ path, content, updatedAt: Date.now() });
  }, []);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const source = editorSourceRef.current;
    const content = codeRef.current;

    if (source?.kind === 'workspace') {
      await persistWorkspaceFile(source.fileId, content);
      clearTabDirty(tabIdFromSource(source));
    } else if (source?.kind === 'local') {
      await persistLocalDraft(source.path, content);
      clearTabDirty(tabIdFromSource(source));
    }
  }, [clearTabDirty, persistLocalDraft, persistWorkspaceFile]);

  const setSelectedFolderId = useCallback((folderId: string | null) => {
    setSelectedFolderIdState(folderId);
    void workspaceDb.setMeta('selectedFolderId', folderId);
  }, []);

  const scheduleSave = useCallback(
    (nextCode: string, source: EditorSource) => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void (async () => {
          if (source.kind === 'workspace') await persistWorkspaceFile(source.fileId, nextCode);
          else await persistLocalDraft(source.path, nextCode);
          clearTabDirty(tabIdFromSource(source));
        })();
      }, SAVE_DEBOUNCE_MS);
    },
    [clearTabDirty, persistLocalDraft, persistWorkspaceFile],
  );

  const updateCode = useCallback(
    (nextCode: string) => {
      setCode(nextCode);
      const source = editorSourceRef.current;
      if (!source) return;
      const tabId = tabIdFromSource(source);
      tabContentsRef.current[tabId] = nextCode;
      markTabDirty(tabId);
      scheduleSave(nextCode, source);
    },
    [markTabDirty, scheduleSave],
  );

  const openTab = useCallback(
    async (tab: EditorTab, preferredContent?: string) => {
      await flushSave();
      saveCurrentTabBuffer();

      if (tab.kind === 'workspace' && tab.fileId) {
        const allNodes = await refreshNodes();
        const file = allNodes.find((node) => node.id === tab.fileId && node.type === 'file');
        if (!file) return;

        const source: EditorSource = { kind: 'workspace', fileId: tab.fileId, name: file.name };
        const tabId = tab.id;
        const nextContent = preferredContent ?? tabContentsRef.current[tabId] ?? file.content ?? '';
        const nextTab: EditorTab = { id: tabId, kind: 'workspace', name: file.name, fileId: tab.fileId };

        tabContentsRef.current[tabId] = nextContent;
        clearTabDirty(tabId);
        setOpenTabs((prev) => {
          const exists = prev.some((item) => item.id === tabId);
          const nextTabs = exists
            ? prev.map((item) => (item.id === tabId ? nextTab : item))
            : [...prev, nextTab];
          void persistTabsMeta(nextTabs, tabId);
          return nextTabs;
        });
        setActiveTabId(tabId);
        setActiveFileId(tab.fileId);
        setEditorSource(source);
        setCode(nextContent);
        localFolder.setActiveLocalPath(null);

        await workspaceDb.setActiveFileId(tab.fileId);
        await persistEditorSource(source);

        if (file.parentId) {
          setSelectedFolderId(file.parentId);
          setExpandedFolderIds((prev) => {
            const next = new Set(prev).add(file.parentId!);
            void workspaceDb.setMeta('expandedFolderIds', [...next]);
            return next;
          });
        }
        return;
      }

      if (tab.kind === 'local' && tab.path) {
        const entry = localFolder.findLocalEntry(tab.path);
        if (!entry) return;

        const tabId = tab.id;
        let nextContent = preferredContent ?? tabContentsRef.current[tabId];
        if (nextContent === undefined) {
          const file = await entry.handle.getFile();
          const diskContent = await file.text();
          const draft = await workspaceDb.getLocalDraft(entry.path);
          nextContent = draft && draft.updatedAt >= file.lastModified ? draft.content : diskContent;
        }

        const source: EditorSource = {
          kind: 'local',
          path: entry.path,
          name: entry.name,
          handle: entry.handle,
        };
        const nextTab: EditorTab = { id: tabId, kind: 'local', name: entry.name, path: entry.path };

        tabContentsRef.current[tabId] = nextContent;
        clearTabDirty(tabId);
        setOpenTabs((prev) => {
          const exists = prev.some((item) => item.id === tabId);
          const nextTabs = exists
            ? prev.map((item) => (item.id === tabId ? nextTab : item))
            : [...prev, nextTab];
          void persistTabsMeta(nextTabs, tabId);
          return nextTabs;
        });
        setActiveTabId(tabId);
        setActiveFileId(null);
        setEditorSource(source);
        setCode(nextContent);
        localFolder.setActiveLocalPath(entry.path);

        await workspaceDb.setActiveFileId(null);
        await persistEditorSource(source);
      }
    },
    [
      clearTabDirty,
      flushSave,
      localFolder,
      persistEditorSource,
      persistTabsMeta,
      refreshNodes,
      saveCurrentTabBuffer,
      setSelectedFolderId,
    ],
  );

  const activateTab = useCallback(
    async (tabId: string) => {
      if (tabId === activeTabIdRef.current) return;
      const tab = openTabsRef.current.find((item) => item.id === tabId);
      if (!tab) return;
      await openTab(tab);
    },
    [openTab],
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      const tabs = openTabsRef.current;
      const index = tabs.findIndex((item) => item.id === tabId);
      if (index === -1) return;

      const wasActive = activeTabIdRef.current === tabId;
      if (wasActive) await flushSave();

      delete tabContentsRef.current[tabId];
      clearTabDirty(tabId);

      const nextTabs = tabs.filter((item) => item.id !== tabId);
      setOpenTabs(nextTabs);

      if (!wasActive) {
        await persistTabsMeta(nextTabs, activeTabIdRef.current);
        return;
      }

      if (nextTabs.length === 0) {
        const ensured = await ensureWelcomeFile(await refreshNodes());
        setNodes(ensured.nodes);
        const welcome = ensured.nodes.find((node) => node.id === ensured.welcomeId && node.type === 'file');
        if (welcome) {
          await openTab(editorTabFromSource({ kind: 'workspace', fileId: welcome.id, name: welcome.name }));
        }
        return;
      }

      const nextTab = nextTabs[Math.min(index, nextTabs.length - 1)];
      await openTab(nextTab);
    },
    [clearTabDirty, flushSave, openTab, persistTabsMeta, refreshNodes],
  );

  const openWorkspaceFile = useCallback(
    async (fileId: string) => {
      const allNodes = nodes.length > 0 ? nodes : await refreshNodes();
      const file = allNodes.find((node) => node.id === fileId && node.type === 'file');
      if (!file) return;
      await openTab(editorTabFromSource({ kind: 'workspace', fileId, name: file.name }));
    },
    [nodes, openTab, refreshNodes],
  );

  const openLocalFile = useCallback(
    async (entry: { path: string; name: string; handle: FileSystemFileHandle }) => {
      await openTab(editorTabFromSource({ kind: 'local', path: entry.path, name: entry.name, handle: entry.handle }));
    },
    [openTab],
  );

  const createFile = useCallback(
    async (parentId: string | null, preferredName = 'untitled.js') => {
      await flushSave();
      const siblings = nodes.filter((node) => node.parentId === parentId);
      const name = uniqueName(preferredName, siblings);
      const file: WorkspaceNode = {
        id: makeId(),
        name,
        type: 'file',
        parentId,
        content: '',
        updatedAt: Date.now(),
      };

      await workspaceDb.putNode(file);
      await refreshNodes();
      if (parentId) {
        setExpandedFolderIds((prev) => {
          const next = new Set(prev).add(parentId);
          void workspaceDb.setMeta('expandedFolderIds', [...next]);
          return next;
        });
      }
      await openWorkspaceFile(file.id);
      return file;
    },
    [flushSave, nodes, openWorkspaceFile, refreshNodes],
  );

  const createFolder = useCallback(
    async (parentId: string | null, preferredName = 'New Folder') => {
      const siblings = nodes.filter((node) => node.parentId === parentId);
      const name = uniqueName(preferredName, siblings);
      const folder: WorkspaceNode = {
        id: makeId(),
        name,
        type: 'folder',
        parentId,
        updatedAt: Date.now(),
      };

      await workspaceDb.putNode(folder);
      await refreshNodes();
      if (parentId) {
        setExpandedFolderIds((prev) => {
          const next = new Set(prev).add(parentId);
          void workspaceDb.setMeta('expandedFolderIds', [...next]);
          return next;
        });
      }
      setExpandedFolderIds((prev) => {
        const next = new Set(prev).add(folder.id);
        void workspaceDb.setMeta('expandedFolderIds', [...next]);
        return next;
      });
      setSelectedFolderId(folder.id);
      return folder;
    },
    [nodes, refreshNodes, setSelectedFolderId],
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      const target = nodes.find((node) => node.id === nodeId);
      if (!target) return;

      const collectIds = (id: string): string[] => {
        const childIds = nodes.filter((node) => node.parentId === id).flatMap((child) => collectIds(child.id));
        return [id, ...childIds];
      };

      const idsToDelete = collectIds(nodeId);
      for (const id of idsToDelete) {
        await workspaceDb.deleteNode(id);
      }

      const nextNodes = await refreshNodes();

      if (editorSource?.kind === 'workspace' && idsToDelete.includes(editorSource.fileId)) {
        const tabsToClose = openTabsRef.current.filter(
          (tab) => tab.kind === 'workspace' && tab.fileId && idsToDelete.includes(tab.fileId),
        );
        for (const tab of tabsToClose) {
          delete tabContentsRef.current[tab.id];
          clearTabDirty(tab.id);
        }
        const remainingTabs = openTabsRef.current.filter(
          (tab) => !(tab.kind === 'workspace' && tab.fileId && idsToDelete.includes(tab.fileId)),
        );
        setOpenTabs(remainingTabs);

        const fallback = nextNodes.find((node) => node.type === 'file' && node.name === 'welcome.js')
          ?? nextNodes.find((node) => node.type === 'file');
        if (fallback && remainingTabs.length === 0) {
          await openWorkspaceFile(fallback.id);
        } else if (remainingTabs.length > 0 && tabsToClose.some((tab) => tab.id === activeTabIdRef.current)) {
          await openTab(remainingTabs[0]);
        } else if (remainingTabs.length === 0) {
          const ensured = await ensureWelcomeFile(nextNodes);
          setNodes(ensured.nodes);
          await openWorkspaceFile(ensured.welcomeId);
        } else {
          await persistTabsMeta(remainingTabs, activeTabIdRef.current);
        }
      }

      if (activeFileId && idsToDelete.includes(activeFileId)) {
        setActiveFileId(null);
      }
    },
    [clearTabDirty, editorSource, nodes, openTab, openWorkspaceFile, persistEditorSource, persistTabsMeta, refreshNodes],
  );

  const renameNode = useCallback(
    async (nodeId: string, nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed) return;

      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return;

      const siblings = nodes.filter((item) => item.parentId === node.parentId && item.id !== nodeId);
      const name = uniqueName(trimmed, siblings);
      const updated = { ...node, name, updatedAt: Date.now() };

      await workspaceDb.putNode(updated);
      await refreshNodes();

      if (editorSource?.kind === 'workspace' && editorSource.fileId === nodeId) {
        const source: EditorSource = { kind: 'workspace', fileId: nodeId, name };
        setEditorSource(source);
        setOpenTabs((prev) => prev.map((tab) => (tab.id === tabIdFromSource(source) ? { ...tab, name } : tab)));
        await persistEditorSource(source);
        await persistTabsMeta(
          openTabsRef.current.map((tab) => (tab.id === tabIdFromSource(source) ? { ...tab, name } : tab)),
          activeTabIdRef.current,
        );
      } else {
        const renamedTabId = `workspace:${nodeId}`;
        setOpenTabs((prev) => prev.map((tab) => (tab.id === renamedTabId ? { ...tab, name } : tab)));
      }
    },
    [editorSource, nodes, persistEditorSource, persistTabsMeta, refreshNodes],
  );

  const importFileToWorkspace = useCallback(
    async (file: File, parentId: string | null) => {
      const content = await file.text();
      const created = await createFile(parentId, file.name);
      await persistWorkspaceFile(created.id, content);
      await openWorkspaceFile(created.id);
    },
    [createFile, openWorkspaceFile, persistWorkspaceFile],
  );

  const saveLocalFile = useCallback(async () => {
    const source = editorSourceRef.current;
    if (source?.kind !== 'local') return false;

    const writable = await source.handle.createWritable();
    await writable.write(codeRef.current);
    await writable.close();
    await workspaceDb.deleteLocalDraft(source.path);
    clearTabDirty(tabIdFromSource(source));
    return true;
  }, [clearTabDirty]);

  const loadSnippet = useCallback(
    async (snippetCode: string) => {
      const source = editorSourceRef.current;
      if (source?.kind === 'local' || source?.kind === 'workspace') {
        updateCode(snippetCode);
        return;
      }

      const ensured = await ensureWelcomeFile(await refreshNodes());
      setNodes(ensured.nodes);
      await persistWorkspaceFile(ensured.welcomeId, snippetCode);
      await openWorkspaceFile(ensured.welcomeId);
    },
    [openWorkspaceFile, persistWorkspaceFile, refreshNodes, updateCode],
  );

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      void workspaceDb.setMeta('expandedFolderIds', [...next]);
      return next;
    });
  }, []);

  const setExpandedFolders = useCallback((ids: Iterable<string>) => {
    const next = new Set(ids);
    setExpandedFolderIds(next);
    void workspaceDb.setMeta('expandedFolderIds', [...next]);
  }, []);

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    void (async () => {
      let nextNodes = await workspaceDb.getAllNodes();

      if (nextNodes.length === 0) {
        const created = await createDefaultWorkspace();
        nextNodes = created.nodes;
      } else {
        nextNodes = await removeLegacyDsaFolder(nextNodes);
      }

      const ensured = await ensureWelcomeFile(nextNodes);
      nextNodes = ensured.nodes;

      const [savedSelectedFolder, savedExpanded] = await Promise.all([
        workspaceDb.getMeta<string>('selectedFolderId'),
        workspaceDb.getMeta<string[]>('expandedFolderIds'),
      ]);

      const practiceId = nextNodes.find(
        (node) => node.type === 'folder' && node.parentId === null && node.name === 'Practice',
      )?.id;

      setNodes(nextNodes);
      setActiveFileId(ensured.welcomeId);
      setSelectedFolderIdState(savedSelectedFolder ?? practiceId ?? null);

      const expanded = new Set(savedExpanded ?? []);
      if (practiceId) expanded.add(practiceId);
      setExpandedFolderIds(expanded);
      void workspaceDb.setMeta('expandedFolderIds', [...expanded]);

      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready || !localFolder.ready || bootstrappedRef.current) return;

    void (async () => {
      bootstrappedRef.current = true;
      const allNodes = await refreshNodes();
      const ensured = await ensureWelcomeFile(allNodes);
      setNodes(ensured.nodes);
      await openWorkspaceFile(ensured.welcomeId);
    })();
  }, [localFolder.ready, openWorkspaceFile, ready, refreshNodes]);

  useEffect(() => {
    const saveBeforeExit = () => {
      void flushSave();
    };

    window.addEventListener('beforeunload', saveBeforeExit);
    window.addEventListener('pagehide', saveBeforeExit);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveBeforeExit();
    });

    return () => {
      window.removeEventListener('beforeunload', saveBeforeExit);
      window.removeEventListener('pagehide', saveBeforeExit);
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [flushSave]);

  return {
    ready,
    nodes,
    code,
    activeFile,
    activeFileId,
    editorSource,
    openTabs,
    activeTabId,
    dirtyTabIds,
    selectedFolderId,
    expandedFolderIds,
    setSelectedFolderId,
    updateCode,
    openWorkspaceFile,
    openLocalFile,
    activateTab,
    closeTab,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    importFileToWorkspace,
    saveLocalFile,
    loadSnippet,
    toggleFolder,
    setExpandedFolders,
    flushSave,
    refreshNodes,
  };
}
