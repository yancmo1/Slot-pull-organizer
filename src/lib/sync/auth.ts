import { getPocketBase, isPocketBaseConfigured } from './pocketbase'

export async function signIn(email: string, password: string): Promise<void> {
  const pb = getPocketBase()
  await pb.collection('users').authWithPassword(email, password)
}

export function signOut(): void {
  if (!isPocketBaseConfigured()) return
  getPocketBase().authStore.clear()
}

export function isSignedIn(): boolean {
  if (!isPocketBaseConfigured()) return false
  return getPocketBase().authStore.isValid
}

export function getAuthEmail(): string | null {
  if (!isPocketBaseConfigured()) return null
  return (getPocketBase().authStore.record?.email as string | undefined) ?? null
}
