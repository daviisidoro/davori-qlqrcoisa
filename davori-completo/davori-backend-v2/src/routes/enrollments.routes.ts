// src/routes/enrollments.routes.ts
import { Router } from 'express'
import * as enrollmentsController from '../controllers/enrollments.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/me', enrollmentsController.listMine)
router.post('/progress', enrollmentsController.markProgress)

export default router
