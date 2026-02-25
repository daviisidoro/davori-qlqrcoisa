// src/controllers/webhooks.controller.ts
import { Request, Response, NextFunction } from 'express'
import { verifyWebhookSignature } from '../services/pagarme.service'
import { handlePaymentSuccess } from '../services/orders.service'
import { logger } from '../config/logger'
import { env } from '../config/env'

// POST /webhooks/payment
// Recebe eventos do Pagar.me e processa de forma idempotente
export async function handlePaymentWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Verificar assinatura HMAC para garantir autenticidade
    const signature = req.headers['x-pagarme-signature'] as string

    if (env.NODE_ENV === 'production') {
      const rawBody = (req as any).rawBody as string
      if (!signature || !verifyWebhookSignature(rawBody, signature)) {
        logger.warn('Webhook recebido com assinatura inválida')
        return res.status(401).json({ error: 'Assinatura inválida.' })
      }
    }

    const event = req.body

    logger.info(`Webhook recebido: type=${event.type} | id=${event.id}`)

    // 2. Processar evento conforme o tipo
    switch (event.type) {
      case 'order.paid': {
        const { id: gatewayOrderId } = event.data
        await handlePaymentSuccess('', gatewayOrderId)
        break
      }

      case 'order.payment_failed': {
        // Log apenas — não precisa ação imediata
        logger.warn(`Pagamento falhou: gatewayOrderId=${event.data.id}`)
        break
      }

      case 'order.canceled': {
        logger.info(`Pedido cancelado no gateway: ${event.data.id}`)
        break
      }

      default:
        logger.info(`Webhook ignorado: tipo não mapeado "${event.type}"`)
    }

    // 3. Retornar 200 imediatamente — processamento é assíncrono
    return res.status(200).json({ received: true })
  } catch (err) {
    logger.error('Erro ao processar webhook:', err)
    // Retornar 200 mesmo em erro para o gateway não retentar indefinidamente
    // O erro será tratado internamente via logs/alertas
    return res.status(200).json({ received: true, warning: 'Erro interno, verificar logs.' })
  }
}
