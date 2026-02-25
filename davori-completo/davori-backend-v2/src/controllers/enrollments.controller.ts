// src/controllers/enrollments.controller.ts
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as enrollmentsService from '../services/enrollments.service'

// GET /enrollments/me
export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const enrollments = await enrollmentsService.listByStudent(req.user!.sub)
    return res.json({ enrollments })
  } catch (err) { next(err) }
}

// POST /progress
export async function markProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      productId: z.string().uuid(),
      lessonId: z.string().uuid(),
    }).parse(req.body)

    const enrollment = await enrollmentsService.updateProgress(
      req.user!.sub,
      body.productId,
      body.lessonId
    )
    return res.json({ enrollment })
  } catch (err) { next(err) }
}
