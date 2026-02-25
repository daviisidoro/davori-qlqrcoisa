// src/app.ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { generalLimiter } from './middlewares/rateLimiter'
import { errorHandler } from './middlewares/errorHandler'
import routes from './routes'
import { env } from './config/env'
import { logger } from './config/logger'

const app = express()

// ── Segurança ─────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true, // necessário para cookies httpOnly
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Rate limiting global ──────────────────────────────────────
app.use(generalLimiter)

// ── rawBody para verificação HMAC do webhook Pagar.me ─────────
app.use((req: any, _res: express.Response, next: express.NextFunction) => {
  let data = ''
  req.on('data', (chunk: any) => { data += chunk })
  req.on('end', () => { req.rawBody = data })
  next()
})

// ── Parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    environment: env.NODE_ENV,
  })
})

// ── Rotas da API ──────────────────────────────────────────────
app.use('/api', routes)

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Rota não encontrada: ${req.method} ${req.path}`,
  })
})

// ── Error handler global ──────────────────────────────────────
app.use(errorHandler)

export default app
