# Learning Management System SMPN 37 Jakarta — Backend API

REST API for a school learning-management system. Node + TypeScript + Express, backed by PostgreSQL via Prisma.

**Frontend repo:** [front-end-e-learning](https://github.com/attah1911/front-end-e-learning)
**Live:** https://back-end-e-learning.vercel.app · API docs at [`/api-docs`](https://back-end-e-learning.vercel.app/api-docs)

<!-- Screenshots: drop images in docs/ and reference them here (e.g. the Swagger UI). -->

## Stack

| | |
|---|---|
| Runtime | Node.js + TypeScript — runs `.ts` directly via `ts-node`, no build step |
| Framework | Express 4 |
| Database | PostgreSQL ([Neon](https://neon.tech)) via **Prisma 7** with the `@prisma/adapter-pg` driver adapter — no query-engine binary at runtime |
| Auth | JWT (Bearer, 12h expiry) · passwords hashed with **bcrypt** · email activation required before first login |
| Uploads | Multer (memory) → Cloudinary |
| Email | Nodemailer + EJS templates |
| Validation | Yup |
| API docs | swagger-autogen → Swagger UI at `/api-docs` |

## Features

- Three roles — **admin**, **guru** (teacher), **murid** (student) — enforced by JWT auth + ACL middleware on every route
- Register → activate by email → log in
- Subjects → materials → assignments → submissions → grading, with per-student enrollment
- Notifications: new material, new assignment, submission received, grading reminder
- Consistent response envelope: `{ meta: { status, message }, data, pagination? }`

## Data model

11 tables. `User` 1:1 `Teacher` / `Student`; `Teacher` 1:N `MataPelajaran` 1:N `MateriPelajaran` 1:N `Assignment` 1:N `Submission`. `Enrollment` and `AssignmentCompletion` are join tables. Foreign keys cascade on delete. Full schema: [`prisma/schema.prisma`](prisma/schema.prisma).

## Getting started

```bash
npm install
cp .env.example .env          # then fill in the values

npx prisma migrate deploy     # create the tables in your database
npm run db:seed               # load the demo dataset (logins below)

npm run dev                   # http://localhost:3000
```

You need your own PostgreSQL database — a free [Neon](https://neon.tech) project works. From its **Connect → Prisma** panel you get both connection strings.

### Environment

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`) — used at runtime |
| `DIRECT_URL` | Neon **direct** connection string — used by `prisma migrate` |
| `SECRET` | JWT signing key — generate with `openssl rand -hex 32` |
| `EMAIL_SMTP_HOST` / `PORT` / `SECURE` / `USER` / `PASS` / `SERVICE_NAME` | SMTP account for activation emails |
| `CLIENT_HOST` | frontend origin — used for CORS and activation links |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Cloudinary credentials |

### Seed logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@smpn37.sch.id` | `Admin123` |
| Guru | `budi@smpn37.sch.id` | `Guru123` |
| Murid | `andi@murid.smpn37.sch.id` | `Murid123` |

## Scripts

| | |
|---|---|
| `npm run dev` | nodemon + ts-node, port 3000 |
| `npm test` | unit tests (`node:test` via `tsx`) |
| `npm run db:seed` | wipe and reseed the database |
| `npm run db:deploy` | `prisma migrate deploy` (production migrations) |
| `npm run docs` | regenerate `src/docs/swagger-output.json` |

## Testing

A small `node:test` suite covering the security-sensitive pure logic — password
hashing (`utils/encryption`), JWT sign/verify (`utils/jwt`), the role guard
(`middlewares/acl.middleware`), and the `_id` response shim (`utils/response`).
Files live next to what they test as `*.test.ts`. No test framework, no DB.

## Project layout

```
src/
  index.ts             Express app + entrypoint
  routes/api.ts        all routes
  controllers/         one module per domain
  middlewares/         auth (JWT) · acl (role) · media (upload)
  utils/               prisma · jwt · response · encryption · mail/
  validators.ts        Yup request schemas
prisma/
  schema.prisma        11 models
  migrations/
  seed.ts              demo dataset
```

Deployed on Vercel as a single serverless function (`src/index.ts`), pinned to the `sin1` region to sit next to the database.
