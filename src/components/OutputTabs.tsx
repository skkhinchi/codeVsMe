import { useState } from 'react';
import { OutputPanel } from './OutputPanel';
import { TerminalPanel } from './TerminalPanel';
import type { OutputLine } from '../hooks/useCodeRunner';
import type { TerminalLine } from '../hooks/useRepl';

type OutputTab = 'console' | 'terminal';

type OutputTabsProps = {
  outputLines: OutputLine[];
  terminalLines: TerminalLine[];
  terminalBusy: boolean;
  onClearConsole: () => void;
  onClearTerminal: () => void;
  onResetTerminal: () => void;
  onTerminalExec: (input: string) => void;
  onTerminalPreviousInput: () => string;
  onTerminalNextInput: () => string;
};

export function OutputTabs({
  outputLines,
  terminalLines,
  terminalBusy,
  onClearConsole,
  onClearTerminal,
  onResetTerminal,
  onTerminalExec,
  onTerminalPreviousInput,
  onTerminalNextInput,
}: OutputTabsProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>('console');

  const handleClear = () => {
    if (activeTab === 'console') onClearConsole();
    else onClearTerminal();
  };

  return (
    <div className="panel panel--output">
      <div className="panel-toolbar panel-toolbar--output">
        <div className="output-tabs">
          <button
            type="button"
            className={`output-tabs__tab ${activeTab === 'console' ? 'output-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            Console
          </button>
          <button
            type="button"
            className={`output-tabs__tab ${activeTab === 'terminal' ? 'output-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal
          </button>
        </div>
        <div className="panel-toolbar__right">
          {activeTab === 'terminal' ? (
            <button type="button" className="btn btn--small" onClick={onResetTerminal}>
              Reset session
            </button>
          ) : null}
          <button type="button" className="btn btn--small" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {activeTab === 'console' ? (
        <OutputPanel lines={outputLines} />
      ) : (
        <TerminalPanel
          lines={terminalLines}
          busy={terminalBusy}
          onExec={onTerminalExec}
          onPreviousInput={onTerminalPreviousInput}
          onNextInput={onTerminalNextInput}
        />
      )}
    </div>
  );
}
