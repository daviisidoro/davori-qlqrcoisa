// src/services/enrollments.service.ts
import { prisma } from '../config/prisma'
import { AppError } from '../utils/AppError'
import { logger } from '../config/logger'
import { sendWelcomeEmail } from './email.service'

// ── Matricular aluno ──────────────────────────────────────────
export async function enroll(studentId: string, productId: string) {
  // Upsert para ser idempotente (webhook pode disparar duas vezes)
  const enrollment = await prisma.enrollment.upsert({
    where: { studentId_productId: { studentId, productId } },
    create: { studentId, productId, progress: 0 },
    update: {},   // Não sobrescreve progresso se já existir
  })

  // Busca dados para o e-mail
  const [student, product] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true, email: true } }),
    prisma.product.findUnique({ where: { id: productId }, select: { title: true } }),
  ])

  if (student && product) {
    await sendWelcomeEmail({ student, product }).catch(err =>
      logger.error('Falha ao enviar e-mail de boas-vindas:', err)
    )
  }

  logger.info(`Matrícula criada: studentId=${studentId} productId=${productId}`)
  return enrollment
}

// ── Listar matrículas do aluno ────────────────────────────────
export async function listByStudent(studentId: string) {
  return prisma.enrollment.findMany({
    where: { studentId },
    include: {
      product: {
        select: {
          id: true, title: true, slug: true, coverUrl: true, type: true,
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  })
}

// ── Atualizar progresso ───────────────────────────────────────
export async function updateProgress(studentId: string, productId: string, lessonId: string) {
  // Verifica matrícula
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_productId: { studentId, productId } },
  })
  if (!enrollment) throw AppError.forbidden('Você não tem acesso a este produto.')

  // Conta total de aulas e recalcula progresso
  const [totalLessons] = await Promise.all([
    prisma.lesson.count({ where: { productId } }),
  ])

  // Simplificado: incrementa progresso baseado em total de aulas
  const progressStep = totalLessons > 0 ? (1 / totalLessons) * 100 : 0
  const newProgress = Math.min(Number(enrollment.progress) + progressStep, 100)

  return prisma.enrollment.update({
    where: { studentId_productId: { studentId, productId } },
    data: { progress: newProgress },
  })
}
