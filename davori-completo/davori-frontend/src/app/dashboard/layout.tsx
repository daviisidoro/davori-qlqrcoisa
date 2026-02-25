// src/app/dashboard/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, Package, Users, DollarSign,
  BarChart2, Mail, Settings, LogOut, ChevronRight,
} from 'lucide-react'

const navItems = [
  { label: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Produtos', href: '/dashboard/produtos', icon: Package },
  { label: 'Alunos', href: '/dashboard/alunos', icon: Users },
  { label: 'Financeiro', href: '/dashboard/financeiro', icon: DollarSign },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'E-mail marketing', href: '/dashboard/email', icon: Mail },
  { label: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-ink flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 py-6 border-b border-white/10">
          <span className="font-syne font-black text-xl text-white tracking-tight">
            Dav<span className="text-accent">ori</span>
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                  active
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                )}
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-syne font-black text-xs text-white shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-accent text-[10px] font-medium">✦ Plano Pro</p>
            </div>
            <button
              onClick={logout}
              className="text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 bg-paper">
        {children}
      </main>
    </div>
  )
}
