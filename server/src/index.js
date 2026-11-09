import { crearServidor } from './app.js'
import { iniciarFirebase } from './firebase.js'

const puerto = Number(process.env.PORT) || 3000
// dominios del frontend que pueden conectarse, separados por coma
const origenes = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const firebase = iniciarFirebase(process.env)
const { http } = crearServidor({ origenes, ...firebase })

http.listen(puerto, () => {
  console.log(`servidor de talkwith en el puerto ${puerto}`)
  console.log(`acepta conexiones de: ${origenes.join(', ')}`)
})
