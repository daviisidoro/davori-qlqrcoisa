// src/__tests__/orders/orders.test.ts
import request from 'supertest'
import app from '../../app'
import { createProducer, createStudent, createProduct } from '../factories'
import { prisma } from '../../config/prisma'

// Mock do Pagar.me para não fazer chamadas reais em testes
jest.mock('../../services/pagarme.service', () => ({
  createOrder: jest.fn().mockResolvedValue({
    id: 'pag-order-123',
    status: 'pending',
    charges: [{
      id: 'charge-123',
      status: 'pending',
      payment_method: 'pix',
      last_transaction: {
        qr_code: 'qr-code-fake-123',
        qr_code_url: 'https://pix.example.com/qr',
      },
    }],
  }),
  getOrder: jest.fn().mockResolvedValue({ id: 'pag-order-123', status: 'paid', charges: [] }),
  refundCharge: jest.fn().mockResolvedValue({}),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
}))

// Mock do e-mail
jest.mock('../../services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}))

const validCustomer = {
  name: 'Ana Paula',
  email: 'ana@test.com',
  document: '12345678901',
}

describe('Orders — POST /api/orders (checkout)', () => {
  it('deve criar pedido Pix e retornar QR code', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { price: 197, status: 'PUBLISHED' })

    const res = await request(app)
      .post('/api/orders')
      .send({
        productId: product.id,
        paymentMethod: 'PIX',
        customer: validCustomer,
      })

    expect(res.status).toBe(201)
    expect(res.body.order.status).toBe('PENDING')
    expect(res.body.paymentData.pixQrCode).toBe('qr-code-fake-123')

    // Deve ter criado o pedido no banco
    const order = await prisma.order.findFirst({ where: { gatewayOrderId: 'pag-order-123' } })
    expect(order).not.toBeNull()
    expect(order?.paymentMethod).toBe('PIX')
  })

  it('deve criar pedido com Cartão quando token é fornecido', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    const res = await request(app)
      .post('/api/orders')
      .send({
        productId: product.id,
        paymentMethod: 'CARD',
        customer: validCustomer,
        card: { token: 'tok_test_123', installments: 3 },
      })

    expect(res.status).toBe(201)
  })

  it('deve retornar 422 se paymentMethod=CARD sem token de cartão', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    const res = await request(app)
      .post('/api/orders')
      .send({
        productId: product.id,
        paymentMethod: 'CARD',
        customer: validCustomer,
        // card ausente
      })

    expect(res.status).toBe(422)
  })

  it('deve retornar 404 para produto inexistente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        productId: '00000000-0000-0000-0000-000000000000',
        paymentMethod: 'PIX',
        customer: validCustomer,
      })

    expect(res.status).toBe(404)
  })

  it('deve retornar 404 para produto DRAFT', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'DRAFT' })

    const res = await request(app)
      .post('/api/orders')
      .send({
        productId: product.id,
        paymentMethod: 'PIX',
        customer: validCustomer,
      })

    expect(res.status).toBe(404)
  })

  it('deve retornar 409 se aluno já tem acesso ao produto', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    // Cria uma matrícula existente
    const student = await prisma.user.create({
      data: { name: 'Ana Paula', email: 'ana@test.com', passwordHash: '', role: 'STUDENT' },
    })
    await prisma.enrollment.create({
      data: { studentId: student.id, productId: product.id, progress: 0 },
    })

    const res = await request(app)
      .post('/api/orders')
      .send({
        productId: product.id,
        paymentMethod: 'PIX',
        customer: validCustomer,
      })

    expect(res.status).toBe(409)
  })

  it('deve retornar 422 com CPF inválido', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    const res = await request(app)
      .post('/api/orders')
      .send({
        productId: product.id,
        paymentMethod: 'PIX',
        customer: { ...validCustomer, document: '123' }, // CPF inválido
      })

    expect(res.status).toBe(422)
    expect(res.body.errors[0].field).toContain('document')
  })
})

