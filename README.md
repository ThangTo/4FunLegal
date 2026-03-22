# Legal Fact-Checking System for Business Registration

This project is a scaffold for a complex web application that allows users to fill out business registration forms, which are then verified against Vietnamese Enterprise Law using a Multi-Agent system and GraphRAG (Neo4j).

## Project Structure

```text
d:/Project/AI-agent/
├── frontend/             # ReactJS (Vite), Tailwind CSS, React Hook Form, Zod
├── node-gateway/         # Node.js (Express) + MongoDB API Gateway and Auth
├── fastapi-ai/           # FastAPI (Python), LangChain, Neo4j GraphRAG Service
└── README.md             # This file
```

## Setup Instructions

### 1. Database Requirements

- **MongoDB**: Required for the `node-gateway` to store user accounts and submission logs. Ensure MongoDB is installed and running locally on port 27017, or use a MongoDB Atlas URI.
- **Neo4j**: Required for the `fastapi-ai` service. You can use Neo4j Desktop or run one via Docker:
  ```bash
  docker run \
      --name neo4j \
      -p 7474:7474 -p 7687:7687 \
      -e NEO4J_AUTH=neo4j/password \
      neo4j:latest
  ```

### 2. Node.js API Gateway (`node-gateway/`)

Open a new terminal:

```bash
cd node-gateway
npm install
cp .env.example .env
npm run dev
```

The Gateway will start on `http://localhost:3000`.

### 3. FastAPI AI Service (`fastapi-ai/`)

Open a new terminal:

```bash
cd fastapi-ai
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

The AI Service will start on `http://localhost:8000` (Docs available at `http://localhost:8000/docs`).

### 4. React Frontend (`frontend/`)

Open a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The Vite development server will start on `http://localhost:5173`.
