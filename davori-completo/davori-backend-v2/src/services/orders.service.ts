// src/services/orders.service.ts
import { prisma } from '../config/prisma'
import { AppError } from '../utils/AppError'
import { logger } from '../config/logger'
import * as pagarme from './pagarme.service'
import * as enrollmentsService from './enrollments.service'

interface CreateOrderDTO {
  productId: string
  paymentMethod: 'CARD' | 'PIX' | 'BOLETO'
  customer: {
    name: string
    email: string
    document: string      // CPF
  }
  // Apenas para cartão
  card?: {
    token: string
    installments?: number
  }
  affiliateCode?: string
}

// ── Criar pedido e iniciar pagamento ──────────────────────────
export async function createOrder(dto: CreateOrderDTO) {
  // Busca produto
  const product = await prisma.product.findUnique({ where: { id: dto.productId } })
  if (!product || product.status !== 'PUBLISHED') {
    throw AppError.notFound('Produto não encontrado ou indisponível.')
  }

  // Resolve afiliado
  let affiliateLinkId: string | undefined
  if (dto.affiliateCode) {
    const affiliate = await prisma.affiliateLink.findUnique({
      where: { refCode: dto.affiliateCode },
    })
    if (affiliate?.isActive) affiliateLinkId = affiliate.id
  }

  // Busca ou cria usuário aluno
  let student = await prisma.user.findUnique({ where: { email: dto.customer.email } })
  if (!student) {
    // Cria conta provisória (sem senha) — aluno define senha depois
    student = await prisma.user.create({
      data: {
        name: dto.customer.name,
        email: dto.customer.email,
        passwordHash: '',   // Será definida no fluxo de primeiro acesso
        role: 'STUDENT',
      },
    })
  }

  // Verifica se já tem acesso ao produto
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { studentId_productId: { studentId: student.id, productId: product.id } },
  })
  if (existingEnrollment) {
    throw AppError.conflict('Você já tem acesso a este produto.')
  }

  // Converte para centavos
  const amountInCents = Math.round(Number(product.price) * 100)

  // Chama gateway
  const gatewayMethodMap = { CARD: 'credit_card', PIX: 'pix', BOLETO: 'boleto' } as const
  const gatewayOrder = await pagarme.createOrder({
    amount: amountInCents,
    paymentMethod: gatewayMethodMap[dto.paymentMethod],
    customer: dto.customer,
    items: [{
      amount: amountInCents,
      description: product.title,
      quantity: 1,
      code: product.id,
    }],
    card: dto.card,
  })

  // Salva pedido localmente
  const order = await prisma.order.create({
    data: {
      studentId: student.id,
      productId: product.id,
      amount: product.price,
      paymentMethod: dto.paymentMethod,
      status: 'PENDING',
      gatewayOrderId: gatewayOrder.id,
      affiliateLinkId,
    },
  })

  logger.info(`Pedido criado: ${order.id} | Produto: ${product.title} | Método: ${dto.paymentMethod}`)

  // Para cartão, Pagar.me pode aprovar de forma síncrona
  if (dto.paymentMethod === 'CARD' && gatewayOrder.status === 'paid') {
    await handlePaymentSuccess(order.id, gatewayOrder.id)
  }

  // Extrai dados de pagamento (PIX QR code, boleto PDF, etc.)
  const charge = gatewayOrder.charges?.[0]
  const paymentData = charge?.last_transaction ?? null

  return {
    order: {
      id: order.id,
      status: gatewayOrder.status === 'paid' ? 'PAID' : 'PENDING',
      paymentMethod: dto.paymentMethod,
      amount: product.price,
    },
    paymentData: {
      pixQrCode: paymentData?.qr_code ?? null,
      pixQrCodeUrl: paymentData?.qr_code_url ?? null,
      boletoPdf: paymentData?.pdf ?? null,
      boletoBarcode: paymentData?.barcode ?? null,
    },
  }
}

// ── Status do pedido ──────────────────────────────────────────
export async function getOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentMethod: true, amount: true, productId: true },
  })
  if (!order) throw AppError.notFound('Pedido não encontrado.')
  return order
}

// ── Processar pagamento confirmado (chamado pelo webhook) ──────
export async function handlePaymentSuccess(orderId: string, gatewayOrderId: string) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { gatewayOrderId }] },
  })

  if (!order || order.status === 'PAID') return // Idempotente

  // Atualiza status do pedido
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAID' },
  })

  // Libera acesso ao produto
  await enrollmentsService.enroll(order.studentId, order.productId)

  // Processa comissão de afiliado (se houver)
  if (order.affiliateLinkId) {
    await processAffiliateCommission(order)
  }

  logger.info(`Pagamento confirmado e acesso liberado: orderId=${order.id}`)
}

// ── Reembolso ─────────────────────────────────────────────────
export async function refundOrder(orderId: string, requesterId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  })

  if (!order) throw AppError.notFound('Pedido não encontrado.')
  if (order.status !== 'PAID') throw new AppError('Apenas pedidos pagos podem ser reembolsados.', 400)

  // Verifica se é o produtor ou o próprio aluno dentro do prazo
  const isProducer = order.product.producerId === requesterId
  const isStudentInWindow = order.studentId === requesterId &&
    Date.now() - order.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 dias

  if (!isProducer && !isStudentInWindow) {
    throw AppError.forbidden('Reembolso não permitido.')
  }

  // Chama gateway (simplificado — busca o chargeId via gateway)
  const gatewayOrder = await pagarme.getOrder(order.gatewayOrderId!)
  const chargeId = gatewayOrder.charges?.[0]?.id
  if (chargeId) await pagarme.refundCharge(chargeId)

  // Atualiza status e remove matrícula
  await prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } })
  await prisma.enrollment.deleteMany({
    where: { studentId: order.studentId, productId: order.productId },
  })

  logger.info(`Reembolso processado: orderId=${orderId}`)
}

// ── Helper: comissão de afiliado ──────────────────────────────
async function processAffiliateCommission(order: { affiliateLinkId: string | null; amount: any }) {
  if (!order.affiliateLinkId) return
  const link = await prisma.affiliateLink.findUnique({ where: { id: order.affiliateLinkId } })
  if (!link) return
  const commission = Number(order.amount) * (Number(link.commissionPct) / 100)
  logger.info(`Comissão de afiliado calculada: R$ ${commission.toFixed(2)} para userId=${link.affiliateId}`)
  // TODO: registrar em tabela de comissões e acionar pagamento no gateway
}
