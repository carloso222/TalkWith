/**
 * Doble de `firebase/firestore` para las pruebas unitarias de servicios y escuchas.
 * Uso en cada prueba:
 *   vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
 * y desde la prueba se lee/modifica `registro`. No habla con ninguna red.
 */
type Datos = Record<string, unknown>
export interface Escritura {
  op: 'set' | 'update' | 'delete'
  ruta: string
  datos?: Datos
}
export interface Escucha {
  ruta: string
  grupo: boolean
  filtros: unknown[]
  opciones?: unknown
  siguiente: (snap: unknown) => void
  error: (e: unknown) => void
  cancelada: boolean
}

export const registro = {
  escrituras: [] as Escritura[],
  batches: [] as Escritura[][],
  lecturas: [] as string[],
  docs: new Map<string, Datos | null>(),
  escuchas: [] as Escucha[],
  /** Si se define, la siguiente escritura o commit falla con ese código. */
  falla: null as { code: string } | null,
  autoId: 0,
}

export function reiniciar(): void {
  registro.escrituras = []
  registro.batches = []
  registro.lecturas = []
  registro.docs = new Map()
  registro.escuchas = []
  registro.falla = null
  registro.autoId = 0
}

const esReferencia = (x: unknown): x is { path: string } => typeof x === 'object' && x !== null && 'path' in x

function ruta(base: unknown, partes: string[]): string {
  const prefijo = esReferencia(base) ? [base.path] : []
  return [...prefijo, ...partes].join('/')
}

function fallarSiToca(): void {
  if (!registro.falla) return
  const e = registro.falla
  registro.falla = null
  throw e
}

const marca = (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms), ms })

export const mockFirestore = {
  collection: (base: unknown, ...partes: string[]) => ({ path: ruta(base, partes) }),
  collectionGroup: (_db: unknown, id: string) => ({ path: id, grupo: true, filtros: [] as unknown[] }),
  where: (campo: string, op: string, valor: unknown) => ({ campo, op, valor }),
  orderBy: (campo: string, direccion = 'asc') => ({ orden: campo, direccion }),
  limit: (n: number) => ({ limite: n }),
  increment: (n: number) => ({ incremento: n }),
  query: (ref: { path: string; grupo?: boolean; filtros?: unknown[] }, ...filtros: unknown[]) => ({ ...ref, filtros }),
  doc: (base: unknown, ...partes: string[]) => {
    const p = ruta(base, partes)
    if (partes.length > 0) return { path: p, id: p.split('/').pop()! }
    const id = `auto-${++registro.autoId}`
    return { path: `${p}/${id}`, id }
  },
  serverTimestamp: () => 'MARCA_SERVIDOR',
  Timestamp: { fromMillis: marca, fromDate: (d: Date) => marca(d.getTime()), now: () => marca(Date.now()) },
  getDoc: async (ref: { path: string }) => {
    registro.lecturas.push(ref.path)
    const datos = registro.docs.get(ref.path) ?? null
    return { id: ref.path.split('/').pop(), exists: () => datos !== null, data: () => datos ?? undefined }
  },
  /** Documentos hijos directos de la colección, en el orden en que se guardaron en `registro.docs`. */
  getDocs: async (ref: { path: string }) => {
    fallarSiToca()
    registro.lecturas.push(ref.path)
    const prefijo = `${ref.path}/`
    const docs = [...registro.docs.entries()]
      .filter(([p, datos]) => datos !== null && p.startsWith(prefijo) && !p.slice(prefijo.length).includes('/'))
      .map(([p, datos]) => ({ id: p.split('/').pop()!, exists: () => true, data: () => datos! }))
    return { docs }
  },
  setDoc: async (ref: { path: string }, datos: Datos) => {
    fallarSiToca()
    registro.escrituras.push({ op: 'set', ruta: ref.path, datos })
  },
  updateDoc: async (ref: { path: string }, datos: Datos) => {
    fallarSiToca()
    registro.escrituras.push({ op: 'update', ruta: ref.path, datos })
  },
  deleteDoc: async (ref: { path: string }) => {
    fallarSiToca()
    registro.escrituras.push({ op: 'delete', ruta: ref.path })
  },
  writeBatch: () => {
    const lista: Escritura[] = []
    return {
      set: (ref: { path: string }, datos: Datos) => void lista.push({ op: 'set', ruta: ref.path, datos }),
      update: (ref: { path: string }, datos: Datos) => void lista.push({ op: 'update', ruta: ref.path, datos }),
      commit: async () => {
        fallarSiToca()
        registro.batches.push(lista)
      },
    }
  },
  onSnapshot: (ref: { path: string; grupo?: boolean; filtros?: unknown[] }, ...resto: unknown[]) => {
    const opciones = typeof resto[0] === 'function' ? undefined : resto.shift()
    const [siguiente, error] = resto as [Escucha['siguiente'], Escucha['error']]
    const escucha: Escucha = { ruta: ref.path, grupo: Boolean(ref.grupo), filtros: ref.filtros ?? [], opciones, siguiente, error, cancelada: false }
    registro.escuchas.push(escucha)
    return () => {
      escucha.cancelada = true
    }
  },
}
