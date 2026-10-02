import os
import sys
import importlib.util

# Ensure 'app' refers to the 'app' package directory, not this runner script
backend_dir = os.path.dirname(os.path.abspath(__file__))
app_init = os.path.join(backend_dir, "app", "__init__.py")
if "app" not in sys.modules or not hasattr(sys.modules["app"], "__path__"):
    spec = importlib.util.spec_from_file_location(
        "app",
        app_init,
        submodule_search_locations=[os.path.join(backend_dir, "app")]
    )
    app_pkg = importlib.util.module_from_spec(spec)
    sys.modules["app"] = app_pkg
    spec.loader.exec_module(app_pkg)

import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"[*] Starting {settings.PROJECT_NAME} on http://{settings.HOST}:{settings.PORT} ...")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        ws="websockets",
    )
