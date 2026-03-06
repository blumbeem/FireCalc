from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from models import NormalFireInput, CoastFireInput, BaristaFireInput, FireResponse
from calculations import calculate_normal_fire, calculate_coast_fire, calculate_barista_fire

app = FastAPI(title="FireCalc API", description="Calculate FIRE scenarios")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/fire/normal", response_model=FireResponse)
def normal_fire(req: NormalFireInput) -> FireResponse:
    return calculate_normal_fire(req)

@app.post("/api/fire/coast", response_model=FireResponse)
def coast_fire(req: CoastFireInput) -> FireResponse:
    return calculate_coast_fire(req)

@app.post("/api/fire/barista", response_model=FireResponse)
def barista_fire(req: BaristaFireInput) -> FireResponse:
    return calculate_barista_fire(req)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
