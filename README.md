# Chat API

A private one-to-one **text** chat API built with Node.js, TypeScript, Express,
PostgreSQL, and Socket.IO, following **Hexagonal Architecture (Ports &
Adapters)** and Clean Code principles.

REST is the **source of truth** for persistence and history. Socket.IO is only a
real-time delivery channel: a message is always persisted through the same
application use case before anyone is notified.

---

## Features

- Email/password authentication with **Argon2id** hashing and **JWT** access tokens.
- Send text messages and retrieve paginated conversation history (cursor-based).
- Real-time delivery over authenticated Socket.IO connections to private rooms.
- Decorator-based request validation (`class-validator` + `class-transformer`).
- Centralized error handling with a consistent response envelope.
- Rate limiting, CORS, Helmet, and strict environment validation.
- OpenAPI/Swagger documentation.
- Unit, integration, and Socket.IO tests (Vitest + Supertest).
- Docker Compose for local PostgreSQL; migrations and a seed script.

---

## Architecture

```
presentation  ──▶  application  ──▶  domain  ◀──  infrastructure
 (HTTP, sockets)     (use cases)     (entities, ports)   (adapters implement ports)
```

Dependencies point **inward**. The domain knows nothing about Express, Prisma,
or Socket.IO.

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `domain` | Entities, value objects, invariants, repository **ports** | `User`, `Message`, `Email`, `MessageContent`, `UserRepository` |
| `application` | Use cases orchestrating domain + ports | `SignUpUser`, `LoginUser`, `SendMessage`, `GetConversationMessages` |
| `infrastructure` | Adapters implementing ports + composition root | `PrismaUserRepository`, `Argon2PasswordHasher`, `JwtTokenService`, `container.ts` |
| `presentation` | Transport adapters (controllers, routes, middleware, sockets, DTOs) | `AuthController`, `MessageController`, `ChatSocketHandler` |

### Request flow (REST)

```
route → auth middleware (JWT → principal) → validation middleware
      → controller → use case → repository port → Prisma adapter → PostgreSQL
      ← controller maps result → { success, data } envelope
```

### Real-time flow (Socket.IO)

```
connect (JWT in handshake) → join private room `user:<id>`
message:send → validate payload → SendMessage use case (persists FIRST)
             → emit `message:new` to recipient room (+ sender's other devices)
             → ack to the origin socket
failure      → emit `message:error` (nothing is broadcast)
```

---

## Requirements

- Node.js >= 20
- Docker (for local PostgreSQL) **or** an accessible PostgreSQL 14+ instance

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at least `JWT_SECRET` (>= 32 characters). The default
`DATABASE_URL` matches the bundled `docker-compose.yml`.

### 3. Start PostgreSQL

```bash
npm run docker:up
```

This starts PostgreSQL and also creates an isolated `chatdb_test` database used
by the integration tests.

### 4. Run migrations & seed

```bash
npm run prisma:generate
npm run prisma:migrate      # applies migrations (dev)
npm run db:seed             # optional: creates alice@example.com / bob@example.com
```

### 5. Run the API

```bash
npm run dev                 # watch mode
# or
npm run build && npm start  # production build
```

The API is served at `http://localhost:3000`, Swagger UI at `/docs`, and the raw
OpenAPI document at `/openapi.json`.

---

## Configuration

All configuration is read from environment variables and validated at startup
(see `src/infrastructure/config/env.ts`). An invalid configuration aborts the
process immediately.

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Signing secret (>= 32 chars) | — |
| `JWT_EXPIRES_IN` | Access token TTL | `1h` |
| `ARGON2_MEMORY_COST` / `ARGON2_TIME_COST` / `ARGON2_PARALLELISM` | Argon2id parameters | `19456` / `2` / `1` |
| `CORS_ORIGIN` | Comma-separated allowed origins or `*` | `*` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | Rate limiting | `60000` / `100` / `10` |
| `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` | Pagination bounds | `20` / `100` |

---

## API reference

Base path: `/api/v1`. All responses use a consistent envelope.

**Success**

```json
{ "success": true, "data": {} }
```

**Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [{ "field": "email", "code": "invalid", "message": "..." }]
  }
}
```

| Method | Path | Auth | Description | Success |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/signup` | — | Register a user | `201` |
| `POST` | `/auth/login` | — | Authenticate | `200` |
| `POST` | `/messages` | Bearer | Send a message | `201` |
| `GET` | `/chats/{userId}/messages` | Bearer | Paginated conversation (chronological) | `200` |

