// src/routes/index.ts
import { Router } from 'express'
import authRoutes from './auth.routes'
import productsRoutes from './products.routes'
import ordersRoutes from './orders.routes'
import enrollmentsRoutes from './enrollments.routes'
import webhooksRoutes from './webhooks.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/products', productsRoutes)
router.use('/orders', ordersRoutes)
router.use('/enrollments', enrollmentsRoutes)
router.use('/webhooks', webhooksRoutes)

export default router
