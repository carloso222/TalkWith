import { Navigate, useParams } from 'react-router'
import { channelService } from '../../services'
import CanalTexto from './CanalTexto'
import CanalVoz from '../voice/CanalVoz'

/** /app/s/:serverId/c/:channelId — elige la vista según el tipo de canal. */
export default function Canal() {
  const { serverId, channelId = '' } = useParams()
  const canal = channelService.find(channelId)
  if (!canal || canal.servidorId !== serverId) return <Navigate to="/404" replace />
  return canal.tipo === 'voz' ? <CanalVoz canal={canal} /> : <CanalTexto canal={canal} />
}
