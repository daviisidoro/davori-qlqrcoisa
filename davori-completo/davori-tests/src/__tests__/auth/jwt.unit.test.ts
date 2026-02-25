// src/__tests__/auth/jwt.unit.test.ts
// Testes unitários puros — sem banco de dados

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../../utils/jwt'

// Seta secrets para os testes
process.env.JWT_ACCESS_SECRET = 'test-access-secret-muito-longo-para-testes-unitarios'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-muito-longo-para-testes-unitarios'
process.env.JWT_ACCESS_EXPIRES_IN = '15m'
process.env.JWT_REFRESH_EXPIRES_IN = '30'

const mockPayload = { sub: 'user-uuid-123', email: 'test@test.com', role: 'PRODUCER' }

describe('JWT Utils', () => {
  describe('generateAccessToken', () => {
    it('gera um token com 3 partes (header.payload.signature)', () => {
      const token = generateAccessToken(mockPayload)
      expect(token.split('.')).toHaveLength(3)
    })

    it('token contém os dados corretos no payload', () => {
      const token = generateAccessToken(mockPayload)
      const decoded = verifyAccessToken(token)
      expect(decoded.sub).toBe(mockPayload.sub)
      expect(decoded.email).toBe(mockPayload.email)
      expect(decoded.role).toBe(mockPayload.role)
      expect(decoded.type).toBe('access')
    })
  })

  describe('generateRefreshToken', () => {
    it('gera refresh token com type=refresh', () => {
      const token = generateRefreshToken(mockPayload)
      const decoded = verifyRefreshToken(token)
      expect(decoded.type).toBe('refresh')
    })

    it('access e refresh tokens são diferentes', () => {
      const access = generateAccessToken(mockPayload)
      const refresh = generateRefreshToken(mockPayload)
      expect(access).not.toBe(refresh)
    })
  })

  describe('verifyAccessToken', () => {
    it('lança erro para token refresh usado como access', () => {
      const refresh = generateRefreshToken(mockPayload)
      expect(() => verifyAccessToken(refresh)).toThrow()
    })

    it('lança erro para token inválido', () => {
      expect(() => verifyAccessToken('token.invalido.assinado')).toThrow()
    })

    it('lança erro para token com assinatura adulterada', () => {
      const token = generateAccessToken(mockPayload)
      const tampered = token.slice(0, -5) + 'XXXXX'
      expect(() => verifyAccessToken(tampered)).toThrow()
    })
  })

  describe('verifyRefreshToken', () => {
    it('lança erro para access token usado como refresh', () => {
      const access = generateAccessToken(mockPayload)
      expect(() => verifyRefreshToken(access)).toThrow()
    })
  })

  describe('getRefreshTokenExpiry', () => {
    it('retorna data no futuro', () => {
      const expiry = getRefreshTokenExpiry()
      expect(expiry.getTime()).toBeGreaterThan(Date.now())
    })

    it('expira em aproximadamente 30 dias', () => {
      const expiry = getRefreshTokenExpiry()
      const diffDays = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeCloseTo(30, 0)
    })
  })
})
