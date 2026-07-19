type WebViewPanelProps = {
  html: string | null;
};

export function WebViewPanel({ html }: WebViewPanelProps) {
  if (!html) {
    return (
      <div className="webview-panel webview-panel--empty">
        <p>Run an <code>.html</code> or <code>.css</code> file to preview it here.</p>
        <p className="webview-panel__hint">
          Linked <code>.js</code> / <code>.css</code> files in the same folder are resolved automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="webview-panel">
      <iframe
        className="webview-panel__frame"
        title="Web preview"
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        srcDoc={html}
      />
    </div>
  );
}
