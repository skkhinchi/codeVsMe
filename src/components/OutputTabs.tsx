import { useEffect, useState } from 'react';
import { EventLoopVisualizer } from './EventLoopVisualizer/EventLoopVisualizer';
import { OutputPanel } from './OutputPanel';
import { TerminalPanel } from './TerminalPanel';
import { WebViewPanel } from './WebViewPanel';
import type { EventLoopVisualizerApi } from '../hooks/useEventLoopVisualizer';
import type { OutputLine, RunOutcome } from '../hooks/useCodeRunner';
import type { TerminalLine } from '../hooks/useRepl';

export type OutputTab = 'console' | 'terminal' | 'webview' | 'visualization';

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
  visualizer: EventLoopVisualizerApi;
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
  visualizer,
}: OutputTabsProps) {
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (webViewHtml) setReloadKey((key) => key + 1);
  }, [webViewHtml]);

  const handleClear = () => {
    if (activeTab === 'console') onClearConsole();
    else if (activeTab === 'terminal') onClearTerminal();
    else if (activeTab === 'webview') onClearWebView();
    else visualizer.clearTrace();
  };

  const tabPanelId =
    activeTab === 'console'
      ? 'output-panel-console'
      : activeTab === 'terminal'
        ? 'output-panel-terminal'
        : activeTab === 'webview'
          ? 'output-panel-webview'
          : 'output-panel-visualization';

  const tabBtnId =
    activeTab === 'console'
      ? 'output-tab-console'
      : activeTab === 'terminal'
        ? 'output-tab-terminal'
        : activeTab === 'webview'
          ? 'output-tab-webview'
          : 'output-tab-visualization';

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
          <button
            type="button"
            role="tab"
            id="output-tab-visualization"
            aria-selected={activeTab === 'visualization'}
            aria-controls="output-panel-visualization"
            className={`output-tabs__tab ${activeTab === 'visualization' ? 'output-tabs__tab--active' : ''}`}
            onClick={() => onActiveTabChange('visualization')}
          >
            Visualization
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
          <button
            type="button"
            className="btn btn--small"
            onClick={handleClear}
            aria-label={`Clear ${activeTab === 'webview' ? 'web view' : activeTab}`}
          >
            Clear
          </button>
        </div>
      </div>

      <div role="tabpanel" id={tabPanelId} aria-labelledby={tabBtnId}>
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
        ) : activeTab === 'webview' ? (
          <WebViewPanel key={reloadKey} html={webViewHtml} />
        ) : (
          <EventLoopVisualizer
            steps={visualizer.steps}
            stepIndex={visualizer.stepIndex}
            currentStep={visualizer.currentStep}
            snapshot={visualizer.snapshot}
            playing={visualizer.playing}
            speed={visualizer.speed}
            recording={visualizer.recording}
            error={visualizer.trace?.error}
            onPlay={() => visualizer.setPlaying(true)}
            onPause={() => visualizer.setPlaying(false)}
            onNext={visualizer.nextStep}
            onPrev={visualizer.prevStep}
            onReset={visualizer.resetPlayback}
            onSpeedChange={visualizer.setSpeed}
            onJump={(index) => visualizer.jumpTo(index)}
          />
        )}
      </div>
    </div>
  );
}
