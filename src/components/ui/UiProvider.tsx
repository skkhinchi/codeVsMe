import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import './ui.css';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  leaving?: boolean;
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PromptOptions = {
  title: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  submitLabel?: string;
};

type ToastInput = string | { title?: string; message: string };

type UiContextValue = {
  toast: {
    success: (input: ToastInput) => void;
    error: (input: ToastInput) => void;
    info: (input: ToastInput) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const UiContext = createContext<UiContextValue | null>(null);

const TOAST_DURATION_MS = 3400;
const TOAST_EXIT_MS = 280;

function normalizeToast(input: ToastInput, variant: ToastVariant): { title: string; message: string } {
  if (typeof input === 'string') {
    const title = variant === 'success' ? 'Success' : variant === 'error' ? 'Error' : 'Info';
    return { title, message: input };
  }
  const fallbackTitle = variant === 'success' ? 'Success' : variant === 'error' ? 'Error' : 'Info';
  return { title: input.title ?? fallbackTitle, message: input.message };
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') {
    return (
      <span className="ui-toast__icon" aria-hidden>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M6.4 11.3 3.2 8.1l1.1-1.1 2.1 2.1 5.3-5.3 1.1 1.1-6.4 6.4Z" />
        </svg>
      </span>
    );
  }
  if (variant === 'error') {
    return (
      <span className="ui-toast__icon" aria-hidden>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3.25h1.5v5h-1.5v-5Zm.75 7.5a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="ui-toast__icon" aria-hidden>
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3h1.5v1.5h-1.5V4.5ZM7.25 7.5h1.5V12h-1.5V7.5Z" />
      </svg>
    </span>
  );
}

export function UiProvider({ children }: { children: ReactNode }) {
  const titleId = useId();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: true }) | null>(null);
  const [promptState, setPromptState] = useState<(PromptOptions & { open: true; value: string }) | null>(null);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const promptResolver = useRef<((value: string | null) => void) | null>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearToastTimers = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearToastTimers(id);
      setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
      const exitTimer = window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        timersRef.current.delete(id);
      }, TOAST_EXIT_MS);
      timersRef.current.set(id, exitTimer);
    },
    [clearToastTimers],
  );

  const pushToast = useCallback(
    (input: ToastInput, variant: ToastVariant) => {
      const id = crypto.randomUUID();
      const { title, message } = normalizeToast(input, variant);
      setToasts((prev) => [...prev, { id, title, message, variant }]);
      const timer = window.setTimeout(() => removeToast(id), TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) window.clearTimeout(timer);
      timersRef.current.clear();
    };
  }, []);

  const toast = {
    success: (input: ToastInput) => pushToast(input, 'success'),
    error: (input: ToastInput) => pushToast(input, 'error'),
    info: (input: ToastInput) => pushToast(input, 'info'),
  };

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState(null);
    confirmResolver.current?.(result);
    confirmResolver.current = null;
  }, []);

  const closePrompt = useCallback((result: string | null) => {
    setPromptState(null);
    promptResolver.current?.(result);
    promptResolver.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState({ ...options, open: true });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      promptResolver.current = resolve;
      setPromptState({
        ...options,
        open: true,
        value: options.defaultValue ?? '',
      });
    });
  }, []);

  const promptIsOpen = promptState !== null;

  useEffect(() => {
    if (!promptIsOpen) return;
    const frame = window.requestAnimationFrame(() => {
      promptInputRef.current?.focus();
      promptInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [promptIsOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (promptState) closePrompt(null);
      else if (confirmState) closeConfirm(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeConfirm, closePrompt, confirmState, promptState]);

  const handlePromptSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!promptState) return;
    const trimmed = promptState.value.trim();
    if (!trimmed) return;
    closePrompt(trimmed);
  };

  return (
    <UiContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      <div className="ui-toast-host" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`ui-toast ui-toast--${item.variant}${item.leaving ? ' ui-toast--leaving' : ''}`}
            role="status"
            style={{ ['--toast-duration' as string]: `${TOAST_DURATION_MS}ms` }}
          >
            <span className="ui-toast__accent" aria-hidden />
            <ToastIcon variant={item.variant} />
            <div className="ui-toast__body">
              <p className="ui-toast__title">{item.title}</p>
              <p className="ui-toast__message">{item.message}</p>
            </div>
            <button
              type="button"
              className="ui-toast__close"
              aria-label="Dismiss"
              onClick={() => removeToast(item.id)}
            >
              ×
            </button>
            <div className="ui-toast__progress" aria-hidden>
              <div className="ui-toast__progress-bar" />
            </div>
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="ui-overlay" onClick={() => closeConfirm(false)}>
          <div
            className="ui-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="ui-modal__title" id={titleId}>
              {confirmState.title}
            </h3>
            <p className="ui-modal__message">{confirmState.message}</p>
            <div className="ui-modal__actions">
              <button type="button" className="btn" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={`btn ${confirmState.danger ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {promptState ? (
        <div className="ui-overlay" onClick={() => closePrompt(null)}>
          <div
            className="ui-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="ui-modal__title" id={titleId}>
              {promptState.title}
            </h3>
            <form className="ui-modal__form" onSubmit={handlePromptSubmit}>
              <label className="ui-modal__label">
                {promptState.label}
                <input
                  ref={promptInputRef}
                  className="ui-modal__input"
                  value={promptState.value}
                  placeholder={promptState.placeholder}
                  onChange={(event) =>
                    setPromptState((prev) => (prev ? { ...prev, value: event.target.value } : prev))
                  }
                />
              </label>
              <div className="ui-modal__actions">
                <button type="button" className="btn" onClick={() => closePrompt(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={!promptState.value.trim()}>
                  {promptState.submitLabel ?? 'OK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </UiContext.Provider>
  );
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi must be used within UiProvider');
  return context;
}
