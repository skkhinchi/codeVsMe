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
  message: string;
  variant: ToastVariant;
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

type UiContextValue = {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const UiContext = createContext<UiContextValue | null>(null);

const TOAST_DURATION_MS = 3200;

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') return <span className="ui-toast__icon ui-toast__icon--success">✓</span>;
  if (variant === 'error') return <span className="ui-toast__icon ui-toast__icon--error">!</span>;
  return <span className="ui-toast__icon ui-toast__icon--info">i</span>;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const titleId = useId();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: true }) | null>(null);
  const [promptState, setPromptState] = useState<(PromptOptions & { open: true; value: string }) | null>(null);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const promptResolver = useRef<((value: string | null) => void) | null>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    },
    [removeToast],
  );

  const toast = {
    success: (message: string) => pushToast(message, 'success'),
    error: (message: string) => pushToast(message, 'error'),
    info: (message: string) => pushToast(message, 'info'),
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

  useEffect(() => {
    if (!promptState) return;
    promptInputRef.current?.focus();
    promptInputRef.current?.select();
  }, [promptState]);

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
          <div key={item.id} className={`ui-toast ui-toast--${item.variant}`} role="status">
            <ToastIcon variant={item.variant} />
            <span className="ui-toast__message">{item.message}</span>
            <button
              type="button"
              className="ui-toast__close"
              aria-label="Dismiss"
              onClick={() => removeToast(item.id)}
            >
              ×
            </button>
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
