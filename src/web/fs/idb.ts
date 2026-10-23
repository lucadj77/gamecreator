// Database del browser per ciò che l'app desktop tiene nei suoi dati: le cartelle autorizzate
// (handle della File System Access API) e i progetti recenti con le miniature.

const DB_NAME = 'stella'
const VERSION = 1
export const ROOTS = 'roots'
export const RECENT = 'recent'

let opening: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(ROOTS)) d.createObjectStore(ROOTS)
      if (!d.objectStoreNames.contains(RECENT)) d.createObjectStore(RECENT)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return opening
}

function done<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return (await db()).transaction(name, mode).objectStore(name)
}

export async function getAll<T>(name: string): Promise<{ key: string; value: T }[]> {
  const s = await store(name, 'readonly')
  const [keys, values] = await Promise.all([done(s.getAllKeys()), done(s.getAll())])
  return keys.map((key, i) => ({ key: String(key), value: values[i] as T }))
}

export async function get<T>(name: string, key: string): Promise<T | undefined> {
  return done((await store(name, 'readonly')).get(key)) as Promise<T | undefined>
}

export async function put(name: string, key: string, value: unknown): Promise<void> {
  await done((await store(name, 'readwrite')).put(value, key))
}

export async function del(name: string, key: string): Promise<void> {
  await done((await store(name, 'readwrite')).delete(key))
}
