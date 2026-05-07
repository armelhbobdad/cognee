"""cognee-desktop Python sidecar — FastAPI app exposed via uvicorn.

The sidecar will host the cognee runtime (graph adapter, vector
adapter, search/cognify pipelines). For now only the /health endpoint
is implemented; the Bun main process polls it during startup to
confirm the subprocess is ready before the renderer issues RPC calls.
"""

import os

from fastapi import FastAPI

app = FastAPI(title="cognee-desktop sidecar", version="0.1.0")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "cognee-desktop-sidecar"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8765))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
