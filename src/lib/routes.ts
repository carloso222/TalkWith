/**
 * Rutas de la aplicación en un solo lugar. Úsalas en <Link to={rutas.canal(id, canal)}>
 * en lugar de escribir las cadenas a mano.
 */
export const DEFAULT_SERVER = 'estudio-diseno'

export const rutas = {
  landing: '/',
  login: '/login',
  registro: '/registro',
  inicio: '/app',
  servidores: '/app/servidores',
  crearServidor: '/app/servidores/nuevo',
  unirse: '/app/unirse',
  buscar: (q = '') => (q ? `/app/buscar?q=${encodeURIComponent(q)}` : '/app/buscar'),
  perfil: '/app/perfil',
  canal: (serverId: string, canalId: string) => `/app/s/${serverId}/c/${canalId}`,
  sesiones: (serverId: string) => `/app/s/${serverId}/sesiones`,
  sesion: (serverId: string, sesionId: string) => `/app/s/${serverId}/sesiones/${sesionId}`,
  grabaciones: (serverId: string) => `/app/s/${serverId}/grabaciones`,
  ajustes: (serverId: string, seccion: '' | 'canales' | 'miembros' | 'eliminar' = '') =>
    `/app/s/${serverId}/ajustes${seccion ? `/${seccion}` : ''}`,
}
