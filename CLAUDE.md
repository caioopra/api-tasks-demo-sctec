# api-tasks-demo

## Stack
- Node.js + Express + TypeScript
- Validação: Zod
- Testes: Jest

## Convenções
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)
- Branches: `feature/<scope>` (ex: `feature/auth`, `feature/tasks-crud`)

## Comandos
- `npm run dev` — sobe a API em modo desenvolvimento (hot reload)
- `npm test` — executa a suíte Jest
- `npm run lint:fix` — roda o linter aplicando correções automáticas

## Regras de código
- Toda resposta de erro **deve** seguir o formato:
  ```ts
  { error: string, status: number }
  ```
  Nunca retorne mensagens de erro em formato livre, HTML ou string crua.
- Validar entradas (body, params, query) com Zod antes de chegar à camada de serviço.
- Tipagem estrita: nada de `any` implícito; preferir tipos inferidos do Zod (`z.infer`).
- Cobrir handlers e regras de negócio com testes Jest.
