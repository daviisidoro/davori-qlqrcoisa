// src/routes/webhooks.routes.ts
import { Router } from 'express'
import { handlePaymentWebhook } from '../controllers/webhooks.controller'

const router = Router()

// IMPORTANTE: raw body necessário para verificação HMAC
// Configurado no app.ts antes do express.json()
router.post('/payment', handlePaymentWebhook)

export default router
