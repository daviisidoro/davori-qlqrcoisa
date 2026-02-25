// src/app/membros/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useMyEnrollments } from '@/hooks/useCheckout'
import { BookOpen, Clock, CheckCircle, LogOut } from 'lucide-react'

export default function MembrosPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const { data: enrollments, isLoading: loadingEnrollments } = useMyEnrollments()

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="bg-ink border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <span className="font-syne font-black text-xl text-white">
          Dav<span className="text-accent">ori</span>
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-syne font-black text-xs text-white">
              {user.name.charAt(0)}
            </div>
            <span className="text-white/70 text-sm">{user.name}</span>
          </div>
          <button onClick={logout} className="text-white/30 hover:text-white/60 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-syne font-black text-2xl text-ink tracking-tight mb-1">
            Meus Cursos
          </h1>
          <p className="text-sm text-stone-400 font-light">
            {enrollments?.length ?? 0} {enrollments?.length === 1 ? 'curso adquirido' : 'cursos adquiridos'}
          </p>
        </div>

        {loadingEnrollments ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-32 bg-stone-100 rounded-lg mb-4" />
                <div className="h-4 bg-stone-100 rounded mb-2" />
                <div className="h-3 bg-stone-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : !enrollments?.length ? (
          <div className="card p-16 text-center">
            <BookOpen size={40} className="text-stone-300 mx-auto mb-4" />
            <h2 className="font-syne font-bold text-lg text-ink mb-2">Nenhum curso ainda</h2>
            <p className="text-sm text-stone-400 mb-6 font-light">
              Adquira um produto para começar a aprender
            </p>
            <a href="/" className="btn-primary text-sm px-5 py-2.5 inline-block font-syne">
              Explorar produtos
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enrollment) => {
              const progress = Number(enrollment.progress)
              const isComplete = progress >= 100

              return (
                <Link
                  key={enrollment.id}
                  href={`/membros/${enrollment.product.slug}`}
                  className="card hover:-translate-y-1 hover:shadow-lg transition-all group"
                >
                  {/* Cover */}
                  <div className="h-32 bg-gradient-to-br from-ink to-stone-800 rounded-t-xl relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(232,64,28,0.2)_0%,transparent_60%)]" />
                    <span className="font-syne font-black text-4xl text-white/20 relative z-10">
                      {enrollment.product.title.charAt(0)}
                    </span>
                    {isComplete && (
                      <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                      {enrollment.product.type}
                    </span>
                    <h3 className="font-syne font-bold text-base text-ink mt-1 mb-3 leading-tight group-hover:text-accent transition-colors line-clamp-2">
                      {enrollment.product.title}
                    </h3>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {enrollment.product._count.lessons} aulas
                        </span>
                        <span className="font-semibold text-ink">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-yellow-400 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
