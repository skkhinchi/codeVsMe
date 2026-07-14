import { useEffect, useId, useRef } from 'react';
import './AuthModal.css';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

type AuthModalProps = {
  open: boolean;
  onGuest: () => void;
  onCredential: (credential: string) => void;
  onClose: () => void;
};

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export function AuthModal({ open, onGuest, onCredential, onClose }: AuthModalProps) {
  const titleId = useId();
  const buttonHostRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    void loadGisScript()
      .then(() => {
        if (cancelled || !buttonHostRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonHostRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonHostRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 280,
        });
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const missingClientId = GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID');

  return (
    <div className="auth-overlay" onClick={onClose} role="presentation">
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-modal__close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        <div className="auth-modal__brand">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="auth-modal__logo" />
          <h2 className="auth-modal__title" id={titleId}>
            Welcome to Code v/s Me
          </h2>
          <p className="auth-modal__subtitle">
            Sign in to keep your workspace private to your account, or continue as a guest.
          </p>
        </div>

        <div className="auth-modal__google" ref={buttonHostRef} />

        {missingClientId ? (
          <p className="auth-modal__hint">
            Set <code>VITE_GOOGLE_CLIENT_ID</code> in a <code>.env</code> file to enable Google sign-in.
          </p>
        ) : null}

        <div className="auth-modal__divider">
          <span>or</span>
        </div>

        <button type="button" className="btn btn--primary auth-modal__guest" onClick={onGuest}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
