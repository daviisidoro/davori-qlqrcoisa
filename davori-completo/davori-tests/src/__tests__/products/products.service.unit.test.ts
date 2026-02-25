// src/__tests__/products/products.service.unit.test.ts
// Testes unitários sem banco — mock completo do Prisma

import { AppError } from '../../utils/AppError'

// Mock do Prisma Client
const mockPrisma = {
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock('../../config/prisma', () => ({ prisma: mockPrisma }))

// Importa DEPOIS do mock
import * as productsService from '../../services/products.service'

const PRODUCER_ID = 'producer-uuid-001'

describe('ProductsService.createProduct', () => {
  beforeEach(() => {
    mockPrisma.product.findUnique.mockResolvedValue(null) // slug disponível
    mockPrisma.product.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'prod-uuid', ...data, createdAt: new Date() })
    )
  })

  it('cria produto com slug gerado automaticamente', async () => {
    const product = await productsService.createProduct(PRODUCER_ID, {
      title: 'Curso Avançado de TypeScript',
      price: 297,
      type: 'COURSE',
    })

    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'curso-avancado-de-typescript',
          producerId: PRODUCER_ID,
        }),
      })
    )
    expect(product.slug).toBe('curso-avancado-de-typescript')
  })

  it('gera slug com sufixo único se slug já existe', async () => {
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: 'existente' }) // slug ocupado
    mockPrisma.product.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'novo-id', ...data })
    )

    await productsService.createProduct(PRODUCER_ID, {
      title: 'Meu Curso',
      price: 100,
      type: 'EBOOK',
    })

    const createCall = mockPrisma.product.create.mock.calls[0][0]
    expect(createCall.data.slug).not.toBe('meu-curso') // diferente do original
    expect(createCall.data.slug).toMatch(/^meu-curso-\d+$/) // com sufixo numérico
  })
})

describe('ProductsService.getBySlug', () => {
  it('lança 404 se produto não encontrado', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null)
    await expect(productsService.getBySlug('slug-inexistente')).rejects.toThrow(AppError)
    await expect(productsService.getBySlug('slug-inexistente')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lança 404 se produto está em DRAFT', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'x', status: 'DRAFT' })
    await expect(productsService.getBySlug('meu-draft')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('retorna produto PUBLISHED normalmente', async () => {
    const fakeProduct = { id: 'x', slug: 'meu-produto', status: 'PUBLISHED', producer: {}, _count: {} }
    mockPrisma.product.findUnique.mockResolvedValue(fakeProduct)
    const result = await productsService.getBySlug('meu-produto')
    expect(result.id).toBe('x')
  })
})

describe('ProductsService.updateProduct', () => {
  it('lança 404 se produto não existe', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null)
    await expect(
      productsService.updateProduct('id-fake', PRODUCER_ID, { title: 'Novo' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lança 403 se produtor não é dono', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', producerId: 'outro-produtor' })
    await expect(
      productsService.updateProduct('prod-1', PRODUCER_ID, { title: 'Hack' })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('atualiza se produtor é o dono', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', producerId: PRODUCER_ID })
    mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', title: 'Atualizado' })

    const result = await productsService.updateProduct('prod-1', PRODUCER_ID, { title: 'Atualizado' })
    expect(result.title).toBe('Atualizado')
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prod-1' } })
    )
  })
})

describe('ProductsService.deleteProduct', () => {
  it('faz soft delete (ARCHIVED) em vez de deletar fisicamente', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', producerId: PRODUCER_ID })
    mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', status: 'ARCHIVED' })

    await productsService.deleteProduct('prod-1', PRODUCER_ID)

    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { status: 'ARCHIVED' },
    })
  })
})
