import type { EditorTab } from '../types/workspace';

type EditorTabBarProps = {
  tabs: EditorTab[];
  activeTabId: string | null;
  dirtyTabIds: Set<string>;
  breadcrumb: string[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
};

function FileTabIcon() {
  return (
    <svg className="editor-tabs__icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 2 5 5h-5V4ZM8 13h8v2H8v-2Zm0 4h5v2H8v-2Z"
      />
    </svg>
  );
}

export function EditorTabBar({
  tabs,
  activeTabId,
  dirtyTabIds,
  breadcrumb,
  onSelectTab,
  onCloseTab,
}: EditorTabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="editor-tabs">
      <div className="editor-tabs__list" role="tablist" aria-label="Open editors">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const dirty = dirtyTabIds.has(tab.id);

          return (
            <div
              key={tab.id}
              className={`editor-tabs__tab ${active ? 'editor-tabs__tab--active' : ''}`}
              role="tab"
              aria-selected={active}
            >
              <button type="button" className="editor-tabs__tab-btn" onClick={() => onSelectTab(tab.id)}>
                <FileTabIcon />
                <span className="editor-tabs__name">{tab.name}</span>
                {dirty ? <span className="editor-tabs__dirty" aria-label="Unsaved changes" /> : null}
              </button>
              <button
                type="button"
                className="editor-tabs__close"
                aria-label={`Close ${tab.name}`}
                onClick={() => onCloseTab(tab.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {breadcrumb.length > 0 ? (
        <div className="editor-tabs__breadcrumb" aria-label="File path">
          {breadcrumb.map((part, index) => (
            <span key={`${part}-${index}`} className="editor-tabs__crumb">
              {index > 0 ? <span className="editor-tabs__sep">›</span> : null}
              <span>{part}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