describe('Orders — GET /api/orders/:id/status', () => {
  it('retorna status do pedido', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    const createRes = await request(app)
      .post('/api/orders')
      .send({ productId: product.id, paymentMethod: 'PIX', customer: validCustomer })

    const orderId = createRes.body.order.id

    const statusRes = await request(app).get(`/api/orders/${orderId}/status`)

    expect(statusRes.status).toBe(200)
    expect(statusRes.body.order.id).toBe(orderId)
    expect(statusRes.body.order.status).toBe('PENDING')
  })

  it('retorna 404 para pedido inexistente', async () => {
    const res = await request(app).get('/api/orders/00000000-0000-0000-0000-000000000000/status')
    expect(res.status).toBe(404)
  })
})

describe('Webhooks — POST /api/webhooks/payment', () => {
  it('deve liberar acesso ao produto quando order.paid é recebido', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    // Cria pedido PENDING
    const createRes = await request(app)
      .post('/api/orders')
      .send({ productId: product.id, paymentMethod: 'PIX', customer: validCustomer })

    const orderId = createRes.body.order.id
    const order = await prisma.order.findUnique({ where: { id: orderId } })

    // Simula webhook de pagamento confirmado
    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        type: 'order.paid',
        id: 'evt-123',
        data: { id: order?.gatewayOrderId },
      })

    expect(webhookRes.status).toBe(200)

    // Deve ter criado matrícula
    const student = await prisma.user.findUnique({ where: { email: validCustomer.email } })
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: student!.id, productId: product.id },
    })
    expect(enrollment).not.toBeNull()

    // Pedido deve estar PAID
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } })
    expect(updatedOrder?.status).toBe('PAID')
  })

  it('deve ser idempotente (processar webhook duplicado sem erro)', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    const createRes = await request(app)
      .post('/api/orders')
      .send({ productId: product.id, paymentMethod: 'PIX', customer: { ...validCustomer, email: 'dup@test.com' } })

    const order = await prisma.order.findUnique({ where: { id: createRes.body.order.id } })

    const webhookPayload = {
      type: 'order.paid',
      id: 'evt-456',
      data: { id: order?.gatewayOrderId },
    }

    // Dispara duas vezes
    await request(app).post('/api/webhooks/payment').send(webhookPayload)
    const secondRes = await request(app).post('/api/webhooks/payment').send(webhookPayload)

    expect(secondRes.status).toBe(200)

    // Deve ter apenas uma matrícula
    const student = await prisma.user.findUnique({ where: { email: 'dup@test.com' } })
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student!.id, productId: product.id },
    })
    expect(enrollments).toHaveLength(1)
  })
})

describe('Enrollments — GET /api/enrollments/me', () => {
  it('aluno vê seus próprios cursos', async () => {
    const { user: producer } = await createProducer()
    const product = await createProduct(producer.id, { status: 'PUBLISHED' })

    // Aluno compra e recebe acesso via webhook
    const email = 'aluno@test.com'
    await request(app)
      .post('/api/orders')
      .send({ productId: product.id, paymentMethod: 'PIX', customer: { name: 'Aluno', email, document: '11122233344' } })

    const order = await prisma.order.findFirst({ where: { product: { id: product.id } } })
    await request(app).post('/api/webhooks/payment').send({
      type: 'order.paid', id: 'evt-enroll', data: { id: order?.gatewayOrderId },
    })

    const { accessToken } = await (async () => {
      const student = await prisma.user.findUnique({ where: { email } })
      const { generateAccessToken } = await import('../../utils/jwt')
      const token = generateAccessToken({ sub: student!.id, email: student!.email, role: student!.role })
      return { accessToken: token }
    })()

    const res = await request(app)
      .get('/api/enrollments/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.enrollments).toHaveLength(1)
    expect(res.body.enrollments[0].product.id).toBe(product.id)
  })

  it('retorna 401 sem autenticação', async () => {
    const res = await request(app).get('/api/enrollments/me')
    expect(res.status).toBe(401)
  })
})
