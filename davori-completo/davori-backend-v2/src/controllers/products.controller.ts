// src/controllers/products.controller.ts
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as productsService from '../services/products.service'

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive('Preço deve ser positivo'),
  type: z.enum(['COURSE', 'EBOOK', 'MENTORING', 'WORKSHOP']),
})

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().positive().optional(),
  coverUrl: z.string().url().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
})

// POST /products
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body)
    const product = await productsService.createProduct(req.user!.sub, body)
    return res.status(201).json({ product })
  } catch (err) { next(err) }
}

// GET /products
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productsService.listByProducer(req.user!.sub)
    return res.json({ products })
  } catch (err) { next(err) }
}

// GET /products/:slug (público)
export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.getBySlug(req.params.slug)
    return res.json({ product })
  } catch (err) { next(err) }
}

// PATCH /products/:id
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateSchema.parse(req.body)
    const product = await productsService.updateProduct(req.params.id, req.user!.sub, body)
    return res.json({ product })
  } catch (err) { next(err) }
}

// DELETE /products/:id
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await productsService.deleteProduct(req.params.id, req.user!.sub)
    return res.status(204).send()
  } catch (err) { next(err) }
}
