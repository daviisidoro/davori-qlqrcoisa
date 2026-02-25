// src/routes/auth.routes.ts
import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authLimiter } from '../middlewares/rateLimiter'

const router = Router()

// Rotas públicas (com rate limit estrito)
router.post('/register', authLimiter, authController.register)
router.post('/login', authLimiter, authController.login)
router.post('/refresh', authController.refresh)

// Rotas protegidas
router.post('/logout', authController.logout)
router.post('/logout-all', authenticate, authController.logoutAll)
router.get('/me', authenticate, authController.me)

export default router
