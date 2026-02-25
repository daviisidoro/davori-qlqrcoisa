# Davori — Testes Automatizados

Jest + Supertest + ts-jest · 50+ casos de teste

## Como rodar

```bash
# Instalar dependências (na raiz do backend)
npm install

# Configurar .env de teste
cp .env.example .env.test
# Usar um banco PostgreSQL separado para testes!

# Todos os testes
npm test

# Com cobertura
npm run test:coverage

# Por módulo
npm run test:auth
npm run test:products
npm run test:orders
```

## Estrutura

```
src/__tests__/
├── setup.ts                          # Limpeza do banco antes de cada teste
├── factories.ts                      # Funções helper para criar dados de teste
│
├── auth/
│   ├── auth.test.ts                  # Integração: register, login, me, refresh, logout
│   ├── jwt.unit.test.ts              # Unitário: geração e verificação de tokens
│   ├── middleware.unit.test.ts       # Unitário: authenticate, requireRole, optionalAuth
│   └── errors.unit.test.ts          # Unitário: AppError + errorHandler global
│
├── products/
│   ├── products.test.ts              # Integração: CRUD de produtos via HTTP
│   └── products.service.unit.test.ts # Unitário: ProductsService com mock do Prisma
│
└── orders/
    ├── orders.test.ts                # Integração: checkout, webhook, enrollment
    └── orders.service.unit.test.ts   # Unitário: OrdersService com mock do Prisma
```

## Cobertura esperada (>80%)

| Módulo | Linhas | Funções | Branches |
|--------|--------|---------|----------|
| auth.service | ~85% | ~90% | ~75% |
| products.service | ~90% | ~95% | ~80% |
| orders.service | ~85% | ~90% | ~80% |
| middlewares | ~95% | ~100% | ~90% |

## Tipos de teste

### Integração (`*.test.ts`)
- Usam Supertest para fazer requisições HTTP reais contra o app Express
- Acessam o banco de dados real (PostgreSQL de teste)
- Testam o fluxo completo: validação → controller → service → banco

### Unitários (`*.unit.test.ts`)
- Mockam o Prisma e serviços externos
- Testam lógica de negócio isolada
- Rápidos e sem dependências externas

## Mocks
- **Pagar.me**: mockado em todos os testes de integração de orders
- **SendGrid**: mockado (não envia e-mails reais em testes)
- **Prisma**: mockado nos testes unitários de service
