// src/controllers/orders.controller.ts
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as ordersService from '../services/orders.service'

const createOrderSchema = z.object({
  productId: z.string().uuid('ID de produto inválido'),
  paymentMethod: z.enum(['CARD', 'PIX', 'BOLETO']),
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    document: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos'),
  }),
  card: z.object({
    token: z.string(),
    installments: z.number().int().min(1).max(12).optional(),
  }).optional(),
  affiliateCode: z.string().optional(),
}).refine(
  (data) => data.paymentMethod !== 'CARD' || !!data.card,
  { message: 'Token do cartão é obrigatório para pagamento com cartão.', path: ['card'] }
)

// POST /orders
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createOrderSchema.parse(req.body)
    const result = await ordersService.createOrder(body)
    return res.status(201).json(result)
  } catch (err) { next(err) }
}

// GET /orders/:id/status
export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.getOrderStatus(req.params.id)
    return res.json({ order })
  } catch (err) { next(err) }
}

// POST /orders/:id/refund
export async function refund(req: Request, res: Response, next: NextFunction) {
  try {
    await ordersService.refundOrder(req.params.id, req.user!.sub)
    return res.status(204).send()
  } catch (err) { next(err) }
}
