# AI Agent Workspace

Repo nay gom 3 package chinh:

- `frontend/`: ung dung React + TypeScript + Vite cho giao dien nguoi dung.
- `node-gateway/`: backend Express + TypeScript + MongoDB, dong vai tro API public duy nhat.
- `fastapi-ai/`: AI microservice FastAPI phuc vu review ho so, tro ly ho so, va tro ly phap ly.

## Cau truc thu muc

```text
AI-agent/
|-- frontend/
|-- node-gateway/
|-- fastapi-ai/
|-- AGENTS.md
`-- README.md
```

## Luong he thong

- `frontend` goi API qua `node-gateway`.
- `node-gateway` xu ly auth, submission, document, review, history va legal assistant public.
- `fastapi-ai` chi nhan request noi bo tu `node-gateway`.

## Chay local nhanh

Mo 3 terminal rieng:

### Cach ngan nhat de go

```powershell
cd d:\Project\AI-agent
.\ai.cmd
.\api.cmd
.\fe.cmd
```

Neu muon mo ca 3 service cung luc:

```powershell
cd d:\Project\AI-agent
.\all.cmd
```

### 1. FastAPI AI

```powershell
cd d:\Project\AI-agent
.\ai.cmd
```

Service mac dinh chay tai `http://localhost:8000`.

### 2. Node gateway

```powershell
cd d:\Project\AI-agent
.\api.cmd
```

Service mac dinh chay tai `http://localhost:3000`.

### 3. Frontend

```powershell
cd d:\Project\AI-agent
.\fe.cmd
```

Service mac dinh chay tai `http://localhost:5173`.

## Env local

- `frontend/.env`: tro toi `http://localhost:3000/api/v1`
- `node-gateway/.env`: auth, MongoDB, Google OAuth, FastAPI internal config
- `fastapi-ai/.env`: internal API key, AI provider, Neo4j, Gemini

Luu y:

- `node-gateway/.env` va `fastapi-ai/.env` phai dung cung key noi bo:
  - `FASTAPI_INTERNAL_API_KEY`
  - `INTERNAL_API_KEY`
- Google callback local hien tai la:
  - `http://localhost:3000/api/v1/auth/google/callback`

## Verify

### Frontend

```powershell
cd d:\Project\AI-agent\frontend
npx tsc --noEmit
npm run test
npm run build
```

### Node gateway

```powershell
cd d:\Project\AI-agent\node-gateway
npm run test
npm run build
```

### FastAPI AI

```powershell
cd d:\Project\AI-agent\fastapi-ai
.\venv\Scripts\python.exe -m unittest discover -s tests
```

## Tai lieu tung package

- [Frontend README](./frontend/README.md)
- [Node Gateway README](./node-gateway/README.md)
- [FastAPI AI README](./fastapi-ai/README.md)
