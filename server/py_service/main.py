import os
import json
from contextlib import asynccontextmanager

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from transformers import pipeline

MODEL_NAME = os.getenv("HF_MODEL", "IDEA-CCNL/Erlangshen-Roberta-330M-NLI")

classifier = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global classifier
    print(f"[py_service] loading model {MODEL_NAME} ...", flush=True)
    classifier = pipeline("zero-shot-classification", model=MODEL_NAME)
    print("[py_service] model loaded successfully", flush=True)
    yield
    print("[py_service] shutting down")

app = FastAPI(lifespan=lifespan)

class ClassifyRequest(BaseModel):
    query: str
    labels: list[str]

class ClassifyResponse(BaseModel):
    label: str
    scores: list[float]
    top_idx: int

@app.post("/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest):
    result = classifier(req.query, req.labels)
    top_label = result["labels"][0]
    top_idx = req.labels.index(top_label) if top_label in req.labels else 0

    scores_in_order = [0.0] * len(req.labels)
    for lbl, scr in zip(result["labels"], result["scores"]):
        if lbl in req.labels:
            scores_in_order[req.labels.index(lbl)] = scr

    return ClassifyResponse(label=top_label, scores=scores_in_order, top_idx=top_idx)

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": classifier is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
