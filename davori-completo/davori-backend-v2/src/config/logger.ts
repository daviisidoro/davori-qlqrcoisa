// src/config/logger.ts
import winston from 'winston'
import { env } from './env'

const { combine, timestamp, printf, colorize, json } = winston.format

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level}] ${message}${extras}`
  })
)

const prodFormat = combine(timestamp(), json())

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
})
