import { useEffect, useRef, useState } from 'react';
import type { AuthUser } from '../../types/auth';
import './UserMenu.css';

type UserMenuProps = {
  user: AuthUser;
  onLogout: () => void;
};

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {user.picture ? (
          <img src={user.picture} alt="" className="user-menu__avatar" referrerPolicy="no-referrer" />
        ) : (
          <span className="user-menu__avatar user-menu__avatar--fallback" aria-hidden>
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="user-menu__name">{user.name}</span>
        <span className="user-menu__caret" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__email">{user.email}</div>
          <button
            type="button"
            className="user-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
