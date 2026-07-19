import { useEffect, useRef, useState } from 'react';
import { AuthModal } from './components/Auth/AuthModal';
import { UserMenu } from './components/Auth/UserMenu';
import { CodeEditor, type CodeEditorHandle } from './components/CodeEditor';
import { EditorTabBar } from './components/EditorTabBar';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { ChatIcon } from './components/LearnChat/ChatIcon';
import { LearnChatPanel } from './components/LearnChat/LearnChatPanel';
import { OutputTabs, type OutputTab } from './components/OutputTabs';
import { SplitPane } from './components/SplitPane';
import { UiProvider, useUi } from './components/ui/UiProvider';
import { DSA_CATEGORIES, EXAMPLE_SNIPPETS } from './data/snippets';
import { useAuth, type AuthApi } from './hooks/useAuth';
import { useCodeRunner, type OutputLine } from './hooks/useCodeRunner';
import { useLocalFolder } from './hooks/useLocalFolder';
import { useRepl } from './hooks/useRepl';
import { useWorkspace } from './hooks/useWorkspace';
import * as workspaceDb from './storage/workspaceDb';
import type { LearnChatContext } from './types/chat';
import { getTabBreadcrumb } from './utils/editorTabs';
import {
  buildWebPreview,
  dirname,
  workspaceFilePath,
  workspacePreviewFiles,
  type PreviewFile,
} from './utils/htmlPreview';
import { languageFromFileName } from './editor/languageMode';
import {
  isCssFile,
  isHtmlFile,
  isRunnableFile,
  isRunnableJavaScriptFile,
  isWebPreviewFile,
} from './utils/runnableFiles';
import './App.css';

function formatOutputForChat(lines: OutputLine[]) {
  return lines
    .map((line) => {
      const prefix = line.line !== undefined ? `Line ${line.line}: ` : '';
      return `${prefix}${line.text}`;
    })
    .join('\n');
}

