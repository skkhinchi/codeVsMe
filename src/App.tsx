import { useEffect, useRef, useState } from 'react';
import { CodeEditor, type CodeEditorHandle } from './components/CodeEditor';
import { EditorTabBar } from './components/EditorTabBar';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { ChatIcon } from './components/LearnChat/ChatIcon';
import { LearnChatPanel } from './components/LearnChat/LearnChatPanel';
import { OutputTabs } from './components/OutputTabs';
import { SplitPane } from './components/SplitPane';
import { UiProvider, useUi } from './components/ui/UiProvider';
import { DSA_CATEGORIES, EXAMPLE_SNIPPETS } from './data/snippets';
import { useCodeRunner, type OutputLine } from './hooks/useCodeRunner';
import { useLocalFolder } from './hooks/useLocalFolder';
import { useRepl } from './hooks/useRepl';
import { useWorkspace } from './hooks/useWorkspace';
import * as workspaceDb from './storage/workspaceDb';
import type { LearnChatContext } from './types/chat';
import { getTabBreadcrumb } from './utils/editorTabs';
import './App.css';

function formatOutputForChat(lines: OutputLine[]) {
  return lines
    .map((line) => {
      const prefix = line.line !== undefined ? `Line ${line.line}: ` : '';
      return `${prefix}${line.text}`;
    })
    .join('\n');
}

function AppContent() {
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
  const { lines, run, clear } = useCodeRunner();
  const repl = useRepl();

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
    setSnippetsOpenState((prev) => {
      const next = !prev;
      void workspaceDb.setMeta('snippetsOpen', next);
      return next;
    });
  };

  const activeDsaCategory = DSA_CATEGORIES.find((category) => category.id === selectedDsaCategory);

  const handleRun = (source?: string) => {
    run(source ?? editorRef.current?.getCode() ?? workspace.code);
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
    setSelectedExample(snippetId);
    setSelectedDsaCategory('');
    setSelectedDsaSnippet('');
    const snippet = EXAMPLE_SNIPPETS.find((item) => item.id === snippetId);
    if (snippet) void workspace.loadSnippet(snippet.code);
  };

  const handleDsaCategoryChange = (categoryId: string) => {
    setSelectedDsaCategory(categoryId);
    setSelectedDsaSnippet('');
    setSelectedExample('');
  };

  const handleDsaSnippetChange = (snippetId: string) => {
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

  const handleCreateLocalFile = async (parentPath: string | null) => {
    const name = await prompt({
      title: 'New file',
      label: 'File name',
      defaultValue: 'untitled.js',
      submitLabel: 'Create',
    });
    if (!name) return;
    const entry = await localFolder.createLocalFile(name, parentPath);
    if (entry) await handleOpenLocalFile(entry);
  };

  const handleCreateLocalFolder = async (parentPath: string | null) => {
    const name = await prompt({
      title: 'New folder',
      label: 'Folder name',
      defaultValue: 'New Folder',
      submitLabel: 'Create',
    });
    if (!name) return;
    await localFolder.createLocalFolder(name, parentPath);
  };

  if (!workspace.ready || !localFolder.ready || !uiReady) {
    return (
      <div className="app app--loading">
        <p>Loading workspace…</p>
      </div>
    );
  }

  const activeTab = workspace.openTabs.find((tab) => tab.id === workspace.activeTabId) ?? null;
  const tabBreadcrumb = getTabBreadcrumb(activeTab, workspace.nodes, localFolder.folderName);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <img src="/logo.png" alt="Code v/s Me" className="app-header__logo" />
          <div className="app-header__text">
            <h1>Code v/s Me</h1>
            <p>Infinite Challenge. Infinite Growth.</p>
          </div>
        </div>
      </header>

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
              onCreateFile={workspace.createFile}
              onCreateFolder={workspace.createFolder}
              onCreateLocalFile={handleCreateLocalFile}
              onCreateLocalFolder={handleCreateLocalFolder}
              onDeleteWorkspaceNode={workspace.deleteNode}
              onRenameWorkspaceNode={workspace.renameNode}
              onImportFile={(file) => workspace.importFileToWorkspace(file, workspace.selectedFolderId)}
              onOpenLocalFolder={localFolder.openFolder}
              onReconnectLocalFolder={() => void localFolder.reconnectFolder()}
              onDeleteLocalFile={localFolder.deleteLocalFile}
              onDeleteLocalFolder={localFolder.deleteLocalFolder}
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
              <div className={`panel-toolbar ${snippetsOpen ? 'panel-toolbar--stacked' : ''}`}>
                <div className="panel-toolbar__row">
                  <button
                    type="button"
                    className="btn btn--toggle"
                    onClick={toggleSnippets}
                    aria-expanded={snippetsOpen}
                  >
                    <span className={`btn__chevron ${snippetsOpen ? 'btn__chevron--open' : ''}`}>›</span>
                    Snippets
                  </button>
                  <div className="panel-toolbar__right">
                    <span className="hint">Ctrl+Enter / Cmd+Enter</span>
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
                    <button type="button" className="btn btn--primary" onClick={() => handleRun()}>
                      Run
                    </button>
                  </div>
                </div>
                {snippetsOpen ? (
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
                onRun={handleRun}
              />
            </div>
          </div>
        }
        right={
          <OutputTabs
            outputLines={lines}
            terminalLines={repl.lines}
            terminalBusy={repl.busy}
            onClearConsole={clear}
            onClearTerminal={repl.clear}
            onResetTerminal={repl.resetSession}
            onTerminalExec={repl.exec}
            onTerminalPreviousInput={repl.getPreviousInput}
            onTerminalNextInput={repl.getNextInput}
          />
        }
      />
      <LearnChatPanel open={chatOpen} context={chatContext} onClose={() => setChatOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <UiProvider>
      <AppContent />
    </UiProvider>
  );
}

export default App;
