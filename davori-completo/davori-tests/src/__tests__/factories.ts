// src/__tests__/factories.ts
import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma'
import { generateAccessToken } from '../utils/jwt'

// ── User factory ──────────────────────────────────────────────
export async function createUser(overrides?: {
  name?: string
  email?: string
  password?: string
  role?: 'PRODUCER' | 'STUDENT' | 'ADMIN'
}) {
  const data = {
    name: overrides?.name ?? 'Test User',
    email: overrides?.email ?? `test-${Date.now()}@davori.com`,
    password: overrides?.password ?? 'Senha123!',
    role: overrides?.role ?? 'STUDENT',
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
      role: data.role as any,
    },
  })

  const accessToken = generateAccessToken({ sub: user.id, email: user.email, role: user.role })

  return { user, accessToken, password: data.password }
}

export async function createProducer(overrides?: { name?: string; email?: string }) {
  return createUser({ ...overrides, role: 'PRODUCER' })
}

export async function createStudent(overrides?: { name?: string; email?: string }) {
  return createUser({ ...overrides, role: 'STUDENT' })
}

// ── Product factory ───────────────────────────────────────────
export async function createProduct(producerId: string, overrides?: {
  title?: string
  price?: number
  status?: 'DRAFT' | 'PUBLISHED'
  type?: 'COURSE' | 'EBOOK'
}) {
  const title = overrides?.title ?? `Produto Teste ${Date.now()}`
  return prisma.product.create({
    data: {
      producerId,
      title,
      slug: title.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, ''),
      price: overrides?.price ?? 197,
      type: (overrides?.type ?? 'COURSE') as any,
      status: (overrides?.status ?? 'PUBLISHED') as any,
    },
  })
}
