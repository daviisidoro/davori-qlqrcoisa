// src/__tests__/auth/middleware.unit.test.ts
import { Request, Response, NextFunction } from 'express'
import { authenticate, requireRole, optionalAuth } from '../../middlewares/auth.middleware'
import { generateAccessToken } from '../../utils/jwt'
import { AppError } from '../../utils/AppError'

process.env.JWT_ACCESS_SECRET = 'test-access-secret-muito-longo-para-testes-unitarios'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-muito-longo-para-testes-unitarios'

function mockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers } as any
}

function mockRes(): Partial<Response> {
  return {} as any
}

function mockNext(): jest.Mock<NextFunction> {
  return jest.fn()
}

const validToken = generateAccessToken({ sub: 'uuid-123', email: 'x@x.com', role: 'PRODUCER' })

describe('authenticate middleware', () => {
  it('injeta req.user com payload válido', () => {
    const req = mockReq({ authorization: `Bearer ${validToken}` }) as any
    const next = mockNext()
    authenticate(req, mockRes() as any, next)
    expect(next).toHaveBeenCalledWith() // sem argumento = sem erro
    expect(req.user).toBeDefined()
    expect(req.user.sub).toBe('uuid-123')
    expect(req.user.role).toBe('PRODUCER')
  })

  it('chama next(AppError) sem header Authorization', () => {
    const req = mockReq() as any
    const next = mockNext()
    authenticate(req, mockRes() as any, next)
    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    const err = next.mock.calls[0][0] as AppError
    expect(err.statusCode).toBe(401)
  })

  it('chama next(AppError) com token malformado', () => {
    const req = mockReq({ authorization: 'Bearer tok.en.invalido' }) as any
    const next = mockNext()
    authenticate(req, mockRes() as any, next)
    expect(next).toHaveBeenCalledWith(expect.any(AppError))
  })

  it('chama next(AppError) com prefixo errado (sem "Bearer ")', () => {
    const req = mockReq({ authorization: validToken }) as any
    const next = mockNext()
    authenticate(req, mockRes() as any, next)
    expect(next).toHaveBeenCalledWith(expect.any(AppError))
  })
})

describe('requireRole middleware', () => {
  it('passa para PRODUCER quando role esperada é PRODUCER', () => {
    const req = { user: { sub: 'x', email: 'x@x.com', role: 'PRODUCER', type: 'access' } } as any
    const next = mockNext()
    requireRole('PRODUCER')(req, mockRes() as any, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('bloqueia STUDENT quando role esperada é PRODUCER', () => {
    const req = { user: { sub: 'x', email: 'x@x.com', role: 'STUDENT', type: 'access' } } as any
    const next = mockNext()
    requireRole('PRODUCER')(req, mockRes() as any, next)
    const err = next.mock.calls[0][0] as AppError
    expect(err.statusCode).toBe(403)
  })

  it('aceita múltiplos roles', () => {
    const req = { user: { sub: 'x', email: 'x@x.com', role: 'ADMIN', type: 'access' } } as any
    const next = mockNext()
    requireRole('PRODUCER', 'ADMIN')(req, mockRes() as any, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('chama 401 se req.user não está definido', () => {
    const req = {} as any
    const next = mockNext()
    requireRole('PRODUCER')(req, mockRes() as any, next)
    const err = next.mock.calls[0][0] as AppError
    expect(err.statusCode).toBe(401)
  })
})

describe('optionalAuth middleware', () => {
  it('injeta user se token válido', () => {
    const req = mockReq({ authorization: `Bearer ${validToken}` }) as any
    const next = mockNext()
    optionalAuth(req, mockRes() as any, next)
    expect(req.user).toBeDefined()
    expect(next).toHaveBeenCalledWith()
  })

  it('não bloqueia se token ausente — req.user fica undefined', () => {
    const req = mockReq() as any
    const next = mockNext()
    optionalAuth(req, mockRes() as any, next)
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledWith()
  })

  it('não bloqueia se token inválido — apenas ignora', () => {
    const req = mockReq({ authorization: 'Bearer invalido.mesmo.aqui' }) as any
    const next = mockNext()
    optionalAuth(req, mockRes() as any, next)
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledWith()
  })
})
