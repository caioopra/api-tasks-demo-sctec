# api-tasks-demo

API de tarefas (demo) em **Node.js + Express + TypeScript**, com validação via **Zod** e testes em **Jest**. O projeto é didático: foca em uma camada HTTP enxuta, contrato de erro consistente (`{ error, status }`) e storage em memória — sem banco de dados — para que o estudo fique concentrado em rotas, validação, middlewares e testes.

---

## Requisitos

- **Node.js** — alinhado a `@types/node` 20.x do projeto (Node 20 LTS é a escolha natural; `tsconfig` mira `ES2022`).
- **npm** (vem com o Node).
- Sistema operacional: qualquer um suportado pelo Node (Linux, macOS, Windows/WSL).

---

## Instalação

```bash
git clone <url-do-repositorio> api-tasks-demo
cd api-tasks-demo
npm install
cp .env.example .env   # opcional: ajustar PORT/NODE_ENV
```

> O arquivo `.env` é opcional. Se não existir, valem os defaults do schema (`PORT=3000`, `NODE_ENV=development`).

---

## Uso

### Variáveis de ambiente

As variáveis são validadas no boot por um schema Zod (`src/config/env.ts`). Valor inválido faz o processo abortar **antes** de aceitar requisições.

| Variável     | Descrição                                                                                    | Exemplo       |
| ------------ | -------------------------------------------------------------------------------------------- | ------------- |
| `PORT`       | Porta HTTP em que a API escuta. Inteiro positivo. **Default:** `3000`.                       | `PORT=3000`   |
| `NODE_ENV`   | Ambiente de execução. Valores aceitos: `development \| test \| production`. **Default:** `development`. Em `production`, mensagens de erro 500 são genéricas. | `NODE_ENV=development` |
| `JWT_SECRET` | Segredo HMAC usado por `auth.service` para assinar o fake-JWT. Mínimo 16 caracteres. **Default:** placeholder de demo — sobrescreva em qualquer ambiente real. | `JWT_SECRET=insecure-dev-secret-please-override` |

### Subir em desenvolvimento (hot reload)

```bash
npm run dev
# [api-tasks-demo] (development) listening on http://localhost:3000
```

### Build e execução em produção

```bash
npm run build      # compila TypeScript para ./dist
npm start          # node dist/index.js
```

### Smoke test rápido

```bash
curl -s http://localhost:3000/
# {"status":"ok"}
```

---

## API

Base URL padrão: `http://localhost:3000`.

### Contrato de erro

Toda resposta de erro segue o formato canônico:

```json
{ "error": "mensagem legível", "status": 400 }
```

- **400** — falha de validação (body/query inválidos via Zod).
- **404** — recurso não encontrado.
- **500** — erro interno (mensagem genérica em `NODE_ENV=production`).

### Autenticação

Os endpoints sob `/tasks` exigem um token via cabeçalho `Authorization: Bearer <token>`. O token é um **fake-JWT** (mesmo formato `header.payload.signature` de um JWT real, assinado com HMAC-SHA256 sobre `JWT_SECRET`) — emitido por `POST /auth/register` ou `POST /auth/login`. Sem expiração e sem revogação: é didático, não substitui uma implementação real.

Respostas de erro de autenticação:

- **401** `missing or malformed Authorization header` — cabeçalho ausente ou fora do formato `Bearer <token>`.
- **401** `invalid or expired token` — assinatura ou payload não conferem.

### Modelo `Task`

```ts
{
  "id": "string (uuid, gerado pelo servidor)",
  "title": "string (1–100 chars)",
  "priority": "low | med | high",
  "created_at": "string (ISO-8601, gerado pelo servidor)"
}
```

Em `POST` e `PUT`, o **body** aceita apenas `title` e `priority`. Os campos `id` e `created_at` são controlados pelo servidor.

### Endpoints

#### `GET /` — liveness probe

```bash
curl -s http://localhost:3000/
```

Resposta `200`:

```json
{ "status": "ok" }
```

#### `POST /auth/register` — criar conta e obter token

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
```

Respostas:

- `201` com `{ "user": { "id", "email" }, "token": "<fake-jwt>" }`.
- `400` quando `email`/`password` falham na validação (`password` mínimo 8 chars).
- `409` quando o email já está registrado.

#### `POST /auth/login` — trocar credenciais por token

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
```

Respostas:

- `200` com `{ "user": { "id", "email" }, "token": "<fake-jwt>" }`.
- `400` quando o body é inválido.
- `401` `invalid email or password` — mesmo texto para email desconhecido e senha errada (não revela qual falhou).

> Os exemplos abaixo de `/tasks/*` omitem o cabeçalho `Authorization` por brevidade — todos exigem `Authorization: Bearer <token>`. Sem token (ou com token inválido), respondem `401`.

#### `GET /tasks` — listar todas as tarefas

```bash
curl -s http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"
```

Resposta `200`: `Task[]` (array vazio se não houver tarefas).

#### `GET /tasks/search` — busca/filtragem

Query params (todos opcionais, combinados com AND):

- `priority` — exatamente `low`, `med` ou `high`.
- `q` — substring (case-insensitive) do `title`. Entre 1 e 100 caracteres.

```bash
curl -s "http://localhost:3000/tasks/search?priority=high&q=relat"
```

