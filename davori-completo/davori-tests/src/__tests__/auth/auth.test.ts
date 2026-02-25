// src/__tests__/auth/auth.test.ts
import request from 'supertest'
import app from '../../app'
import { createUser, createProducer } from '../factories'
import { prisma } from '../../config/prisma'

describe('Auth — POST /api/auth/register', () => {
  const validPayload = {
    name: 'Davi Isidoro',
    email: 'davi@davori.com.br',
    password: 'Senha123!',
    role: 'PRODUCER',
  }

  it('deve criar uma nova conta e retornar accessToken + user', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user).toMatchObject({
      name: 'Davi Isidoro',
      email: 'davi@davori.com.br',
      role: 'PRODUCER',
    })
    // Não deve expor o hash da senha
    expect(res.body.user).not.toHaveProperty('passwordHash')
  })

  it('deve definir cookie httpOnly com refreshToken', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload)

    expect(res.status).toBe(201)
    const setCookie = res.headers['set-cookie'] as string[]
    expect(setCookie).toBeDefined()
    expect(setCookie.some((c: string) => c.startsWith('refreshToken='))).toBe(true)
    expect(setCookie.some((c: string) => c.includes('HttpOnly'))).toBe(true)
  })

  it('deve retornar 409 se e-mail já estiver em uso', async () => {
    await createUser({ email: 'davi@davori.com.br' })

    const res = await request(app).post('/api/auth/register').send(validPayload)

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('deve retornar 422 com e-mail inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'nao-e-email' })

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('VALIDATION_ERROR')
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    )
  })

  it('deve retornar 422 com senha fraca (sem maiúscula)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, password: 'senha123!' })

    expect(res.status).toBe(422)
    expect(res.body.errors[0].field).toBe('password')
  })

  it('deve retornar 422 com senha muito curta', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, password: 'Ab1!' })

    expect(res.status).toBe(422)
  })

  it('deve retornar 422 com nome muito curto', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, name: 'A' })

    expect(res.status).toBe(422)
  })
})

describe('Auth — POST /api/auth/login', () => {
  it('deve autenticar com credenciais válidas', async () => {
    await createUser({ email: 'login@test.com', password: 'Senha123!' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Senha123!' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user.email).toBe('login@test.com')
  })

  it('deve retornar 401 com senha errada', async () => {
    await createUser({ email: 'user@test.com' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'SenhaErrada1!' })

    expect(res.status).toBe(401)
    // Mensagem genérica — não deve revelar se o e-mail existe
    expect(res.body.message).toBe('E-mail ou senha incorretos.')
  })

  it('deve retornar 401 com e-mail inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@test.com', password: 'Senha123!' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('E-mail ou senha incorretos.')
  })

  it('deve retornar 422 com e-mail inválido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalido', password: 'Senha123!' })

    expect(res.status).toBe(422)
  })
})

describe('Auth — GET /api/auth/me', () => {
  it('deve retornar dados do usuário autenticado', async () => {
    const { accessToken, user } = await createProducer({ email: 'me@test.com' })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(user.id)
    expect(res.body.user.email).toBe('me@test.com')
    expect(res.body.user).not.toHaveProperty('passwordHash')
  })

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('deve retornar 401 com token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.invalido.aqui')

    expect(res.status).toBe(401)
  })

  it('deve retornar 401 com token expirado', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4eHgiLCJleHAiOjF9.asdf'

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(res.status).toBe(401)
  })
})

describe('Auth — POST /api/auth/refresh', () => {
  it('deve renovar o access token com refresh token válido', async () => {
    // Faz login para obter o cookie com refresh token
    await createUser({ email: 'refresh@test.com', password: 'Senha123!' })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'refresh@test.com', password: 'Senha123!' })

    const cookies = loginRes.headers['set-cookie']
    const oldToken = loginRes.body.accessToken

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies)

    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body).toHaveProperty('accessToken')
    expect(refreshRes.body.accessToken).not.toBe(oldToken)
  })

  it('deve retornar 401 sem cookie de refresh', async () => {
    const res = await request(app).post('/api/auth/refresh')
    expect(res.status).toBe(401)
  })
})

describe('Auth — POST /api/auth/logout', () => {
  it('deve remover o cookie de refresh token', async () => {
    await createUser({ email: 'logout@test.com', password: 'Senha123!' })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'logout@test.com', password: 'Senha123!' })

    const cookies = loginRes.headers['set-cookie']

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)

    expect(logoutRes.status).toBe(204)

    const setCookie = logoutRes.headers['set-cookie'] as string[]
    expect(setCookie?.some((c: string) => c.includes('refreshToken=;'))).toBe(true)
  })

  it('deve invalidar o refresh token no banco após logout', async () => {
    const { user } = await createUser({ email: 'logout2@test.com', password: 'Senha123!' })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'logout2@test.com', password: 'Senha123!' })

    const cookies = loginRes.headers['set-cookie']

    await request(app).post('/api/auth/logout').set('Cookie', cookies)

    const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } })
    expect(tokens).toHaveLength(0)
  })
})
