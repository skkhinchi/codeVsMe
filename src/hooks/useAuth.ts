import { useCallback, useEffect, useState } from 'react';
import {
  clearAuthSession,
  readContinueAsGuest,
  readCurrentUser,
  writeContinueAsGuest,
  writeCurrentUser,
} from '../auth/authStorage';
import { authUserFromCredential } from '../auth/jwt';
import { setWorkspaceScope, workspaceScopeFromEmail } from '../storage/workspaceDb';
import type { AuthUser } from '../types/auth';

export type AuthApi = {
  ready: boolean;
  user: AuthUser | null;
  isGuest: boolean;
  showModal: boolean;
  workspaceScope: string;
  openModal: () => void;
  continueAsGuest: () => void;
  handleCredential: (credential: string) => void;
  logout: () => void;
};

export function useAuth(): AuthApi {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const saved = readCurrentUser();
    const guest = readContinueAsGuest();

    if (saved) {
      setWorkspaceScope(workspaceScopeFromEmail(saved.email));
      setUser(saved);
      setShowModal(false);
    } else if (guest) {
      setWorkspaceScope('guest');
      setUser(null);
      setShowModal(false);
    } else {
      setWorkspaceScope('guest');
      setUser(null);
      setShowModal(true);
    }

    setReady(true);
  }, []);

  const workspaceScope = user ? workspaceScopeFromEmail(user.email) : 'guest';

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const continueAsGuest = useCallback(() => {
    writeContinueAsGuest();
    setWorkspaceScope('guest');
    setUser(null);
    setShowModal(false);
  }, []);

  const handleCredential = useCallback((credential: string) => {
    const nextUser = authUserFromCredential(credential);
    writeCurrentUser(nextUser);
    setWorkspaceScope(workspaceScopeFromEmail(nextUser.email));
    setUser(nextUser);
    setShowModal(false);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setWorkspaceScope('guest');
    setUser(null);
    setShowModal(true);
    window.google?.accounts.id.disableAutoSelect();
  }, []);

  return {
    ready,
    user,
    isGuest: !user,
    showModal,
    workspaceScope,
    openModal,
    continueAsGuest,
    handleCredential,
    logout,
  };
}
