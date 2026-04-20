import PocketBase from 'pocketbase'

const url = import.meta.env.VITE_POCKETBASE_URL ?? ''

export function isPocketBaseConfigured(): boolean {
  return url.length > 0
}

let _pb: PocketBase | null = null

export function getPocketBase(): PocketBase {
  if (!_pb) _pb = new PocketBase(url)
  return _pb
}
