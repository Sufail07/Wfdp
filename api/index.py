import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app

# Vercel expects the ASGI app to be named 'app' or 'handler'
# This file is the entrypoint for Vercel serverless functions