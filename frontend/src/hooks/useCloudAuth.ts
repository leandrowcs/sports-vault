import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { firebaseAuth, googleProvider, isFirebaseConfigured } from '../services/firebase'

export function useCloudAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseAuth) return

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
    } catch {
      setError('Não foi possível entrar com Google.')
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