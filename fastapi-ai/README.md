# FastAPI AI

## Muc dich

`fastapi-ai/` la AI microservice cho 3 nhom nhiem vu:

- legal QA public qua gateway
- dossier review noi bo
- dossier assistant noi bo

## Cau truc thu muc

```text
fastapi-ai/
|-- main.py              # entrypoint chay app
|-- app_factory.py       # tao FastAPI app va mount routes
|-- api_models.py        # pydantic payload models
|-- run_pipeline.py      # build knowledge base GraphRAG
|-- services/            # review, assistant, legal qa, internal auth
|-- src/
|   |-- agents/          # orchestrator va cac agent GraphRAG
|   |-- database/        # neo4j/chroma client va builder
|   |-- docs/            # tai lieu thiet ke
|   `-- pipeline/        # extract/parse/build input data
|-- tests/
|-- .env
|-- .env.example
|-- run.cmd
`-- run.ps1
```

## Endpoints

### Public

- `POST /api/v1/ask`
- `POST /api/v1/verify-registration`
- `GET /health`

### Internal

- `POST /internal/v1/reviews/analyze`
- `POST /internal/v1/assistant/reply`
- `POST /internal/v1/legal/ask`

## Env quan trong

- `PORT`
- `ALLOWED_ORIGINS`
- `INTERNAL_API_KEY`
- `AI_PROVIDER`
- `OCR_PROVIDER`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `GEMINI_API_KEY`
- `GEMINI_MODEL_NAME`
- `LEGAL_INPUT_DOC_PATH`

## Cach chay ngan

Thay vi go:

```powershell
.\venv\Scripts\python.exe main.py
```

gio anh co the dung:

```powershell
cd d:\Project\AI-agent\fastapi-ai
.\run.cmd
```

hoac:

```powershell
cd d:\Project\AI-agent\fastapi-ai
.\run.ps1
```

`run.cmd` la lua chon de nho nhat tren Windows.

Neu dang o root repo, anh co the go ngan hon nua:

```powershell
cd d:\Project\AI-agent
.\ai.cmd
```

## Chay local

```powershell
cd d:\Project\AI-agent\fastapi-ai
python -m venv venv
.\venv\Scripts\pip.exe install -r requirements.txt
.\run.cmd
```

Service mac dinh chay tai `http://localhost:8000`.

## Verify

```powershell
cd d:\Project\AI-agent\fastapi-ai
.\venv\Scripts\python.exe -m unittest discover -s tests
```

## GraphRAG that

Neu muon bat GraphRAG that thay vi deterministic fallback:

1. Dien dung `NEO4J_*` va `GEMINI_*` trong `.env`.
2. Chay:

```powershell
cd d:\Project\AI-agent\fastapi-ai
.\venv\Scripts\python.exe run_pipeline.py
```

3. Kiem tra `GET /health` co readiness tot.
