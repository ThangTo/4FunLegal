# Node Gateway

## Muc dich

`node-gateway/` la backend Express + TypeScript, dong vai tro public API duy nhat cho frontend.

## Entry point

- `app.ts`: tao Express app, middleware, static uploads, routes
- `server.ts`: load env, connect DB, seed demo data, start server

## Cau truc thu muc

```text
node-gateway/
|-- app.ts
|-- server.ts
|-- src/
|   |-- config/       # db config
|   |-- controllers/  # nhan request, tra response
|   |-- middlewares/  # auth, upload, error handling
|   |-- models/       # mongoose schema
|   |-- routes/       # express router theo domain
|   |-- seeds/        # demo data
|   |-- services/     # business logic
|   |-- tests/        # vitest + supertest
|   |-- types/        # express type augment
|   `-- utils/        # helper dung chung
|-- uploads/          # file upload local
|-- .env
|-- .env.example
`-- package.json
```

## Domain chinh

- `auth`
- `submission`
- `document`
- `review`
- `assistant`
- `legal-assistant`
- `library`
- `content`
- `user`

## Env quan trong

- `MONGODB_URI`
- `ALLOW_IN_MEMORY_DB_FALLBACK`
- `SEED_DEMO_DATA`
- `SEED_SAMPLE_SUBMISSIONS`
- `FRONTEND_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FASTAPI_AI_BASE_URL`
- `FASTAPI_INTERNAL_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

## Chay local

```powershell
cd d:\Project\AI-agent\node-gateway
npm install
npm run dev
```

Service mac dinh chay tai `http://localhost:3000`.

## Verify

```powershell
cd d:\Project\AI-agent\node-gateway
npm run test
npm run build
```

## Ghi chu

- Neu MongoDB chinh khong ket noi duoc, local dev co the fallback sang in-memory MongoDB.
- Upload file luu o `uploads/`, DB chi luu metadata va path.
- `fastapi-ai` chi duoc goi bang internal key, khong mo public truc tiep cho frontend.
