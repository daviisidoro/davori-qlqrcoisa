// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { AppError } from '../utils/AppError'
import { logger } from '../config/logger'
import { env } from '../config/env'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Erro de validação Zod
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return res.status(422).json({
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos.',
      errors,
    })
  }

  // Erro de JWT expirado
  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      code: 'TOKEN_EXPIRED',
      message: 'Token expirado. Faça login novamente.',
    })
  }

  // Erro de JWT inválido
  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Token inválido.',
    })
  }

  // Erro da Prisma: unique constraint
  if ((err as any)?.code === 'P2002') {
    return res.status(409).json({
      code: 'CONFLICT',
      message: 'Este dado já está em uso.',
    })
  }

  // Erro da Prisma: registro não encontrado
  if ((err as any)?.code === 'P2025') {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Registro não encontrado.',
    })
  }

  // Erro de aplicação (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    })
  }

  // Erro inesperado — loga detalhes em produção
  logger.error('Erro inesperado:', err)

  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Ocorreu um erro interno. Tente novamente mais tarde.',
    ...(env.NODE_ENV !== 'production' && { detail: String(err) }),
  })
}
