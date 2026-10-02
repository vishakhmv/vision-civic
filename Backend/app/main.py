import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.detectors.registry import DetectorRegistry
from app.api.auth import router as auth_router
from app.api.incidents import router as incidents_router
from app.api.uploads import router as uploads_router
from app.api.analytics import router as analytics_router
from app.api.users import router as users_router
from app.api.monitoring import router as monitoring_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("vision_civic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Vision Civic Backend services...")
    await connect_to_mongo()
    # Preload detector models asynchronously
    try:
        DetectorRegistry.preload_all()
    except Exception as e:
        logger.warning("Detector preload encountered warning: %s", e)
    logger.info("Vision Civic Backend initialized successfully.")
    yield
    # Shutdown
    logger.info("Shutting down Vision Civic Backend...")
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration - supports credentials for HTTP-only cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Media is hosted directly on Cloudinary; MongoDB holds document references.
# No permanent media files are stored locally.

# Mount API routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(uploads_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(monitoring_router, prefix=settings.API_V1_STR)


@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

