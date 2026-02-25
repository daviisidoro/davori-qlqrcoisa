// src/__tests__/setup.ts
// Carregado antes de cada suite de testes

import { prisma } from '../config/prisma'

// Limpa tabelas relevantes antes de cada teste
beforeEach(async () => {
  // Ordem importante: tabelas com FK primeiro
  await prisma.refreshToken.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.affiliateLink.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