Resposta `200`: `Task[]`. Query inválida devolve `400`.

#### `GET /tasks/stats` — agregados

```bash
curl -s http://localhost:3000/tasks/stats
```

Resposta `200`:

```json
{
  "total": 3,
  "byPriority": { "low": 1, "med": 1, "high": 1 }
}
```

#### `GET /tasks/:id` — buscar por id

```bash
curl -s http://localhost:3000/tasks/00000000-0000-4000-8000-000000000000
```

Respostas:

- `200` com a `Task`.
- `404` `{ "error": "task not found", "status": 404 }`.

#### `POST /tasks` — criar tarefa

```bash
curl -s -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Enviar relatório","priority":"high"}'
```

Respostas:

- `201` com a `Task` criada (inclui `id` e `created_at`).
- `400` quando `title`/`priority` falham na validação.

#### `PUT /tasks/:id` — substituir campos do usuário

```bash
curl -s -X PUT http://localhost:3000/tasks/<id> \
  -H 'Content-Type: application/json' \
  -d '{"title":"Enviar relatório revisado","priority":"med"}'
```

Respostas:

- `200` com a `Task` atualizada (mantém `id` e `created_at`).
- `400` quando o body é inválido.
- `404` quando o `id` não existe.

#### `DELETE /tasks/:id` — remover tarefa

```bash
curl -s -X DELETE -o /dev/null -w "%{http_code}\n" \
  http://localhost:3000/tasks/<id>
```

Respostas:

- `204` sem corpo, quando removida.
- `404` `{ "error": "task not found", "status": 404 }`.

---

## Desenvolvimento

### Scripts npm

| Script           | O que faz                                                       |
| ---------------- | --------------------------------------------------------------- |
| `npm run dev`    | Sobe a API em modo dev com hot reload (`ts-node-dev`).          |
| `npm run build`  | Compila `src/` em `dist/` via `tsc`.                            |
| `npm start`      | Executa o build (`node dist/index.js`).                         |
| `npm test`       | Roda a suíte Jest (`--passWithNoTests`).                        |
| `npm run test:watch` | Jest em modo watch.                                         |
| `npm run lint`   | ESLint sobre `src/**/*.ts`.                                     |
| `npm run lint:fix` | ESLint com correções automáticas.                             |
| `npm run docs:gen` | Gera `openapi.json` a partir dos schemas Zod (`src/openapi/generate.ts`). Servido em `/docs` via Swagger UI. |

### Estrutura de pastas

```
src/
├── app.ts                       # factory do Express (createApp)
├── index.ts                     # entrypoint do processo (listen)
├── auth/
│   ├── auth.service.ts          # hashPassword/verifyPassword + fake-JWT (sign/verify)
│   └── usersDb.ts               # repositório em memória de usuários
├── config/
│   └── env.ts                   # schema Zod + parse de process.env
├── db/
│   └── client.ts                # stub de cliente de banco (selectAll/insert/...)
├── middlewares/
│   ├── errorHandler.ts          # HttpError + handler global ({error,status})
│   └── jwt.middleware.ts        # protege /tasks via Authorization: Bearer
├── openapi/
│   ├── generate.ts              # gera openapi.json a partir dos schemas Zod
│   ├── paths.ts                 # registro de rotas/components para o OpenAPI
│   └── registry.ts              # configura zod-to-openapi (.openapi())
├── queue/
│   └── producer.ts              # stub de producer AMQP (publish(routingKey,payload))
├── routes/
│   ├── auth.ts                  # POST /auth/register + POST /auth/login
│   ├── health.ts                # GET /
│   └── tasks.ts                 # CRUD + /search + /stats (atrás de jwtMiddleware)
├── schemas/
│   ├── auth.ts                  # credentialsSchema + publicUserSchema + authResponseSchema
│   ├── error.ts                 # errorResponseSchema
│   ├── health.ts                # healthResponseSchema
│   └── task.ts                  # taskInputSchema + tipo Task
├── services/
│   └── cache.service.ts         # stub de Redis (get/set/del + TTL)
└── storage/
    └── tasksDb.ts               # storage em memória de tasks
```

### Convenções de código

- **Validação primeiro**: body/params/query passam por Zod antes de chegar à camada de serviço.
- **Tipagem estrita**: nada de `any` implícito; preferir tipos inferidos (`z.infer<typeof ...>`).
- **Erros sempre no formato `{ error, status }`** — nunca string crua, HTML ou texto livre.
- **Ordenamento de rotas**: caminhos literais (ex.: `/search`, `/stats`) declarados **antes** de `/:id`, senão o Express casa como id.

### Testes

```bash
npm test
```

Os testes vivem em `tests/` e usam `supertest` montado sobre `createApp()` — sem precisar abrir porta real.

---

## Contribuição

1. Crie uma branch a partir de `main` no padrão `feature/<escopo>` (ex.: `feature/tasks-pagination`).
2. Faça commits seguindo [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
3. **Antes de commitar**, rode:
   ```bash
   npm test
   npm run lint:fix
   ```
   Não é permitido commitar com a suíte vermelha. Se algum teste falha, apresente primeiro um plano com (1) quais testes falham, (2) causa raiz e (3) o que muda — depois corrija e só então commit.
4. Abra um Pull Request descrevendo motivação, mudanças e como testar.

---

## Licença

[MIT](./LICENSE)
