from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_tables
from app.routers import auth, profile, scan, expenses
from app.config import settings

app = FastAPI(
    title="LensAssist API",
    description="AI-powered vision analysis for the physical world",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_tables()


app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": "LensAssist API",
        "version": "1.0.0",
        "status": "running",
        "team": "Team InnovAIT.",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
