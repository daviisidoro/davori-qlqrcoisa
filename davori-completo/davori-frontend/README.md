# Davori Frontend

Next.js 14 + TypeScript + Tailwind CSS

## Stack
- **Next.js 14** App Router + SSR
- **TypeScript** strict mode
- **Tailwind CSS** design system customizado
- **React Query** cache e estado de servidor
- **React Hook Form + Zod** formulários com validação
- **Axios** com interceptors para renovação automática de JWT
- **Sonner** toasts

## Setup

```bash
cp .env.local.example .env.local
# Configure NEXT_PUBLIC_API_URL e NEXT_PUBLIC_PAGARME_PUBLIC_KEY

npm install
npm run dev   # http://localhost:3000
```

## Estrutura

```
src/
├── app/
│   ├── layout.tsx              # Root layout (AuthProvider + QueryProvider)
│   ├── login/page.tsx          # Login + Registro
│   ├── dashboard/
│   │   ├── layout.tsx          # Sidebar + proteção de rota
│   │   └── page.tsx            # KPIs + lista de produtos
│   ├── checkout/[slug]/page.tsx # Checkout Pix/Cartão/Boleto
│   └── membros/
│       └── page.tsx            # Lista de cursos do aluno
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
├── hooks/
│   ├── useProducts.ts          # CRUD de produtos
│   └── useCheckout.ts          # Checkout, polling e matrículas
├── lib/
│   ├── api.ts                  # Axios + refresh token automático
│   ├── auth.tsx                # AuthContext + useAuth
│   └── query.tsx               # QueryClient provider
├── types/index.ts              # Tipos compartilhados
└── styles/globals.css          # Tailwind + utilitários
```

## Fluxos implementados

| Fluxo | Rota |
|-------|------|
| Login / Registro | `/login` |
| Dashboard do produtor | `/dashboard` |
| Checkout (Pix, Cartão, Boleto) | `/checkout/[slug]` |
| Área de membros | `/membros` |

## Variáveis de ambiente

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_test_xxx
```
