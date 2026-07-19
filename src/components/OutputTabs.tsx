import { useEffect, useState } from 'react';
import { OutputPanel } from './OutputPanel';
import { TerminalPanel } from './TerminalPanel';
import { WebViewPanel } from './WebViewPanel';
import type { OutputLine, RunOutcome } from '../hooks/useCodeRunner';
import type { TerminalLine } from '../hooks/useRepl';

export type OutputTab = 'console' | 'terminal' | 'webview';

type OutputTabsProps = {
  outputLines: OutputLine[];
  runOutcome: RunOutcome;
  terminalLines: TerminalLine[];
  terminalBusy: boolean;
  webViewHtml: string | null;
  activeTab: OutputTab;
  onActiveTabChange: (tab: OutputTab) => void;
  onClearConsole: () => void;
  onClearTerminal: () => void;
  onClearWebView: () => void;
  onResetTerminal: () => void;
  onTerminalExec: (input: string) => void;
  onTerminalPreviousInput: () => string;
  onTerminalNextInput: () => string;
};

export function OutputTabs({
  outputLines,
  runOutcome,
  terminalLines,
  terminalBusy,
  webViewHtml,
  activeTab,
  onActiveTabChange,
  onClearConsole,
  onClearTerminal,
  onClearWebView,
  onResetTerminal,
  onTerminalExec,
  onTerminalPreviousInput,
  onTerminalNextInput,
}: OutputTabsProps) {
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (webViewHtml) setReloadKey((key) => key + 1);
  }, [webViewHtml]);

  const handleClear = () => {
    if (activeTab === 'console') onClearConsole();
    else if (activeTab === 'terminal') onClearTerminal();
    else onClearWebView();
  };

  return (
    <div className="panel panel--output">
      <div className="panel-toolbar panel-toolbar--output">
        <div className="output-tabs" role="tablist" aria-label="Output panels">
          <button
            type="button"
            role="tab"
            id="output-tab-console"
            aria-selected={activeTab === 'console'}
            aria-controls="output-panel-console"
            className={`output-tabs__tab ${activeTab === 'console' ? 'output-tabs__tab--active' : ''}`}
            onClick={() => onActiveTabChange('console')}
          >
            Console
          </button>
          <button
            type="button"
            role="tab"
            id="output-tab-terminal"
            aria-selected={activeTab === 'terminal'}
            aria-controls="output-panel-terminal"
            className={`output-tabs__tab ${activeTab === 'terminal' ? 'output-tabs__tab--active' : ''}`}
            onClick={() => onActiveTabChange('terminal')}
          >
            Terminal
          </button>
          <button
            type="button"
            role="tab"
            id="output-tab-webview"
            aria-selected={activeTab === 'webview'}
            aria-controls="output-panel-webview"
            className={`output-tabs__tab ${activeTab === 'webview' ? 'output-tabs__tab--active' : ''}`}
            onClick={() => onActiveTabChange('webview')}
          >
            Web View
          </button>
        </div>
        <div className="panel-toolbar__right">
          {activeTab === 'terminal' ? (
            <button type="button" className="btn btn--small" onClick={onResetTerminal}>
              Reset session
            </button>
          ) : null}
          {activeTab === 'webview' && webViewHtml ? (
            <button type="button" className="btn btn--small" onClick={() => setReloadKey((key) => key + 1)}>
              Reload
            </button>
          ) : null}
          <button type="button" className="btn btn--small" onClick={handleClear} aria-label={`Clear ${activeTab === 'webview' ? 'web view' : activeTab}`}>
            Clear
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id={activeTab === 'console' ? 'output-panel-console' : activeTab === 'terminal' ? 'output-panel-terminal' : 'output-panel-webview'}
        aria-labelledby={activeTab === 'console' ? 'output-tab-console' : activeTab === 'terminal' ? 'output-tab-terminal' : 'output-tab-webview'}
      >
        {activeTab === 'console' ? (
          <OutputPanel lines={outputLines} runOutcome={runOutcome} />
        ) : activeTab === 'terminal' ? (
          <TerminalPanel
            lines={terminalLines}
            busy={terminalBusy}
            onExec={onTerminalExec}
            onPreviousInput={onTerminalPreviousInput}
            onNextInput={onTerminalNextInput}
          />
        ) : (
          <WebViewPanel key={reloadKey} html={webViewHtml} />
        )}
      </div>
    </div>
  );
}
