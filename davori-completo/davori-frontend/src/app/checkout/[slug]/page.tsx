// src/app/checkout/[slug]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useProduct } from '@/hooks/useProducts'
import { useCheckout, useOrderStatus } from '@/hooks/useCheckout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckCircle, CreditCard, Smartphone, FileText, Shield, Clock } from 'lucide-react'

type PayMethod = 'CARD' | 'PIX' | 'BOLETO'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  document: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  cardToken: z.string().optional(),
  installments: z.number().optional(),
})

type FormData = z.infer<typeof schema>

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [payMethod, setPayMethod] = useState<PayMethod>('PIX')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeUrl: string } | null>(null)
  const [timer, setTimer] = useState(15 * 60)

  const { data: product, isLoading: loadingProduct } = useProduct(slug)
  const checkout = useCheckout()
  const { data: orderStatus } = useOrderStatus(orderId ?? '', !!orderId)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Timer de urgência
  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  // Redireciona quando pagamento for confirmado
  useEffect(() => {
    if (orderStatus?.status === 'PAID') {
      toast.success('Pagamento confirmado! Redirecionando...')
      setTimeout(() => router.push('/membros'), 2000)
    }
  }, [orderStatus?.status, router])

  const timerStr = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`

  const onSubmit = handleSubmit(async (data) => {
    if (!product) return
    try {
      const result = await checkout.mutateAsync({
        productId: product.id,
        paymentMethod: payMethod,
        customer: {
          name: data.name,
          email: data.email,
          document: data.document.replace(/\D/g, ''),
        },
        ...(payMethod === 'CARD' && { card: { token: 'tok_test_demo', installments: data.installments ?? 1 } }),
      })

      setOrderId(result.order.id)

      if (payMethod === 'PIX' && result.paymentData.pixQrCode) {
        setPixData({ qrCode: result.paymentData.pixQrCode, qrCodeUrl: result.paymentData.pixQrCodeUrl ?? '' })
      } else if (result.order.status === 'PAID') {
        router.push('/membros')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao processar pagamento.')
    }
  })

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-stone-400">Produto não encontrado.</p>
      </div>
    )
  }

  // Tela de Pix aguardando pagamento
  if (pixData) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <div className="card max-w-sm w-full p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <Smartphone size={20} className="text-green-500" />
          </div>
          <h2 className="font-syne font-black text-xl text-ink mb-2">Pague via Pix</h2>
          <p className="text-sm text-stone-400 mb-6 font-light">
            Escaneie o QR Code ou copie o código abaixo. Aprovação instantânea!
          </p>

          {/* QR Code placeholder */}
          <div className="w-40 h-40 bg-stone-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-xs text-stone-400 font-mono text-center px-4">QR Code Pix gerado pelo Pagar.me</span>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 flex items-center gap-2 mb-6">
            <code className="text-xs text-stone-500 flex-1 truncate font-mono">{pixData.qrCode.substring(0, 40)}...</code>
            <button
              onClick={() => { navigator.clipboard.writeText(pixData.qrCode); toast.success('Código copiado!') }}
              className="text-xs font-semibold text-accent hover:underline shrink-0"
            >
              Copiar
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-stone-400">
            <Clock size={14} className="animate-pulse" />
            Aguardando pagamento...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Timer bar */}
      <div className="bg-ink text-center py-2.5">
        <p className="text-yellow-400 text-xs font-syne font-bold tracking-wide">
          🔥 Oferta por tempo limitado — termina em <span className="text-base">{timerStr}</span>
        </p>
      </div>

      {/* Nav */}
      <nav className="border-b border-stone-200 bg-white px-8 py-4 flex items-center justify-between">
        <span className="font-syne font-black text-xl text-ink">Dav<span className="text-accent">ori</span></span>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-1.5"><Shield size={12} /> Compra segura</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={12} /> 7 dias de garantia</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-12">
        {/* Product info */}
        <div>
          <span className="inline-block bg-accent text-white text-[10px] font-syne font-bold uppercase tracking-widest px-2.5 py-1 rounded mb-4">
            ⚡ Mais vendido
          </span>
          <h1 className="font-syne font-black text-3xl text-ink leading-tight tracking-tight mb-3">
            {product.title}
          </h1>
          {product.description && (
            <p className="text-stone-400 font-light leading-relaxed mb-6 text-sm">{product.description}</p>
          )}

          <div className="bg-ink rounded-xl p-5 flex items-center gap-4 mb-6">
            <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-syne font-black text-lg text-white shrink-0">
              {product.title.charAt(0)}
            </div>
            <div className="text-white">
              <p className="font-syne font-bold text-sm mb-1">{product.title}</p>
              <p className="text-white/50 text-xs font-light">Acesso vitalício · {product._count?.enrollments ?? 0}+ alunos</p>
              <div className="flex gap-3 mt-2 text-xs text-white/40">
                <span>★★★★★ 4.9</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex -space-x-2">
              {['A','B','C','D','E'].map((l, i) => (
                <div key={l} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white" style={{ background: ['#e8401c','#f5c842','#3b82f6','#3dd68c','#8b5cf6'][i] }}>{l}</div>
              ))}
            </div>
            <div>
              <div className="text-yellow-400 text-xs">★★★★★</div>
              <p className="text-xs text-stone-500"><strong className="text-ink">{product._count?.enrollments ?? 0} alunos</strong> já compraram</p>
            </div>
          </div>
        </div>

        {/* Checkout form */}
        <div>
          {/* Price */}
          <div className="mb-5">
            <p className="text-sm text-stone-400 line-through">
              R$ {(Number(product.price) * 2.5).toFixed(2).replace('.', ',')}
            </p>
            <div className="flex items-baseline gap-3">
              <p className="font-syne font-black text-4xl text-ink tracking-tight">
                <sup className="text-lg">R$</sup>{Number(product.price).toFixed(0)}
              </p>
              <span className="bg-yellow-400 text-ink text-xs font-syne font-bold px-2 py-0.5 rounded-full">-60% OFF</span>
            </div>
            <p className="text-xs text-stone-400 mt-1">ou 12× de R$ {(Number(product.price) / 12).toFixed(2).replace('.', ',')} sem juros</p>
          </div>

          <div className="h-px bg-stone-200 mb-5" />

          {/* Payment method */}
          <div className="mb-5">
            <label className="label">Forma de pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'PIX', label: 'Pix', icon: Smartphone },
                { value: 'CARD', label: 'Cartão', icon: CreditCard },
                { value: 'BOLETO', label: 'Boleto', icon: FileText },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPayMethod(value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-all ${
                    payMethod === value
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input label="Nome completo" placeholder="Como no CPF" error={errors.name?.message} {...register('name')} />
            <Input label="E-mail" type="email" placeholder="seu@email.com" error={errors.email?.message} {...register('email')} />
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              maxLength={14}
              error={errors.document?.message}
              {...register('document', {
                onChange: (e) => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
                  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4')
                  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
                  else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1.$2')
                  e.target.value = v
                }
              })}
            />

            {payMethod === 'CARD' && (
              <div className="space-y-3 pt-1">
                <Input label="Número do cartão" placeholder="0000 0000 0000 0000" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Validade" placeholder="MM/AA" />
                  <Input label="CVV" placeholder="•••" />
                </div>
                <div>
                  <label className="label">Parcelamento</label>
                  <select className="input-field" {...register('installments', { valueAsNumber: true })}>
                    <option value={1}>À vista — R$ {Number(product.price).toFixed(2).replace('.', ',')}</option>
                    <option value={3}>3× de R$ {(Number(product.price) / 3).toFixed(2).replace('.', ',')}</option>
                    <option value={6}>6× de R$ {(Number(product.price) / 6).toFixed(2).replace('.', ',')}</option>
                    <option value={12}>12× de R$ {(Number(product.price) / 12).toFixed(2).replace('.', ',')} (sem juros)</option>
                  </select>
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full font-syne mt-2" isLoading={isSubmitting || checkout.isLoading}>
              {payMethod === 'PIX' ? 'Gerar QR Code Pix' : payMethod === 'BOLETO' ? 'Emitir Boleto' : 'Finalizar compra'}
            </Button>
          </form>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-stone-400">
            <Shield size={11} /> Pagamento 100% seguro e criptografado
          </div>

          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <span className="text-xl">🛡️</span>
            <div>
              <p className="text-sm font-semibold text-green-700">Garantia incondicional de 7 dias</p>
              <p className="text-xs text-green-600 font-light mt-0.5">Se não gostar, devolvemos 100% do seu dinheiro.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
