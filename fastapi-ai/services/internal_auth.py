import os

from fastapi import Header, HTTPException, status


def require_internal_api_key(
    x_internal_api_key: str | None = Header(default=None),
) -> None:
    expected_key = os.getenv("INTERNAL_API_KEY", "dev-fastapi-internal-key")

    if x_internal_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
