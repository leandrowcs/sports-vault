import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { firebaseAuth, googleProvider, isFirebaseConfigured } from '../services/firebase'

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
])

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no Firebase. Adicione-o em Authentication > Settings > Authorized domains.'
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet e tente novamente.'
    default:
      return 'Não foi possível entrar com Google.'
  }
}

export function useCloudAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseAuth) return

    getRedirectResult(firebaseAuth).catch((err) => setError(mapAuthError(err)))

    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })
  }, [])

  async function signIn() {
    if (!firebaseAuth) return
    setError(null)
    try {
      await signInWithPopup(firebaseAuth, googleProvider)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code && POPUP_FALLBACK_CODES.has(code)) {
        try {
          await signInWithRedirect(firebaseAuth, googleProvider)
        } catch (redirectErr) {
          setError(mapAuthError(redirectErr))
        }
        return
      }
      setError(mapAuthError(err))
    }
  }

  async function signOutUser() {
    if (!firebaseAuth) return
    setError(null)
    try {
      await signOut(firebaseAuth)
    } catch {
      setError('Não foi possível sair da conta.')
    }
  }

  return { error, isConfigured: isFirebaseConfigured, isLoading, signIn, signOut: signOutUser, user }
}