Status codes: `400` invalid input, `401` missing/invalid auth, `403` forbidden,
`404` not found, `409` conflict (duplicate email), `429` rate limited.

### Example

```bash
# Sign up
curl -s -X POST http://localhost:3000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"secret123"}'

# Send a message (replace TOKEN and RECIPIENT_ID)
curl -s -X POST http://localhost:3000/api/v1/messages \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$RECIPIENT_ID\",\"content\":\"Hello!\"}"

# Get a conversation page
curl -s "http://localhost:3000/api/v1/chats/$RECIPIENT_ID/messages?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Pagination is **cursor-based**: read `data.nextCursor` and pass it back as
`?cursor=...` to fetch older messages. `nextCursor` is `null` when the history
is exhausted.

---

## Socket.IO

Connect with the JWT in the handshake:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { auth: { token } });
```

### Events

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `message:send` | `{ recipientId, content }` (+ optional ack callback) |
| server → client | `message:new` | `{ id, senderId, recipientId, content, createdAt }` |
| server → client | `message:error` | `{ code, message, details }` |

- Each authenticated socket joins only its own private room (`user:<id>`).
- Senders receive an ack with the persisted message; their other devices receive
  `message:new`.
- Nothing is broadcast until the message is persisted. If persistence fails,
  only `message:error` is emitted.

---

## Testing

Integration tests require the Docker PostgreSQL service (they use `chatdb_test`,
which `globalSetup` migrates automatically).

```bash
npm run docker:up          # once
npm test                   # all tests
npm run test:unit          # domain + use cases (no database)
npm run test:integration   # HTTP + Socket.IO (requires the database)
```

Coverage includes:

- Domain value objects and business rules.
- Use cases with in-memory repository fakes (no DB, no framework).
- HTTP integration for signup, login, messaging, pagination, and validation.
- Authorization: users cannot read conversations they are not part of.
- Socket.IO: authentication, private delivery, error events, and the guarantee
  that messages are persisted before recipients are notified.

---

## Project structure

```
src/
  domain/
    entities/          User, Message
    value-objects/     Email, MessageContent
    repositories/      UserRepository, MessageRepository (ports)
    errors/            DomainError + specific errors
  application/
    use-cases/         SignUpUser, LoginUser, SendMessage, GetConversationMessages
    ports/             PasswordHasher, TokenService
    errors/            Application errors
  infrastructure/
    config/            Validated environment
    database/          Prisma client
    repositories/      Prisma adapters
    security/          Argon2 hasher, JWT service
    sockets/           Authenticated Socket.IO server
    container.ts       Composition root (dependency injection)
  presentation/
    http/              controllers, routes, middlewares, validators, mappers, openapi/
    sockets/           ChatSocketHandler, socket DTOs
  shared/              errors, types, pagination cursor
  app.ts               Express app factory
  server.ts            HTTP + Socket.IO bootstrap, graceful shutdown
tests/
  unit/ integration/ sockets/ helpers/
prisma/
  schema.prisma  migrations/  seed.ts
```

---

## Design decisions & trade-offs

- **Prisma over TypeORM.** Prisma gives a single typed schema, first-class
  migrations, and a generated client with excellent TypeScript inference at the
  cost of a build step (`prisma generate`) and less flexibility for very complex
  relational mapping. For a CRUD-style chat domain it is the pragmatic choice.
- **Same use case for REST and sockets.** `SendMessage` is the single place that
  enforces the persistence-before-broadcast guarantee; the socket handler cannot
  diverge from the REST path.
- **Value objects for `Email` and `MessageContent`.** Normalization (email) and
  the message-length/emptiness rules live in the domain, so REST DTOs and socket
  DTOs never re-implement them. DTO validation only covers transport shape.
- **Cursor (keyset) pagination.** Stable under inserts and cheap with the
  `(sender, recipient, created_at, id)` index; message ordering is deterministic
  even when timestamps collide.
- **Domain errors are HTTP-agnostic.** The presentation layer maps error codes
  to statuses; the domain never imports HTTP concepts.
- **Explicit composition root.** No service locator or global registry — adapters
  are wired to ports in `container.ts` only.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start in watch mode |
| `npm run build` / `npm start` | Compile and run the production build |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm test` | Run the full test suite |
| `npm run prisma:migrate` | Create/apply dev migrations |
| `npm run db:seed` | Seed development data |
| `npm run docker:up` / `npm run docker:down` | Manage local PostgreSQL |
# chat-app
