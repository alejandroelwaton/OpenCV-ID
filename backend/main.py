import os
import numpy as np
import cv2
import shutil
import subprocess
import json

#Model
from detective.capture import save_capture
from detective.trainer import train_model
from detective.recongizer import Recognizer

#API
from fastapi import FastAPI, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


DATASET_DIR = "dataset"
MODEL_FILE = "detective/trainer/trainer.yml"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "dataset"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/upload")
async def upload_image(
    file: UploadFile,
    user_id: str = Form(...),
    name: str = Form(None),
    role: str = Form(None),
    age: str = Form(None)
):
    user_dir = os.path.join(UPLOAD_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    path = save_capture(user_id, file.file, file.filename)
    # Guardar imagen
    # Guardar o actualizar info.json
    info_path = os.path.join(user_dir, "info.json")
    info = {}
    if os.path.exists(info_path):
        with open(info_path, "r") as f:
            try:
                info = json.load(f)
            except json.JSONDecodeError:
                info = {}

    # Actualiza con nuevos datos recibidos
    if name:
        info["name"] = name
    if role:
        info["role"] = role
    if age:
        info["age"] = age

    with open(info_path, "w") as f:
        json.dump(info, f, indent=2)

    return {"message": f"Imagen y datos guardados para usuario {user_id}"}


@app.post("/train")
async def train():
    result = train_model()
    return {"status": "training complete", "message": result}


recognizer = Recognizer()

@app.post("/recognize")
async def recognize(file: UploadFile):
    contents = await file.read()
    npimg = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Image cannot be decoded"}

    results = recognizer.recognize(img)
    return {"results": results}

@app.websocket("/liveRecognize")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    recognizer = Recognizer()

    try:
        while True:
            data = await websocket.receive_bytes()
            np_arr = np.frombuffer(data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            results = recognizer.recognize(img)
            await websocket.send_json({"results": results})

    except WebSocketDisconnect:
        print("Closed Client Conection")

    except Exception as e:
        print("WS error:", e)

    finally:
        print("WS closed OK")

@app.post("/reset")
async def reset_system():
    # 1️⃣ Borrar carpeta de IDs
    if os.path.exists(DATASET_DIR):
        shutil.rmtree(DATASET_DIR)
        print(f"✅ Carpeta '{DATASET_DIR}' eliminada.")
    else:
        print(f"⚠️ Carpeta '{DATASET_DIR}' no existe.")

    if os.path.exists(MODEL_FILE):
        os.remove(MODEL_FILE)
        print(f"File '{MODEL_FILE}' deleted.")
    else:
        print(f"File '{MODEL_FILE}' doesnt exists.")

    subprocess.Popen(["/bin/bash", "/home/alej0/Programation/OpenCV-dev/backend/reset.sh"])
    print("rebooting server...")

    return JSONResponse({"message": "Sistema reiniciado: datos y modelo eliminados."})


@app.get("/ids")
async def get_ids():
    ids_dir = os.path.join(os.getcwd(), "dataset")
    users = []

    if os.path.exists(ids_dir):
        for entry in os.listdir(ids_dir):
            entry_path = os.path.join(ids_dir, entry)
            if os.path.isdir(entry_path) and entry.isdigit():
                user_id = entry
                info_path = os.path.join(entry_path, "info.json")
                info = {}
                if os.path.exists(info_path):
                    with open(info_path, "r") as f:
                        try:
                            info = json.load(f)
                        except json.JSONDecodeError:
                            info = {}

                users.append({
                    "id": user_id,
                    "info": info
                })

    return JSONResponse(content={"users": users})