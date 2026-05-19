# Arquitetura — api-tasks-demo

```mermaid
graph TB
    Client([Cliente])

    API["API<br/>(Express + TypeScript)"]
    Auth["Módulo de Auth<br/>(JWT + hash)"]

    DB[("PostgreSQL")]
    Redis[("Redis")]
    Broker{{"RabbitMQ"}}
    Workers["Consumidores"]

    Client --> API
    API --> Auth
    API --> DB
    API --> Redis
    API --> Broker
    Broker --> Workers

    classDef app   fill:#dbeafe,stroke:#1e40af,color:#0b1220
    classDef store fill:#fde68a,stroke:#92400e,color:#1a1206
    classDef queue fill:#fbcfe8,stroke:#9d174d,color:#1a0a14
    classDef ext   fill:#e5e7eb,stroke:#374151,color:#111827

    class API,Auth app
    class DB,Redis store
    class Broker queue
    class Client,Workers ext
```

## Legenda

- **Azul:** código da aplicação (API + módulo de auth).
- **Cilindros amarelos:** datastores (Postgres para dados, Redis para cache).
- **Hexágono rosa:** broker de mensageria (RabbitMQ).
- **Cinza:** atores externos ao serviço (cliente e consumidores assíncronos).
