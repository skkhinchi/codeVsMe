import type { WorkspaceNode } from '../types/workspace';

const DB_NAME = 'js-playground-workspace';
const DB_VERSION = 2;
const NODES_STORE = 'nodes';
const META_STORE = 'meta';
const HANDLES_STORE = 'handles';
const DRAFTS_STORE = 'drafts';

export type MetaKey =
  | 'activeFileId'
  | 'selectedFolderId'
  | 'expandedFolderIds'
  | 'expandedLocalPaths'
  | 'activeLocalPath'
  | 'selectedLocalFolderPath'
  | 'explorerSection'
  | 'localFolderName'
  | 'lineWrap'
  | 'explorerOpen'
  | 'snippetsOpen'
  | 'openEditorTabs'
  | 'activeEditorTabId'
  | 'editorSourceKind'
  | 'editorSourceId';

type WorkspaceMetaEntry = {
  key: MetaKey;
  value: unknown;
};

export type LocalFileDraft = {
  path: string;
  content: string;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NODES_STORE)) {
        db.createObjectStore(NODES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(HANDLES_STORE)) {
        db.createObjectStore(HANDLES_STORE);
      }
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: 'path' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open workspace database'));
  });
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function withDb<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await run(db);
  } finally {
    db.close();
  }
}

export async function getAllNodes(): Promise<WorkspaceNode[]> {
  return withDb(async (db) => {
    const tx = db.transaction(NODES_STORE, 'readonly');
    const nodes = await requestToPromise(tx.objectStore(NODES_STORE).getAll());
    await waitForTransaction(tx);
    return nodes as WorkspaceNode[];
  });
}

export async function putNode(node: WorkspaceNode): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(NODES_STORE, 'readwrite');
    tx.objectStore(NODES_STORE).put(node);
    await waitForTransaction(tx);
  });
}

export async function deleteNode(id: string): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(NODES_STORE, 'readwrite');
    tx.objectStore(NODES_STORE).delete(id);
    await waitForTransaction(tx);
  });
}

export async function getMeta<T>(key: MetaKey): Promise<T | null> {
  const entry = await withDb(async (db) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const value = await requestToPromise(tx.objectStore(META_STORE).get(key));
    await waitForTransaction(tx);
    return value as WorkspaceMetaEntry | undefined;
  });
  return (entry?.value as T | undefined) ?? null;
}

export async function setMeta(key: MetaKey, value: unknown): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put({ key, value } satisfies WorkspaceMetaEntry);
    await waitForTransaction(tx);
  });
}

export async function getActiveFileId(): Promise<string | null> {
  return getMeta<string>('activeFileId');
}

export async function setActiveFileId(fileId: string | null): Promise<void> {
  await setMeta('activeFileId', fileId);
}

export async function putDirectoryHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(HANDLES_STORE, 'readwrite');
    tx.objectStore(HANDLES_STORE).put(handle, key);
    await waitForTransaction(tx);
  });
}

export async function getDirectoryHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  return withDb(async (db) => {
    const tx = db.transaction(HANDLES_STORE, 'readonly');
    const handle = await requestToPromise(tx.objectStore(HANDLES_STORE).get(key));
    await waitForTransaction(tx);
    return (handle as FileSystemDirectoryHandle | undefined) ?? null;
  });
}

export async function putLocalDraft(draft: LocalFileDraft): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(DRAFTS_STORE, 'readwrite');
    tx.objectStore(DRAFTS_STORE).put(draft);
    await waitForTransaction(tx);
  });
}

export async function getLocalDraft(path: string): Promise<LocalFileDraft | null> {
  return withDb(async (db) => {
    const tx = db.transaction(DRAFTS_STORE, 'readonly');
    const draft = await requestToPromise(tx.objectStore(DRAFTS_STORE).get(path));
    await waitForTransaction(tx);
    return (draft as LocalFileDraft | undefined) ?? null;
  });
}

export async function deleteLocalDraft(path: string): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(DRAFTS_STORE, 'readwrite');
    tx.objectStore(DRAFTS_STORE).delete(path);
    await waitForTransaction(tx);
  });
}
