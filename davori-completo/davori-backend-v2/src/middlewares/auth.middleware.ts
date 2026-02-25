// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, JwtPayload } from '../utils/jwt'
import { AppError } from '../utils/AppError'

// Extende o tipo Request do Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ── Middleware: requer autenticação ───────────────────────────
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Token de autenticação não fornecido.')
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    req.user = payload

    next()
  } catch (err: any) {
    if (err instanceof AppError) return next(err)
    // JWT expirado ou inválido
    next(AppError.unauthorized('Token inválido ou expirado.'))
  }
}

// ── Middleware: requer role específica ────────────────────────
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Não autenticado.'))
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Você não tem permissão para esta ação.'))
    }
    next()
  }
}

// ── Middleware: autenticação opcional ─────────────────────────
// Autentica se token presente, mas não bloqueia se ausente
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      req.user = verifyAccessToken(token)
    }
  } catch {
    // Silencia erro — usuário fica como anônimo
  }
  next()
}
