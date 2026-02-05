import express from 'express'
import { default as makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import fs from 'fs'

const app = express()
const PORT = process.env.PORT || 3000
app.use(express.static('public'))

let sessionReady = false
let SESSION_BASE64 = ''

async function startSession() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({ auth: state, printQRInTerminal: false })

  sock.ev.on('creds.update', async () => {
    await saveCreds()
    const creds = fs.readFileSync('./session/creds.json')
    SESSION_BASE64 = Buffer.from(creds).toString('base64')
    sessionReady = true
  })

  sock.ev.on('connection.update', async ({ qr }) => {
    if (qr) {
      const img = await qrcode.toDataURL(qr)
      fs.writeFileSync('./public/qr.txt', img)
    }
  })
}

app.get('/qr', (req, res) => {
  if (fs.existsSync('./public/qr.txt')) res.send(fs.readFileSync('./public/qr.txt', 'utf-8'))
  else res.send('')
})

app.get('/session', (req, res) => {
  if (!sessionReady) return res.send('WAIT')
  res.send(SESSION_BASE64)
})

startSession()
app.listen(PORT, () => console.log('Web running on port', PORT))
