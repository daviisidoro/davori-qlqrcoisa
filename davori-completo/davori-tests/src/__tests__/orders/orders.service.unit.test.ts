// src/__tests__/orders/orders.service.unit.test.ts

const mockPrisma = {
  product: { findUnique: jest.fn() },
  affiliateLink: { findUnique: jest.fn() },
  user: { findUnique: jest.fn(), create: jest.fn() },
  enrollment: { findUnique: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  order: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

const mockPagarme = {
  createOrder: jest.fn(),
  getOrder: jest.fn(),
  refundCharge: jest.fn(),
}

const mockEmail = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}

jest.mock('../../config/prisma', () => ({ prisma: mockPrisma }))
jest.mock('../../services/pagarme.service', () => mockPagarme)
jest.mock('../../services/email.service', () => mockEmail)

import * as ordersService from '../../services/orders.service'
import { AppError } from '../../utils/AppError'

const baseOrderInput = {
  productId: 'prod-123',
  paymentMethod: 'PIX' as const,
  customer: { name: 'Ana Paula', email: 'ana@test.com', document: '12345678901' },
}

describe('OrdersService.createOrder', () => {
  beforeEach(() => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'prod-123', title: 'Curso X', price: 197, status: 'PUBLISHED',
    })
    mockPrisma.affiliateLink.findUnique.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue(null) // aluno novo
    mockPrisma.user.create.mockResolvedValue({ id: 'student-1', email: 'ana@test.com', role: 'STUDENT' })
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)
    mockPrisma.order.create.mockResolvedValue({ id: 'order-1', productId: 'prod-123', studentId: 'student-1', paymentMethod: 'PIX', status: 'PENDING', affiliateLinkId: null, createdAt: new Date() })
    mockPagarme.createOrder.mockResolvedValue({
      id: 'pag-123', status: 'pending',
      charges: [{ id: 'ch-1', last_transaction: { qr_code: 'qr-abc', qr_code_url: 'http://pix' } }],
    })
  })

  it('cria aluno automaticamente se e-mail não existe', async () => {
    await ordersService.createOrder(baseOrderInput)
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'ana@test.com', role: 'STUDENT' }),
      })
    )
  })

  it('não cria aluno duplicado se já existe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'ana@test.com', role: 'STUDENT' })
    await ordersService.createOrder(baseOrderInput)
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it('lança 404 se produto não encontrado', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null)
    await expect(ordersService.createOrder(baseOrderInput)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lança 404 se produto está em DRAFT', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-123', status: 'DRAFT' })
    await expect(ordersService.createOrder(baseOrderInput)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lança 409 se aluno já tem matrícula ativa', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'aluno-1', email: 'ana@test.com' })
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enroll-1' })
    await expect(ordersService.createOrder(baseOrderInput)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('converte preço para centavos ao chamar o gateway', async () => {
    await ordersService.createOrder(baseOrderInput)
    expect(mockPagarme.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 19700 }) // 197 * 100
    )
  })

  it('retorna QR code Pix quando pagamento é PIX', async () => {
    const result = await ordersService.createOrder(baseOrderInput)
    expect(result.paymentData.pixQrCode).toBe('qr-abc')
  })
})

describe('OrdersService.handlePaymentSuccess', () => {
  it('é idempotente — não processa pedido já PAID', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'ord-1', status: 'PAID' })
    await ordersService.handlePaymentSuccess('ord-1', 'pag-123')
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })

  it('não processa se pedido não encontrado', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null)
    await ordersService.handlePaymentSuccess('ord-999', 'pag-999')
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })

  it('atualiza status para PAID e cria matrícula', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'ord-1', status: 'PENDING', studentId: 'stu-1', productId: 'prod-1', affiliateLinkId: null,
    })
    mockPrisma.order.update.mockResolvedValue({})
    mockPrisma.enrollment.upsert.mockResolvedValue({})
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'X', email: 'x@x.com' })
    mockPrisma.product.findUnique.mockResolvedValue({ title: 'Curso X' })

    await ordersService.handlePaymentSuccess('ord-1', 'pag-1')

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'ord-1' },
      data: { status: 'PAID' },
    })
    expect(mockPrisma.enrollment.upsert).toHaveBeenCalled()
  })
})

describe('OrdersService.refundOrder', () => {
  it('lança 404 se pedido não encontrado', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null)
    await expect(ordersService.refundOrder('ord-x', 'user-x')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lança erro se pedido não está PAID', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-1', status: 'PENDING', product: { producerId: 'prod-x' },
    })
    await expect(ordersService.refundOrder('ord-1', 'user-x')).rejects.toBeInstanceOf(AppError)
  })

  it('produtor pode reembolsar qualquer pedido de seu produto', async () => {
    const producerId = 'producer-1'
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-1', status: 'PAID', studentId: 'stu-1', gatewayOrderId: 'pag-1',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
      product: { producerId },
    })
    mockPagarme.getOrder.mockResolvedValue({ charges: [{ id: 'ch-1' }] })
    mockPagarme.refundCharge.mockResolvedValue({})
    mockPrisma.order.update.mockResolvedValue({})
    mockPrisma.enrollment.deleteMany.mockResolvedValue({})

    await ordersService.refundOrder('ord-1', producerId)
    expect(mockPagarme.refundCharge).toHaveBeenCalledWith('ch-1')
    expect(mockPrisma.enrollment.deleteMany).toHaveBeenCalled()
  })

  it('aluno pode reembolsar dentro de 7 dias', async () => {
    const studentId = 'student-1'
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-1', status: 'PAID', studentId, gatewayOrderId: 'pag-1',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
      product: { producerId: 'outro-produtor' },
    })
    mockPagarme.getOrder.mockResolvedValue({ charges: [{ id: 'ch-1' }] })
    mockPagarme.refundCharge.mockResolvedValue({})
    mockPrisma.order.update.mockResolvedValue({})
    mockPrisma.enrollment.deleteMany.mockResolvedValue({})

    await expect(ordersService.refundOrder('ord-1', studentId)).resolves.not.toThrow()
  })

  it('aluno não pode reembolsar após 7 dias (403)', async () => {
    const studentId = 'student-1'
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-1', status: 'PAID', studentId, gatewayOrderId: 'pag-1',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 dias atrás
      product: { producerId: 'outro-produtor' },
    })

    await expect(ordersService.refundOrder('ord-1', studentId)).rejects.toMatchObject({ statusCode: 403 })
  })
})
