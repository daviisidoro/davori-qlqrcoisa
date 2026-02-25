// src/app/dashboard/page.tsx
'use client'

import { useAuth } from '@/lib/auth'
import { useMyProducts } from '@/hooks/useProducts'
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Percent } from 'lucide-react'

const kpis = [
  { label: 'Receita Total', value: 'R$ 103.100', delta: '+23,4%', up: true, icon: DollarSign, color: 'text-accent' },
  { label: 'Vendas', value: '522', delta: '+18,1%', up: true, icon: ShoppingCart, color: 'text-yellow-500' },
  { label: 'Conversão', value: '8,4%', delta: '+2,1pp', up: true, icon: Percent, color: 'text-green-500' },
  { label: 'Ticket Médio', value: 'R$ 197', delta: '-3,2%', up: false, icon: TrendingUp, color: 'text-blue-500' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: products, isLoading } = useMyProducts()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-syne font-black text-2xl text-ink tracking-tight">
            Olá, {user?.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">Aqui está o resumo da sua plataforma</p>
        </div>
        <button className="btn-primary text-sm px-4 py-2.5 font-syne">
          + Novo produto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, delta, up, icon: Icon, color }) => (
          <div key={label} className="card p-5 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{label}</p>
              <div className={`p-1.5 rounded-lg bg-stone-50 ${color}`}>
                <Icon size={14} />
              </div>
            </div>
            <p className="font-syne font-black text-2xl text-ink tracking-tight mb-2">{value}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}>
              {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {delta} vs mês anterior
            </span>
          </div>
        ))}
      </div>

      {/* Products list */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-syne font-bold text-base">Meus Produtos</h2>
          <a href="/dashboard/produtos" className="text-sm text-accent hover:underline font-medium">
            Ver todos
          </a>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-stone-400 text-sm">Carregando...</div>
        ) : !products?.length ? (
          <div className="p-12 text-center">
            <p className="text-stone-400 text-sm mb-4">Você ainda não tem produtos</p>
            <button className="btn-primary text-sm px-4 py-2">Criar primeiro produto</button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-syne font-black text-xs text-white shrink-0">
                  {product.title.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink truncate">{product.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {product._count?.enrollments ?? 0} alunos · {product.type}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-semibold text-sm text-green-600">
                    R$ {Number(product.price).toFixed(2).replace('.', ',')}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    product.status === 'PUBLISHED'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-stone-100 text-stone-400'
                  }`}>
                    {product.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
