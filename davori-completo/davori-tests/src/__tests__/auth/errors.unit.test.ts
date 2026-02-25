// src/__tests__/auth/errors.unit.test.ts
import { Request, Response, NextFunction } from 'express'
import { ZodError, z } from 'zod'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { AppError } from '../../utils/AppError'
import { errorHandler } from '../../middlewares/errorHandler'

process.env.NODE_ENV = 'test'

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)
  return res
}

const mockReq = {} as Request
const mockNext = jest.fn() as unknown as NextFunction

describe('AppError', () => {
  it('cria erro com statusCode e code corretos', () => {
    const err = new AppError('Algo deu errado', 400, 'BAD_REQUEST')
    expect(err.message).toBe('Algo deu errado')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('BAD_REQUEST')
    expect(err).toBeInstanceOf(AppError)
    expect(err).toBeInstanceOf(Error)
  })

  it('AppError.unauthorized() retorna 401', () => {
    const err = AppError.unauthorized()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('AppError.forbidden() retorna 403', () => {
    const err = AppError.forbidden()
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
  })

  it('AppError.notFound() retorna 404', () => {
    const err = AppError.notFound()
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
  })

  it('AppError.conflict() retorna 409', () => {
    const err = AppError.conflict()
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('CONFLICT')
  })

  it('AppError.internal() retorna 500', () => {
    const err = AppError.internal()
    expect(err.statusCode).toBe(500)
  })

  it('preserva mensagem customizada', () => {
    const err = AppError.notFound('Produto não encontrado.')
    expect(err.message).toBe('Produto não encontrado.')
  })
})

describe('errorHandler middleware', () => {
  it('trata AppError corretamente', () => {
    const res = mockRes()
    const err = new AppError('Não autorizado', 401, 'UNAUTHORIZED')
    errorHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ code: 'UNAUTHORIZED', message: 'Não autorizado' })
  })

  it('trata ZodError com status 422 e lista de campos', () => {
    const res = mockRes()
    const schema = z.object({ email: z.string().email() })
    let zodErr: ZodError
    try { schema.parse({ email: 'invalido' }) } catch (e) { zodErr = e as ZodError }

    errorHandler(zodErr!, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(422)
    const body = res.json.mock.calls[0][0]
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    )
  })

  it('trata TokenExpiredError com 401', () => {
    const res = mockRes()
    const err = new TokenExpiredError('jwt expired', new Date())
    errorHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json.mock.calls[0][0].code).toBe('TOKEN_EXPIRED')
  })

  it('trata JsonWebTokenError com 401', () => {
    const res = mockRes()
    const err = new JsonWebTokenError('invalid signature')
    errorHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json.mock.calls[0][0].code).toBe('INVALID_TOKEN')
  })

  it('trata erro Prisma P2002 (unique constraint) com 409', () => {
    const res = mockRes()
    const err = { code: 'P2002', message: 'Unique constraint failed' }
    errorHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0].code).toBe('CONFLICT')
  })

  it('trata erro Prisma P2025 (not found) com 404', () => {
    const res = mockRes()
    const err = { code: 'P2025', message: 'Record not found' }
    errorHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('trata erro desconhecido com 500', () => {
    const res = mockRes()
    errorHandler(new Error('boom inesperado'), mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json.mock.calls[0][0].code).toBe('INTERNAL_ERROR')
  })
})
