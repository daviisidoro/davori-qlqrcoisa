# Davori Backend API

API RESTful da plataforma Davori — venda e entrega de infoprodutos.

## 🚀 Tecnologias

- **Node.js** + **TypeScript**
- **Express** — framework HTTP
- **PostgreSQL** + **Prisma ORM** — banco de dados
- **JWT** — autenticação (access + refresh token rotativo)
- **Zod** — validação de dados
- **bcryptjs** — hash de senhas
- **Winston** — logs estruturados
- **Helmet + CORS** — segurança

---

## ⚡ Instalação e Setup

### 1. Clone e instale as dependências

```bash
git clone https://github.com/seu-usuario/davori-backend
cd davori-backend
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais reais
```

### 3. Suba o PostgreSQL com Docker (opcional)

```bash
docker run --name davori-db \
  -e POSTGRES_USER=davori \
  -e POSTGRES_PASSWORD=davori123 \
  -e POSTGRES_DB=davori_db \
  -p 5432:5432 \
  -d postgres:16
```

### 4. Execute as migrations

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 5. Inicie o servidor

```bash
npm run dev     # Desenvolvimento (hot reload)
npm run build   # Compilar TypeScript
npm start       # Produção
```

---

## 📡 Endpoints de Auth

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/register` | Criar conta | Público |
| POST | `/api/auth/login` | Fazer login | Público |
| POST | `/api/auth/refresh` | Renovar access token | Cookie |
| POST | `/api/auth/logout` | Fazer logout | Público |
| POST | `/api/auth/logout-all` | Logout todos dispositivos | JWT |
| GET | `/api/auth/me` | Dados do usuário | JWT |

---

## 🔐 Fluxo de Autenticação

```
1. POST /api/auth/login
   → Retorna: { accessToken, user }
   → Cookie httpOnly: refreshToken (30 dias)

2. Use accessToken no header:
   Authorization: Bearer <accessToken>

3. Quando accessToken expirar (15min):
   POST /api/auth/refresh
   → Novo accessToken retornado
   → Refresh token rotacionado automaticamente

4. POST /api/auth/logout
   → Cookie deletado, token invalidado no banco
```

---

## 🧪 Exemplos cURL

### Registrar

```bash
curl -X POST http://localhost:3333/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Davi Isidoro",
    "email": "davi@davori.com.br",
    "password": "Senha123!",
    "role": "PRODUCER"
  }'
```

### Login

```bash
curl -X POST http://localhost:3333/api/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email": "davi@davori.com.br", "password": "Senha123!"}'
```

### Me (autenticado)

```bash
curl http://localhost:3333/api/auth/me \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

---

## 🗂️ Estrutura do Projeto

```
davori-backend/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── config/
│   │   ├── env.ts             # Variáveis de ambiente validadas
│   │   ├── prisma.ts          # Cliente Prisma singleton
│   │   └── logger.ts          # Winston logger
│   ├── controllers/
│   │   └── auth.controller.ts # Handlers HTTP de auth
│   ├── middlewares/
│   │   ├── auth.middleware.ts # JWT authenticate + requireRole
│   │   ├── errorHandler.ts    # Handler global de erros
│   │   └── rateLimiter.ts     # Rate limiting
│   ├── routes/
│   │   ├── auth.routes.ts     # Rotas de auth
│   │   └── index.ts           # Agregador de rotas
│   ├── services/
│   │   └── auth.service.ts    # Lógica de negócio de auth
│   ├── utils/
│   │   ├── AppError.ts        # Classe de erro customizada
│   │   └── jwt.ts             # Geração e verificação de tokens
│   ├── app.ts                 # Configuração do Express
│   └── server.ts              # Entry point
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🛣️ Próximas rotas a implementar

- `POST /api/products` — Criar produto
- `POST /api/orders` — Criar pedido / checkout
- `POST /api/webhooks/payment` — Webhook do Pagar.me
- `GET /api/enrollments/me` — Cursos do aluno
- `GET /api/lessons/:id/stream` — URL de streaming do vídeo

---

## 📄 Licença

MIT © Davori · Davi Isidoro
