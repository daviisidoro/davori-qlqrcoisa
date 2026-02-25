// src/services/products.service.ts
import { prisma } from '../config/prisma'
import { AppError } from '../utils/AppError'
import { logger } from '../config/logger'
import slugify from 'slugify'

interface CreateProductDTO {
  title: string
  description?: string
  price: number
  type: 'COURSE' | 'EBOOK' | 'MENTORING' | 'WORKSHOP'
}

interface UpdateProductDTO {
  title?: string
  description?: string
  price?: number
  coverUrl?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

// ── Criar produto ─────────────────────────────────────────────
export async function createProduct(producerId: string, dto: CreateProductDTO) {
  // Gera slug único
  let slug = slugify(dto.title, { lower: true, strict: true })
  const existing = await prisma.product.findUnique({ where: { slug } })
  if (existing) slug = `${slug}-${Date.now()}`

  const product = await prisma.product.create({
    data: {
      producerId,
      title: dto.title,
      slug,
      description: dto.description,
      price: dto.price,
      type: dto.type,
    },
  })

  logger.info(`Produto criado: "${product.title}" [${product.id}] por produtor ${producerId}`)
  return product
}

// ── Listar produtos do produtor ───────────────────────────────
export async function listByProducer(producerId: string) {
  return prisma.product.findMany({
    where: { producerId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true, orders: true } },
    },
  })
}

// ── Buscar produto por slug (página pública) ──────────────────
export async function getBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      producer: { select: { id: true, name: true, avatarUrl: true } },
      lessons: {
        where: { isFree: true },
        orderBy: { orderIndex: 'asc' },
        take: 3,
      },
      _count: { select: { enrollments: true } },
    },
  })
  if (!product || product.status !== 'PUBLISHED') {
    throw AppError.notFound('Produto não encontrado.')
  }
  return product
}

// ── Buscar produto por ID (uso interno) ───────────────────────
export async function getById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw AppError.notFound('Produto não encontrado.')
  return product
}

// ── Atualizar produto ─────────────────────────────────────────
export async function updateProduct(id: string, producerId: string, dto: UpdateProductDTO) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw AppError.notFound('Produto não encontrado.')
  if (product.producerId !== producerId) throw AppError.forbidden('Você não é o dono deste produto.')

  return prisma.product.update({ where: { id }, data: dto })
}

// ── Deletar produto ───────────────────────────────────────────
export async function deleteProduct(id: string, producerId: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw AppError.notFound('Produto não encontrado.')
  if (product.producerId !== producerId) throw AppError.forbidden('Você não é o dono deste produto.')

  await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } })
  logger.info(`Produto arquivado: ${id}`)
}
