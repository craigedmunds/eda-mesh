from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
import yaml
import os

app = FastAPI()

@app.get("/", response_class=PlainTextResponse)
def get(request: Request):
    
    body = {
        
    }

    return PlainTextResponse(
        yaml.dump(body, sort_keys=False),
        media_type="application/json"
    )