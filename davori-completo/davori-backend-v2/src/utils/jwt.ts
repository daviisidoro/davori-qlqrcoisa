// src/utils/jwt.ts
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env'

export interface JwtPayload {
  sub: string       // user id
  email: string
  role: string
  type: 'access' | 'refresh'
}

// Gera access token (curta duração: 15min)
export function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  )
}

// Gera refresh token (longa duração: 30 dias)
export function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  )
}

// Verifica e decodifica access token
export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload
  if (decoded.type !== 'access') {
    throw new Error('Token inválido')
  }
  return decoded
}

// Verifica e decodifica refresh token
export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload
  if (decoded.type !== 'refresh') {
    throw new Error('Token inválido')
  }
  return decoded
}

// Calcula data de expiração do refresh token (30 dias)
export function getRefreshTokenExpiry(): Date {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 30
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

// Gera token aleatório opaco (para uso futuro: email verification, etc.)
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
