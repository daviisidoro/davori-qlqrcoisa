// src/services/pagarme.service.ts
// Adapter para o gateway Pagar.me v5
// Docs: https://docs.pagar.me/reference

import { env } from '../config/env'
import { logger } from '../config/logger'
import { AppError } from '../utils/AppError'

const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

interface PagarmeHeaders {
  'Content-Type': string
  Authorization: string
}

function getHeaders(): PagarmeHeaders {
  // Pagar.me usa Basic Auth com a secret key como usuário
  const token = Buffer.from(`${env.PAGARME_SECRET_KEY}:`).toString('base64')
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${token}`,
  }
}

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${PAGARME_BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json() as any

  if (!res.ok) {
    logger.error('Pagar.me error:', data)
    throw new AppError(
      data.message ?? 'Erro no gateway de pagamento.',
      res.status,
      'PAYMENT_GATEWAY_ERROR'
    )
  }

  return data as T
}

// ── Criar pedido no Pagar.me ──────────────────────────────────
export interface CreateOrderInput {
  amount: number              // em centavos
  paymentMethod: 'credit_card' | 'pix' | 'boleto'
  customer: {
    name: string
    email: string
    document: string          // CPF sem formatação
  }
  items: Array<{
    amount: number
    description: string
    quantity: number
    code: string
  }>
  // Apenas para cartão
  card?: {
    token: string             // token gerado pelo SDK do Pagar.me no frontend
    installments?: number
  }
}

export interface PagarmeOrder {
  id: string
  status: 'pending' | 'paid' | 'canceled' | 'failed'
  code: string
  charges: Array<{
    id: string
    status: string
    payment_method: string
    last_transaction?: {
      qr_code?: string         // PIX
      qr_code_url?: string
      pdf?: string             // Boleto
      barcode?: string
    }
  }>
}

export async function createOrder(input: CreateOrderInput): Promise<PagarmeOrder> {
  const payment =
    input.paymentMethod === 'credit_card'
      ? {
          payment_method: 'credit_card',
          credit_card: {
            recurrence: false,
            installments: input.card?.installments ?? 1,
            card_token: input.card!.token,
          },
        }
      : input.paymentMethod === 'pix'
      ? {
          payment_method: 'pix',
          pix: { expires_in: 3600 }, // 1h para pagar
        }
      : {
          payment_method: 'boleto',
          boleto: { due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }, // 3 dias
        }

  const payload = {
    code: `DAVORI-${Date.now()}`,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      type: 'individual',
      document: input.customer.document,
      document_type: 'CPF',
    },
    items: input.items,
    payments: [{ ...payment, amount: input.amount }],
  }

  return request<PagarmeOrder>('POST', '/orders', payload)
}

// ── Buscar pedido no Pagar.me ─────────────────────────────────
export async function getOrder(gatewayOrderId: string): Promise<PagarmeOrder> {
  return request<PagarmeOrder>('GET', `/orders/${gatewayOrderId}`)
}

// ── Reembolso ─────────────────────────────────────────────────
export async function refundCharge(chargeId: string, amount?: number) {
  return request('POST', `/charges/${chargeId}/cancel`, amount ? { amount } : undefined)
}

// ── Verificar assinatura do webhook (HMAC-SHA256) ─────────────
import crypto from 'crypto'

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!env.PAGARME_WEBHOOK_SECRET) return false
  const expected = crypto
    .createHmac('sha256', env.PAGARME_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
