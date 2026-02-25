// src/routes/orders.routes.ts
import { Router } from 'express'
import * as ordersController from '../controllers/orders.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', ordersController.create)                         // Público — checkout
router.get('/:id/status', ordersController.getStatus)            // Público — polling
router.post('/:id/refund', authenticate, ordersController.refund) // Autenticado

export default router
