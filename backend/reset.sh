#!/bin/bash

echo "[RESET] Matando uvicorn..."
pkill -f "uvicorn"
sleep 1

echo "[RESET] Reiniciando uvicorn..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000

echo "[RESET] Servidor reiniciado OK."
