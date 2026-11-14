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
  /**
   * Documentos hijos directos de la colección, en el orden en que se guardaron en `registro.docs`.
   * Con `collectionGroup` busca en todas las colecciones con ese id y aplica `where` (== y
   * array-contains), `orderBy` y `limit`.
   */
  getDocs: async (ref: { path: string; grupo?: boolean; filtros?: unknown[] }) => {
    fallarSiToca()
    registro.lecturas.push(ref.grupo ? `grupo:${ref.path}` : ref.path)
    const prefijo = `${ref.path}/`
    let entradas = [...registro.docs.entries()].filter(([p, datos]) => {
      if (datos === null) return false
      if (!ref.grupo) return p.startsWith(prefijo) && !p.slice(prefijo.length).includes('/')
      const partes = p.split('/')
      return partes.length >= 2 && partes[partes.length - 2] === ref.path
    }) as [string, Datos][]
    if (ref.grupo) {
      for (const f of (ref.filtros ?? []) as Array<Record<string, unknown>>) {
        if ('campo' in f) {
          const campo = String(f.campo)
          entradas = entradas.filter(([, d]) =>
            f.op === 'array-contains' ? Array.isArray(d[campo]) && (d[campo] as unknown[]).includes(f.valor) : d[campo] === f.valor,
          )
        } else if ('orden' in f) {
          const campo = String(f.orden)
          const valor = (d: Datos) => {
            const v = d[campo] as { toMillis?: () => number } | number | undefined
            return typeof v === 'object' && v?.toMillis ? v.toMillis() : Number(v ?? 0)
          }
          const signo = f.direccion === 'desc' ? -1 : 1
          entradas = [...entradas].sort(([, a], [, b]) => signo * (valor(a) - valor(b)))
        } else if ('limite' in f) {
          entradas = entradas.slice(0, Number(f.limite))
        }
      }
    }
    const docs = entradas.map(([p, datos]) => ({ id: p.split('/').pop()!, exists: () => true, data: () => datos }))
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
