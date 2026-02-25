// src/services/auth.service.ts
import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt'
import { logger } from '../config/logger'

interface RegisterDTO {
  name: string
  email: string
  password: string
  role?: 'PRODUCER' | 'STUDENT'
}

interface LoginDTO {
  email: string
  password: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface UserPublic {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  createdAt: Date
}

// ── Register ─────────────────────────────────────────────────
export async function register(dto: RegisterDTO): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  // Verifica se e-mail já existe
  const existing = await prisma.user.findUnique({ where: { email: dto.email } })
  if (existing) {
    throw AppError.conflict('Este e-mail já está em uso.')
  }

  // Hash da senha
  const passwordHash = await bcrypt.hash(dto.password, env.BCRYPT_SALT_ROUNDS)

  // Cria usuário
  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role ?? 'STUDENT',
    },
  })

  logger.info(`Novo usuário registrado: ${user.email} [${user.role}]`)

  const tokens = await generateAndStoreTokens(user)

  return {
    user: toPublicUser(user),
    tokens,
  }
}

// ── Login ─────────────────────────────────────────────────────
export async function login(dto: LoginDTO): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  // Busca usuário
  const user = await prisma.user.findUnique({ where: { email: dto.email } })

  // Mensagem genérica para não revelar se o e-mail existe
  if (!user || !user.isActive) {
    throw AppError.unauthorized('E-mail ou senha incorretos.')
  }

  // Verifica senha
  const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash)
  if (!passwordMatch) {
    throw AppError.unauthorized('E-mail ou senha incorretos.')
  }

  logger.info(`Login bem-sucedido: ${user.email}`)

  const tokens = await generateAndStoreTokens(user)

  return {
    user: toPublicUser(user),
    tokens,
  }
}

// ── Refresh Tokens ────────────────────────────────────────────
export async function refreshTokens(oldRefreshToken: string): Promise<AuthTokens> {
  // Verifica assinatura JWT
  let payload
  try {
    payload = verifyRefreshToken(oldRefreshToken)
  } catch {
    throw AppError.unauthorized('Refresh token inválido ou expirado.')
  }

  // Verifica se token existe no banco e não foi usado
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true },
  })

  if (!stored || stored.used || stored.expiresAt < new Date()) {
    // Token reutilizado — possível ataque. Invalida todos os tokens do usuário.
    if (stored && stored.used) {
      logger.warn(`Possível reutilização de refresh token detectada para userId: ${stored.userId}`)
      await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } })
    }
    throw AppError.unauthorized('Refresh token inválido ou expirado.')
  }

  // Marca token como usado (rotação)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { used: true },
  })

  // Gera novos tokens
  return generateAndStoreTokens(stored.user)
}

// ── Logout ────────────────────────────────────────────────────
export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
}

// ── Logout de todos os dispositivos ──────────────────────────
export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } })
  logger.info(`Logout em todos os dispositivos: userId ${userId}`)
}

// ── Me (dados do usuário autenticado) ─────────────────────────
export async function getMe(userId: string): Promise<UserPublic> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw AppError.notFound('Usuário não encontrado.')
  return toPublicUser(user)
}

// ── Helpers ───────────────────────────────────────────────────
async function generateAndStoreTokens(user: { id: string; email: string; role: string }): Promise<AuthTokens> {
  const tokenPayload = { sub: user.id, email: user.email, role: user.role }
  const accessToken = generateAccessToken(tokenPayload)
  const refreshToken = generateRefreshToken(tokenPayload)

  // Salva refresh token no banco
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  })

  // Limpa tokens expirados/usados do usuário (housekeeping)
  await prisma.refreshToken.deleteMany({
    where: {
      userId: user.id,
      OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
    },
  })

  return { accessToken, refreshToken }
}

function toPublicUser(user: {
  id: string; name: string; email: string; role: string; avatarUrl: string | null; createdAt: Date
}): UserPublic {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  }
}
