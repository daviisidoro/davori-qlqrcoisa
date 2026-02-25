// src/services/email.service.ts
import { env } from '../config/env'
import { logger } from '../config/logger'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

// Wrapper genérico do SendGrid
async function send(options: SendEmailOptions): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    logger.warn(`[Email] SendGrid não configurado. E-mail não enviado para ${options.to}`)
    return
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
      subject: options.subject,
      content: [{ type: 'text/html', value: options.html }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SendGrid error ${res.status}: ${body}`)
  }

  logger.info(`[Email] Enviado para ${options.to}: "${options.subject}"`)
}

// ── Templates ─────────────────────────────────────────────────

export async function sendWelcomeEmail({
  student,
  product,
}: {
  student: { name: string; email: string }
  product: { title: string }
}) {
  await send({
    to: student.email,
    subject: `🎉 Seu acesso a "${product.title}" está liberado!`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;color:#0f0f0f">Olá, ${student.name}! 👋</h1>
        <p style="color:#555;line-height:1.6">
          Seu pagamento foi confirmado e seu acesso ao produto
          <strong>${product.title}</strong> está liberado agora mesmo.
        </p>
        <a href="${env.FRONTEND_URL}/membros"
           style="display:inline-block;margin-top:24px;padding:14px 28px;
                  background:#e8401c;color:#fff;border-radius:8px;
                  text-decoration:none;font-weight:700;font-size:16px">
          Acessar meu conteúdo →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#aaa">
          Dúvidas? Responda este e-mail ou acesse suporte.davori.com.br
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${env.FRONTEND_URL}/redefinir-senha?token=${resetToken}`
  await send({
    to: email,
    subject: 'Redefinição de senha — Davori',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;color:#0f0f0f">Redefinir sua senha</h1>
        <p style="color:#555;line-height:1.6">
          Recebemos um pedido para redefinir a senha da sua conta Davori.
          Clique no botão abaixo para criar uma nova senha:
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;margin-top:24px;padding:14px 28px;
                  background:#0f0f0f;color:#fff;border-radius:8px;
                  text-decoration:none;font-weight:700;font-size:16px">
          Redefinir senha
        </a>
        <p style="margin-top:24px;font-size:13px;color:#888">
          Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.
        </p>
      </div>
    `,
  })
}
