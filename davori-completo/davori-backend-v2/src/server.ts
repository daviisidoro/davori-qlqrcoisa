// src/server.ts
import app from './app'
import { env } from './config/env'
import { prisma } from './config/prisma'
import { logger } from './config/logger'

async function main() {
  // Verifica conexão com o banco antes de subir
  try {
    await prisma.$connect()
    logger.info('✅ Banco de dados conectado.')
  } catch (err) {
    logger.error('❌ Falha ao conectar ao banco de dados:', err)
    process.exit(1)
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Davori API rodando em http://localhost:${env.PORT}`)
    logger.info(`   Ambiente: ${env.NODE_ENV}`)
    logger.info(`   Health:   http://localhost:${env.PORT}/health`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} recebido. Encerrando servidor...`)
    server.close(async () => {
      await prisma.$disconnect()
      logger.info('Servidor encerrado com sucesso.')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main()
