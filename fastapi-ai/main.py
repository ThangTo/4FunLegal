from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from dotenv import load_dotenv
from services.rag_agent import verify_registration_data
import os

load_dotenv()

app = FastAPI(
    title="Legal Fact-Checking AI Service",
    description="AI backend to verify business registration using GraphRAG",
    version="1.0.0"
)

class RegistrationPayload(BaseModel):
    companyName: str
    businessType: str
    capital: float
    # Add other fields as necessary

@app.post("/api/v1/verify-registration")
async def verify_registration(payload: RegistrationPayload):
    try:
        # Pass the payload to our LangChain / GraphRAG agent
        result = await verify_registration_data(payload.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "OK", "message": "FastAPI AI Service is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
