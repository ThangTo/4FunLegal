"""
V-Legal FastAPI entrypoint.

Public endpoints:
- POST /api/v1/ask
- POST /api/v1/verify-registration
- GET  /health

Internal endpoints:
- POST /internal/v1/reviews/analyze
- POST /internal/v1/assistant/reply
- POST /internal/v1/legal/ask
"""

import os

from app_factory import create_app

app = create_app()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
