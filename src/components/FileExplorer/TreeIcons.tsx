type IconProps = {
  className?: string;
};

export function NewFileIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1ZM9 2.2 12.3 5.5H9V2.2ZM4 14V2h4v4h4v8H4Z"
      />
      <path fill="currentColor" d="M12.5 10.5h-1v-1h-1v1h-1v1h1v1h1v-1h1v-1Z" />
    </svg>
  );
}

export function NewFolderIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1.75 2A1.75 1.75 0 0 0 0 3.75v8.5C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0 0 16 12.25v-6.5A1.75 1.75 0 0 0 14.25 4H7.5L6.2 2.45A1.75 1.75 0 0 0 4.95 2H1.75Zm0 1.5h3.2c.1 0 .2.04.27.11L6.5 5h7.75a.25.25 0 0 1 .25.25v6.5a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25v-8.5c0-.138.112-.25.25-.25Z"
      />
      <path fill="currentColor" d="M12.5 9.5h-1v-1h-1v1h-1v1h1v1h1v-1h1v-1Z" />
    </svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.5 1.5a6.5 6.5 0 1 0 4.548 11.217.75.75 0 1 0-1.05-1.07A5 5 0 1 1 11.42 4H9.75a.75.75 0 0 0 0 1.5h3.5A.75.75 0 0 0 14 4.75v-3.5a.75.75 0 0 0-1.5 0v1.2A6.48 6.48 0 0 0 8.5 1.5Z"
      />
    </svg>
  );
}

export function CollapseAllIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 9H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Zm-5 3v-2h5v2H4Zm8-8H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1ZM7 7V5h5v2H7Zm4.854 6.146a.5.5 0 0 1-.708.708l-1.5-1.5a.5.5 0 0 1 .708-.708l1.5 1.5Z"
      />
      <path fill="currentColor" d="M13 11.293 11.707 10l-.707.707L12.293 12l-.707.707.707.707L13 12.707l.707.707.707-.707L13.707 12l.707-.707-.707-.707L13 11.293Z" />
    </svg>
  );
}

export function ExpandAllIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 9H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Zm-5 3v-2h5v2H4Zm8-8H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1ZM7 7V5h5v2H7Z"
      />
      <path fill="currentColor" d="M12.5 10v1.5H11v1h1.5V14h1v-1.5H15v-1h-1.5V10h-1Z" />
    </svg>
  );
}
