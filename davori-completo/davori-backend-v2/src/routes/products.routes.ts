// src/routes/products.routes.ts
import { Router } from 'express'
import * as productsController from '../controllers/products.controller'
import { authenticate, requireRole } from '../middlewares/auth.middleware'
import { optionalAuth } from '../middlewares/auth.middleware'

const router = Router()

// Rota pública — página de vendas
router.get('/slug/:slug', optionalAuth, productsController.getBySlug)

// Rotas do produtor
router.use(authenticate, requireRole('PRODUCER', 'ADMIN'))
router.get('/', productsController.list)
router.post('/', productsController.create)
router.patch('/:id', productsController.update)
router.delete('/:id', productsController.remove)

export default router
