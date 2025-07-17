from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, time_entries, users, monthly_targets
from app.database import engine
from app.database import Base
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartPonto API",
    description="Time tracking application with photo capture and OCR",
    version="1.0.0"
)

# Get allowed origins from environment variable or use defaults
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(time_entries.router, prefix="/time-entries", tags=["Time Entries"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(monthly_targets.router, prefix="/monthly-targets", tags=["Monthly Targets"])

@app.get("/")
async def root():
    return {"message": "SmartPonto API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
