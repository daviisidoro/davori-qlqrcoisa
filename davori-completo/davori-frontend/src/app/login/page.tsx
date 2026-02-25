// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de uma letra maiúscula')
    .regex(/[0-9]/, 'Precisa de um número'),
  role: z.enum(['PRODUCER', 'STUDENT']),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const router = useRouter()
  const { login, register } = useAuth()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'PRODUCER' },
  })

  const onLogin = loginForm.handleSubmit(async (data) => {
    try {
      await login(data.email, data.password)
      toast.success('Bem-vindo de volta!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao fazer login.')
    }
  })

  const onRegister = registerForm.handleSubmit(async (data) => {
    try {
      await register(data.name, data.email, data.password, data.role)
      toast.success('Conta criada com sucesso!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao criar conta.')
    }
  })

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(232,64,28,0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(245,200,66,0.07)_0%,transparent_60%)]" />

        <div className="relative z-10">
          <span className="font-syne font-black text-2xl text-white tracking-tight">
            Dav<span className="text-accent">ori</span>
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-xs font-bold tracking-widest uppercase text-accent mb-4">
            Plataforma de Infoprodutos
          </p>
          <h1 className="font-syne font-black text-4xl text-white leading-[1.05] tracking-tight mb-5">
            Venda mais.<br />
            Ensine <em className="text-accent">melhor.</em><br />
            Escale rápido.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm font-light">
            A plataforma completa para criar, vender e entregar seus infoprodutos com checkout otimizado e área de membros profissional.
          </p>
        </div>

        <div className="relative z-10 bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-yellow-400 text-sm mb-3">★★★★★</div>
          <p className="text-white/60 text-sm italic leading-relaxed mb-4 font-light">
            "Migrei para a Davori há 3 meses e minha conversão aumentou{' '}
            <strong className="text-white font-medium not-italic">47%</strong>."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-syne font-black text-xs text-white">MR</div>
            <div>
              <p className="text-white text-sm font-medium">Marina Rocha</p>
              <p className="text-white/40 text-xs">8.400 alunos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 bg-paper">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <span className="font-syne font-black text-2xl text-ink">
              Dav<span className="text-accent">ori</span>
            </span>
          </div>

          {/* Toggle */}
          <div className="flex bg-white border border-stone-200 rounded-xl p-1 mb-8">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-stone-400 hover:text-ink'
                }`}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <h2 className="font-syne font-black text-2xl text-ink mb-1 tracking-tight">
                  Bem-vindo de volta
                </h2>
                <p className="text-sm text-stone-400 font-light mb-6">Entre na sua conta Davori</p>
              </div>

              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <div>
                <Input
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  error={loginForm.formState.errors.password?.message}
                  {...loginForm.register('password')}
                />
                <div className="flex justify-end mt-1.5">
                  <a href="/esqueci-senha" className="text-xs text-stone-400 hover:text-accent transition-colors">
                    Esqueceu a senha?
                  </a>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2 font-syne"
                isLoading={loginForm.formState.isSubmitting}
              >
                Entrar na minha conta
              </Button>
            </form>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <form onSubmit={onRegister} className="space-y-4">
              <div>
                <h2 className="font-syne font-black text-2xl text-ink mb-1 tracking-tight">
                  Criar sua conta
                </h2>
                <p className="text-sm text-stone-400 font-light mb-6">Grátis para começar</p>
              </div>

              <Input
                label="Nome completo"
                type="text"
                placeholder="Davi Isidoro"
                error={registerForm.formState.errors.name?.message}
                {...registerForm.register('name')}
              />
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                error={registerForm.formState.errors.email?.message}
                {...registerForm.register('email')}
              />
              <Input
                label="Senha"
                type="password"
                placeholder="Mínimo 8 caracteres"
                error={registerForm.formState.errors.password?.message}
                {...registerForm.register('password')}
              />

              <div>
                <label className="label">Tipo de conta</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'PRODUCER', label: '🎯 Produtor', desc: 'Vou vender produtos' },
                    { value: 'STUDENT', label: '📚 Aluno', desc: 'Vou comprar produtos' },
                  ] as const).map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        registerForm.watch('role') === value
                          ? 'border-accent bg-accent/5'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={value}
                        className="sr-only"
                        {...registerForm.register('role')}
                      />
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{desc}</div>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full font-syne"
                isLoading={registerForm.formState.isSubmitting}
              >
                Criar minha conta grátis
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-stone-400 mt-6">
            {mode === 'login' ? (
              <>Não tem conta?{' '}
                <button onClick={() => setMode('register')} className="text-accent font-semibold hover:underline">
                  Criar gratuitamente
                </button>
              </>
            ) : (
              <>Já tem conta?{' '}
                <button onClick={() => setMode('login')} className="text-accent font-semibold hover:underline">
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
