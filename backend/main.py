from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from detective.capture import save_capture
from detective.trainer import train_model
from detective.recongizer import Recognizer
import numpy as np
import cv2

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
async def upload(file: UploadFile, user_id: str = Form(...)):
    path = save_capture(user_id, file.file, file.filename)
    return {"status": "success", "saved_to": path}


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

