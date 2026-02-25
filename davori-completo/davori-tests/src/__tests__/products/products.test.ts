// src/__tests__/products/products.test.ts
import request from 'supertest'
import app from '../../app'
import { createProducer, createStudent, createProduct } from '../factories'

describe('Products — POST /api/products', () => {
  it('produtor pode criar produto', async () => {
    const { accessToken } = await createProducer()

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Curso de Node.js', price: 197, type: 'COURSE' })

    expect(res.status).toBe(201)
    expect(res.body.product).toMatchObject({
      title: 'Curso de Node.js',
      status: 'DRAFT',
      type: 'COURSE',
    })
    expect(res.body.product.slug).toBe('curso-de-nodejs')
  })

  it('deve gerar slug único se já existir', async () => {
    const { accessToken, user } = await createProducer()
    await createProduct(user.id, { title: 'Meu Curso' })

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Meu Curso', price: 97, type: 'EBOOK' })

    expect(res.status).toBe(201)
    expect(res.body.product.slug).not.toBe('meu-curso') // Slug único com sufixo
  })

  it('aluno não pode criar produto (403)', async () => {
    const { accessToken } = await createStudent()

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Produto', price: 100, type: 'COURSE' })

    expect(res.status).toBe(403)
  })

  it('deve retornar 401 sem autenticação', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ title: 'Produto', price: 100, type: 'COURSE' })

    expect(res.status).toBe(401)
  })

  it('deve retornar 422 com preço negativo', async () => {
    const { accessToken } = await createProducer()

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Produto', price: -10, type: 'COURSE' })

    expect(res.status).toBe(422)
  })

  it('deve retornar 422 com tipo inválido', async () => {
    const { accessToken } = await createProducer()

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Produto', price: 100, type: 'INVALIDO' })

    expect(res.status).toBe(422)
  })
})

describe('Products — GET /api/products', () => {
  it('produtor vê apenas seus próprios produtos', async () => {
    const prod1 = await createProducer({ email: 'p1@test.com' })
    const prod2 = await createProducer({ email: 'p2@test.com' })

    await createProduct(prod1.user.id, { title: 'Produto A' })
    await createProduct(prod1.user.id, { title: 'Produto B' })
    await createProduct(prod2.user.id, { title: 'Produto C' })

    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${prod1.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(2)
    expect(res.body.products.every((p: any) => p.producerId === prod1.user.id)).toBe(true)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(401)
  })
})

describe('Products — GET /api/products/slug/:slug (público)', () => {
  it('retorna produto publicado pelo slug', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { title: 'Produto Público', status: 'PUBLISHED' })

    const res = await request(app).get(`/api/products/slug/${product.slug}`)

    expect(res.status).toBe(200)
    expect(res.body.product.id).toBe(product.id)
    expect(res.body.product.producer).toBeDefined()
  })

  it('retorna 404 para produto em DRAFT', async () => {
    const { user } = await createProducer()
    const product = await createProduct(user.id, { title: 'Produto Rascunho', status: 'DRAFT' })

    const res = await request(app).get(`/api/products/slug/${product.slug}`)

    expect(res.status).toBe(404)
  })

  it('retorna 404 para slug inexistente', async () => {
    const res = await request(app).get('/api/products/slug/nao-existe-mesmo')
    expect(res.status).toBe(404)
  })
})

describe('Products — PATCH /api/products/:id', () => {
  it('produtor pode atualizar seu próprio produto', async () => {
    const { user, accessToken } = await createProducer()
    const product = await createProduct(user.id)

    const res = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Título Atualizado', status: 'PUBLISHED' })

    expect(res.status).toBe(200)
    expect(res.body.product.title).toBe('Título Atualizado')
    expect(res.body.product.status).toBe('PUBLISHED')
  })

  it('produtor não pode editar produto de outro produtor (403)', async () => {
    const prod1 = await createProducer({ email: 'p1@test.com' })
    const prod2 = await createProducer({ email: 'p2@test.com' })
    const product = await createProduct(prod1.user.id)

    const res = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${prod2.accessToken}`)
      .send({ title: 'Hackeado' })

    expect(res.status).toBe(403)
  })
})

describe('Products — DELETE /api/products/:id', () => {
  it('arquiva o produto (soft delete)', async () => {
    const { user, accessToken } = await createProducer()
    const product = await createProduct(user.id, { status: 'PUBLISHED' })

    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(204)

    // Produto deve estar ARCHIVED, não deletado
    const deleted = await request(app).get(`/api/products/slug/${product.slug}`)
    expect(deleted.status).toBe(404) // Não aparece mais na busca pública
  })
})
