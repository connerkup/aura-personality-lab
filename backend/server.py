#!/usr/bin/env python3
"""
Aura Tier-2 Production ASGI Server Launcher (`backend/server.py`).

Launches the FastAPI + Pydantic v2 + SQLite (WAL) application via Uvicorn:
    /home/ubuntu/personality-lab/.venv/bin/python /home/ubuntu/personality-lab/backend/server.py 8095
"""

from __future__ import annotations
from pathlib import Path
import sys
import uvicorn

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app


def run_server(port: int = 8095) -> None:
    print(f"Aura Tier-2 FastAPI + SQLite (WAL) Server listening on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    port_arg = int(sys.argv[1]) if len(sys.argv) > 1 else 8095
    run_server(port_arg)