function AppContent({ auth }: { auth: AuthApi }) {
  const { toast, prompt } = useUi();
  const [lineWrap, setLineWrapState] = useState(false);
  const [explorerOpen, setExplorerOpenState] = useState(true);
  const [snippetsOpen, setSnippetsOpenState] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<LearnChatContext | null>(null);
  const [uiReady, setUiReady] = useState(false);
  const [selectedExample, setSelectedExample] = useState('');
  const [selectedDsaCategory, setSelectedDsaCategory] = useState('');
  const [selectedDsaSnippet, setSelectedDsaSnippet] = useState('');
  const editorRef = useRef<CodeEditorHandle>(null);
  const previewRevokeRef = useRef<(() => void) | null>(null);
  const { lines, run, clear, runOutcome } = useCodeRunner();
  const repl = useRepl();
  const [outputTab, setOutputTab] = useState<OutputTab>('console');
  const [webViewHtml, setWebViewHtml] = useState<string | null>(null);

  const localFolder = useLocalFolder();
  const workspace = useWorkspace(localFolder);

  useEffect(() => {
    void Promise.all([
      workspaceDb.getMeta<boolean>('lineWrap'),
      workspaceDb.getMeta<boolean>('explorerOpen'),
      workspaceDb.getMeta<boolean>('snippetsOpen'),
    ]).then(([savedLineWrap, savedExplorerOpen, savedSnippetsOpen]) => {
      if (typeof savedLineWrap === 'boolean') setLineWrapState(savedLineWrap);
      if (typeof savedExplorerOpen === 'boolean') setExplorerOpenState(savedExplorerOpen);
      if (typeof savedSnippetsOpen === 'boolean') setSnippetsOpenState(savedSnippetsOpen);
      setUiReady(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      previewRevokeRef.current?.();
      previewRevokeRef.current = null;
    };
  }, []);

  const setLineWrap = (value: boolean) => {
    setLineWrapState(value);
    void workspaceDb.setMeta('lineWrap', value);
  };

  const toggleExplorer = () => {
    setExplorerOpenState((prev) => {
      const next = !prev;
      void workspaceDb.setMeta('explorerOpen', next);
      return next;
    });
  };

  const toggleSnippets = () => {
    if (!isRunnableJavaScriptFile(workspace.editorSource?.name)) return;
    setSnippetsOpenState((prev) => {
      const next = !prev;
      void workspaceDb.setMeta('snippetsOpen', next);
      return next;
    });
  };

  const activeDsaCategory = DSA_CATEGORIES.find((category) => category.id === selectedDsaCategory);

  const clearWebView = () => {
    previewRevokeRef.current?.();
    previewRevokeRef.current = null;
    setWebViewHtml(null);
  };

  const collectLocalPreviewFiles = async (): Promise<PreviewFile[]> => {
    const files: PreviewFile[] = [];
    for (const entry of localFolder.files) {
      try {
        const file = await entry.handle.getFile();
        const content = await file.text();
        files.push({ path: entry.path, content });
      } catch {
        // Skip unreadable files
      }
    }
    return files;
  };

  const handleRun = async (source?: string) => {
    const fileName = workspace.editorSource?.name;
    if (!isRunnableFile(fileName)) return;

    const code = source ?? editorRef.current?.getCode() ?? workspace.code;

    if (isRunnableJavaScriptFile(fileName)) {
      setOutputTab('console');
      run(code);
      return;
    }

    if (!isWebPreviewFile(fileName) || !workspace.editorSource) return;

    let entryPath = fileName;
    let files: PreviewFile[] = [];

    if (workspace.editorSource.kind === 'workspace') {
      entryPath = workspaceFilePath(workspace.nodes, workspace.editorSource.fileId);
      files = workspacePreviewFiles(workspace.nodes);
      const existing = files.find((file) => file.path === entryPath);
      if (existing) existing.content = code;
      else files.push({ path: entryPath, content: code });
    } else {
      entryPath = workspace.editorSource.path;
      files = await collectLocalPreviewFiles();
      const existing = files.find((file) => file.path === entryPath);
      if (existing) existing.content = code;
      else files.push({ path: entryPath, content: code });
    }

    previewRevokeRef.current?.();
    const preview = buildWebPreview({
      entryPath,
      entryContent: code,
      files,
      entryIsCss: isCssFile(fileName),
    });
    previewRevokeRef.current = preview.revoke;
    setWebViewHtml(preview.html);
    setOutputTab('webview');

    if (isHtmlFile(fileName)) {
      toast.success('Opened in Web View');
    }
  };

  const openLearnChat = () => {
    const code = editorRef.current?.getCode() ?? workspace.code;
    const fileName =
      workspace.editorSource?.kind === 'local'
        ? workspace.editorSource.name
        : workspace.editorSource?.kind === 'workspace'
          ? workspace.editorSource.name
          : 'Untitled';

    setChatContext({
      code,
      fileName,
      output: formatOutputForChat(lines),
      capturedAt: Date.now(),
    });
    setChatOpen(true);
  };

  const handleExampleChange = (snippetId: string) => {
    if (!isRunnableJavaScriptFile(workspace.editorSource?.name)) return;
    setSelectedExample(snippetId);
    setSelectedDsaCategory('');
    setSelectedDsaSnippet('');
    const snippet = EXAMPLE_SNIPPETS.find((item) => item.id === snippetId);
    if (snippet) void workspace.loadSnippet(snippet.code);
  };

  const handleDsaCategoryChange = (categoryId: string) => {
    if (!isRunnableJavaScriptFile(workspace.editorSource?.name)) return;
    setSelectedDsaCategory(categoryId);
    setSelectedDsaSnippet('');
    setSelectedExample('');
  };

  const handleDsaSnippetChange = (snippetId: string) => {
    if (!isRunnableJavaScriptFile(workspace.editorSource?.name)) return;
    setSelectedDsaSnippet(snippetId);
    setSelectedExample('');
    const snippet = activeDsaCategory?.snippets.find((item) => item.id === snippetId);
    if (snippet) void workspace.loadSnippet(snippet.code);
  };

  const handleSave = async () => {
    await workspace.flushSave();
    if (workspace.editorSource?.kind === 'local') {
      const saved = await workspace.saveLocalFile();
      if (saved) toast.success('Saved to disk');
      else toast.error('Could not save file');
      return;
    }
    toast.success('Saved to workspace');
  };

  const handleOpenLocalFile = async (entry: Parameters<typeof workspace.openLocalFile>[0]) => {
    const parts = entry.path.split('/');
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
    localFolder.setSelectedLocalFolderPath(parentPath);
    await workspace.openLocalFile(entry);
  };

  const handleSelectFolder = (folderId: string | null) => {
    workspace.setSelectedFolderId(folderId);
    localFolder.setExplorerSection('workspace');
  };

  const handleOpenWorkspaceFile = async (fileId: string) => {
    localFolder.setExplorerSection('workspace');
    await workspace.openWorkspaceFile(fileId);
  };

  const handleCreateWorkspaceFile = async (parentId: string | null) => {
    const name = await prompt({
      title: 'New file',
      label: 'File name',
      placeholder: 'my-file.js',
      submitLabel: 'Create',
    });
    if (!name) return;
    const trimmed = name.trim();
    try {
      await workspace.createFile(parentId, trimmed);
      toast.success({ title: 'File created', message: `"${trimmed}" is ready in your workspace.` });
    } catch (error) {
      console.error(error);
      toast.error({ title: 'Could not create file', message: 'Something went wrong. Please try again.' });
    }
  };

  const handleCreateWorkspaceFolder = async (parentId: string | null) => {
    const name = await prompt({
      title: 'New folder',
      label: 'Folder name',
      placeholder: 'My folder',
      submitLabel: 'Create',
    });
    if (!name) return;
    const trimmed = name.trim();
    try {
      await workspace.createFolder(parentId, trimmed);
      toast.success({ title: 'Folder created', message: `"${trimmed}" was added to your workspace.` });
    } catch (error) {
      console.error(error);
      toast.error({ title: 'Could not create folder', message: 'Something went wrong. Please try again.' });
    }
  };

  const handleCreateLocalFile = async (parentPath: string | null) => {
    const name = await prompt({
      title: 'New file',
      label: 'File name',
      placeholder: 'my-file.js',
      submitLabel: 'Create',
    });
    if (!name) return;
    const trimmed = name.trim();
    try {
      const entry = await localFolder.createLocalFile(trimmed, parentPath);
      if (entry) {
        await handleOpenLocalFile(entry);
        toast.success({ title: 'File created', message: `"${trimmed}" was written to disk.` });
      }
    } catch (error) {
      console.error(error);
      toast.error({ title: 'Could not create file', message: 'Check folder permission and try again.' });
    }
  };

  const handleCreateLocalFolder = async (parentPath: string | null) => {
    const name = await prompt({
      title: 'New folder',
      label: 'Folder name',
      placeholder: 'My folder',
      submitLabel: 'Create',
    });
    if (!name) return;
    const trimmed = name.trim();
    try {
      await localFolder.createLocalFolder(trimmed, parentPath);
      toast.success({ title: 'Folder created', message: `"${trimmed}" was created on disk.` });
    } catch (error) {
      console.error(error);
      toast.error({ title: 'Could not create folder', message: 'Check folder permission and try again.' });
    }
  };

  const activeFileNameForSnippets = workspace.editorSource?.name;
  const canUseSnippets = isRunnableJavaScriptFile(activeFileNameForSnippets);

  useEffect(() => {
    if (!canUseSnippets && snippetsOpen) {
      setSnippetsOpenState(false);
      void workspaceDb.setMeta('snippetsOpen', false);
    }
  }, [canUseSnippets, snippetsOpen]);

  if (!workspace.ready || !localFolder.ready || !uiReady) {
    return (
      <div className="app app--loading" role="status" aria-live="polite">
        <p>Loading workspace…</p>
      </div>
    );
  }

  const activeTab = workspace.openTabs.find((tab) => tab.id === workspace.activeTabId) ?? null;
  const tabBreadcrumb = getTabBreadcrumb(activeTab, workspace.nodes, localFolder.folderName);
  const activeFileName = workspace.editorSource?.name ?? activeTab?.name;
  const editorLanguage = languageFromFileName(activeFileName);
  const canRun = isRunnableFile(activeFileName);

  const siblingFiles = (() => {
    const source = workspace.editorSource;
    if (!source) return [] as string[];

    if (source.kind === 'workspace') {
      const current = workspace.nodes.find((node) => node.id === source.fileId);
      if (!current) return [];
      const sameFolder = workspace.nodes
        .filter((node) => node.type === 'file' && node.parentId === current.parentId && node.id !== current.id)
        .map((node) => node.name);

      // Also suggest files one folder deeper as relative paths (e.g. js/app.js)
      const childFolders = workspace.nodes.filter(
        (node) => node.type === 'folder' && node.parentId === current.parentId,
      );
      const nested: string[] = [];
      for (const folder of childFolders) {
        for (const node of workspace.nodes) {
          if (node.type === 'file' && node.parentId === folder.id) {
            nested.push(`${folder.name}/${node.name}`);
          }
        }
      }
      return [...sameFolder, ...nested];
    }

    const dir = dirname(source.path);
    return localFolder.files
      .filter((file) => file.path !== source.path && dirname(file.path) === dir)
      .map((file) => file.name);
  })();

  const runHint = isWebPreviewFile(activeFileName)
    ? 'Ctrl+Enter / Cmd+Enter — preview in Web View'
    : canRun
      ? 'Ctrl+Enter / Cmd+Enter'
      : 'Run supports .js, .html, and .css files';
  const runTitle = isWebPreviewFile(activeFileName)
    ? 'Preview in Web View'
    : canRun
      ? 'Run JavaScript'
      : 'Only .js, .html, and .css files can be run';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <a href="http://sumit.codevsme.com/" className="app-header__brand-link">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="app-header__logo" />
            <div className="app-header__text">
              <h1>Code v/s Me</h1>
              <p>Infinite Challenge. Infinite Growth.</p>
            </div>
          </a>
        </div>
        <div className="app-header__actions">
          {auth.user ? (
            <UserMenu user={auth.user} onLogout={auth.logout} />
          ) : (
            <button
              type="button"
              className="btn btn--signin"
              onClick={auth.openModal}
              aria-haspopup="dialog"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <main id="main-content" className="app-main" tabIndex={-1}>
      <SplitPane
        left={
          <div className="editor-layout">
            <FileExplorer
              nodes={workspace.nodes}
              activeFileId={workspace.activeFileId}
              activeLocalPath={localFolder.activeLocalPath}
              selectedFolderId={workspace.selectedFolderId}
              selectedLocalFolderPath={localFolder.selectedLocalFolderPath}
              explorerSection={localFolder.explorerSection}
              expandedFolderIds={workspace.expandedFolderIds}
              localFolderName={localFolder.folderName}
              localNeedsPermission={localFolder.needsPermission}
              localFiles={localFolder.files}
              localFolderPaths={localFolder.folderPaths}
              expandedLocalPaths={localFolder.expandedLocalPaths}
              localSupported={localFolder.supported}
              onSelectFolder={handleSelectFolder}
              onSelectLocalFolder={localFolder.setSelectedLocalFolderPath}
              onToggleFolder={workspace.toggleFolder}
              onOpenWorkspaceFile={handleOpenWorkspaceFile}
              onOpenLocalFile={handleOpenLocalFile}
              onToggleLocalPath={localFolder.toggleLocalPath}
              onCreateFile={handleCreateWorkspaceFile}
              onCreateFolder={handleCreateWorkspaceFolder}
              onCreateLocalFile={handleCreateLocalFile}
              onCreateLocalFolder={handleCreateLocalFolder}
              onDeleteWorkspaceNode={workspace.deleteNode}
              onRenameWorkspaceNode={workspace.renameNode}
              onImportFile={(file, parentId) =>
                workspace.importFileToWorkspace(file, parentId ?? workspace.selectedFolderId)
              }
              onOpenLocalFolder={localFolder.openFolder}
              onReconnectLocalFolder={() => void localFolder.reconnectFolder()}
              onDeleteLocalFile={localFolder.deleteLocalFile}
              onDeleteLocalFolder={localFolder.deleteLocalFolder}
              onRefreshWorkspace={() => {
                void workspace.refreshNodes();
              }}
              onRefreshLocal={() => {
                if (localFolder.dirHandle) void localFolder.refreshFiles(localFolder.dirHandle);
              }}
              onSetExplorerSection={localFolder.setExplorerSection}
              collapsed={!explorerOpen}
              onToggleCollapse={toggleExplorer}
            />
            <div className="panel panel--editor">
              <EditorTabBar
                tabs={workspace.openTabs}
                activeTabId={workspace.activeTabId}
                dirtyTabIds={workspace.dirtyTabIds}
                breadcrumb={tabBreadcrumb}
                onSelectTab={(tabId) => void workspace.activateTab(tabId)}
                onCloseTab={(tabId) => void workspace.closeTab(tabId)}
              />
              <div className={`panel-toolbar ${snippetsOpen && canUseSnippets ? 'panel-toolbar--stacked' : ''}`}>
                <div className="panel-toolbar__row">
                  <button
                    type="button"
                    className="btn btn--toggle"
                    onClick={toggleSnippets}
                    aria-expanded={snippetsOpen && canUseSnippets}
                    disabled={!canUseSnippets}
                    title={canUseSnippets ? 'Insert JS examples and DSA templates' : 'Snippets are only available for .js files'}
                  >
                    <span className={`btn__chevron ${snippetsOpen && canUseSnippets ? 'btn__chevron--open' : ''}`}>›</span>
                    Snippets
                  </button>
                  <div className="panel-toolbar__right">
                    <span className="hint">{runHint}</span>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={lineWrap}
                        onChange={(event) => setLineWrap(event.target.checked)}
                      />
                      Line wrap
                    </label>
                    <button
                      type="button"
                      className="btn btn--chat"
                      onClick={openLearnChat}
                      title="Open learning assistant"
                      aria-label="Open learning assistant"
                    >
                      <ChatIcon />
                      <span>Chat</span>
                    </button>
                    <button type="button" className="btn" onClick={() => void handleSave()}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => void handleRun()}
                      disabled={!canRun}
                      title={runTitle}
                    >
                      Run
                    </button>
                  </div>
                </div>
                {snippetsOpen && canUseSnippets ? (
                  <div className="snippet-bar">
                    <label className="select-label">
                      Examples
                      <select
                        value={selectedExample}
                        onChange={(event) => handleExampleChange(event.target.value)}
                      >
                        <option value="">Choose a snippet…</option>
                        {EXAMPLE_SNIPPETS.map((snippet) => (
                          <option key={snippet.id} value={snippet.id}>
                            {snippet.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="select-label">
                      DSA Topic
                      <select
                        value={selectedDsaCategory}
                        onChange={(event) => handleDsaCategoryChange(event.target.value)}
                      >
                        <option value="">Choose a topic…</option>
                        {DSA_CATEGORIES.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="select-label">
                      DSA Template
                      <select
                        value={selectedDsaSnippet}
                        onChange={(event) => handleDsaSnippetChange(event.target.value)}
                        disabled={!activeDsaCategory}
                      >
                        <option value="">
                          {activeDsaCategory ? 'Choose a template…' : 'Pick a topic first'}
                        </option>
                        {activeDsaCategory?.snippets.map((snippet) => (
                          <option key={snippet.id} value={snippet.id}>
                            {snippet.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
              <CodeEditor
                ref={editorRef}
                value={workspace.code}
                onChange={workspace.updateCode}
                lineWrap={lineWrap}
                language={editorLanguage}
                siblingFiles={siblingFiles}
                onRun={(code) => {
                  void handleRun(code);
                }}
                canRun={canRun}
              />
            </div>
          </div>
        }
        right={
          <OutputTabs
            outputLines={lines}
            runOutcome={runOutcome}
            terminalLines={repl.lines}
            terminalBusy={repl.busy}
            webViewHtml={webViewHtml}
            activeTab={outputTab}
            onActiveTabChange={setOutputTab}
            onClearConsole={clear}
            onClearTerminal={repl.clear}
            onClearWebView={clearWebView}
            onResetTerminal={repl.resetSession}
            onTerminalExec={repl.exec}
            onTerminalPreviousInput={repl.getPreviousInput}
            onTerminalNextInput={repl.getNextInput}
          />
        }
      />
      </main>
      <LearnChatPanel open={chatOpen} context={chatContext} onClose={() => setChatOpen(false)} />
    </div>
  );
}

function AuthenticatedApp() {
  const auth = useAuth();
  const { toast } = useUi();

  if (!auth.ready) {
    return (
      <div className="app app--loading" role="status" aria-live="polite">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <AuthModal
        open={auth.showModal}
        onGuest={auth.continueAsGuest}
        onClose={auth.continueAsGuest}
        onCredential={(credential) => {
          try {
            auth.handleCredential(credential);
            toast.success('Signed in with Google');
          } catch (error) {
            console.error(error);
            toast.error('Google sign-in failed. Please try again.');
          }
        }}
      />
      <AppContent key={auth.workspaceScope} auth={auth} />
    </>
  );
}

function App() {
  return (
    <UiProvider>
      <AuthenticatedApp />
    </UiProvider>
  );
}

export default App;
