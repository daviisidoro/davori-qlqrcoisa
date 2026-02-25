// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/auth.service'
import { AppError } from '../utils/AppError'
import { env } from '../config/env'

// ── Schemas de validação ──────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido').toLowerCase(),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
  role: z.enum(['PRODUCER', 'STUDENT']).optional(),
})

const loginSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase(),
  password: z.string().min(1, 'Senha é obrigatória'),
})

// Cookie config para refresh token (httpOnly)
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias em ms
  path: '/api/auth',
}

// ── POST /auth/register ───────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body)
    const { user, tokens } = await authService.register(body)

    // Refresh token em cookie httpOnly (mais seguro que localStorage)
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    return res.status(201).json({
      user,
      accessToken: tokens.accessToken,
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /auth/login ──────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)
    const { user, tokens } = await authService.login(body)

    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    return res.status(200).json({
      user,
      accessToken: tokens.accessToken,
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /auth/refresh ────────────────────────────────────────
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken
    if (!refreshToken) throw AppError.unauthorized('Refresh token não fornecido.')

    const tokens = await authService.refreshTokens(refreshToken)

    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    return res.status(200).json({ accessToken: tokens.accessToken })
  } catch (err) {
    next(err)
  }
}

// ── POST /auth/logout ─────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken
    if (refreshToken) {
      await authService.logout(refreshToken)
    }

    res.clearCookie('refreshToken', { path: '/api/auth' })
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// ── POST /auth/logout-all ─────────────────────────────────────
export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub
    await authService.logoutAll(userId)

    res.clearCookie('refreshToken', { path: '/api/auth' })
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// ── GET /auth/me ──────────────────────────────────────────────
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub
    const user = await authService.getMe(userId)
    return res.status(200).json({ user })
  } catch (err) {
    next(err)
  }
}
