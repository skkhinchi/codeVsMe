type ChatIconProps = {
  className?: string;
};

export function ChatIcon({ className }: ChatIconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 9.5H17M7 13.5H13.5M6.2 19L7.5 15.8C5.1 14.4 3.5 11.9 3.5 9C3.5 5.1 7.1 2 11.5 2C15.9 2 19.5 5.1 19.5 9C19.5 12.9 15.9 16 11.5 16H9.8L6.2 19Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
