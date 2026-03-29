# Frontend

## Muc dich

`frontend/` la ung dung React + TypeScript + Vite cho giao dien user-facing.

## Cau truc thu muc

```text
frontend/
|-- src/
|   |-- components/   # shared UI, layout, stepper, chat shell
|   |-- features/     # auth va procedure logic
|   |-- lib/          # api client, hooks, helper
|   |-- pages/        # route pages
|   |-- tests/        # test setup
|   `-- theme/        # theme tokens
|-- .env
|-- .env.example
|-- package.json
`-- vite.config.ts
```

## Cac route chinh

- `/`: trang chu
- `/guide`: huong dan thu tuc
- `/library`: thu vien tai lieu
- `/support`: tro ly phap ly AI
- `/auth/login`, `/auth/register`, `/auth/complete-profile`
- `/register`, `/documents`, `/processing`, `/results`, `/submit`, `/history`, `/assistant`

## Env

File mau:

```text
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Chay local

```powershell
cd d:\Project\AI-agent\frontend
npm install
npm run dev
```

Frontend mac dinh chay tai `http://localhost:5173`.

## Verify

```powershell
cd d:\Project\AI-agent\frontend
npx tsc --noEmit
npm run test
npm run build
```

## Ghi chu

- Khong goi `fastapi-ai` truc tiep tu frontend.
- Moi API user-facing deu di qua `node-gateway`.
- `support` la public chat.
- `assistant` la tro ly ho so, can auth va co `submissionId`.
