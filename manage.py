#!/usr/bin/env python
"""Wrapper for backend/manage.py - run Django management commands from project root."""
import subprocess
import sys
import os

# Change to backend directory and run manage.py
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.exit(subprocess.call([sys.executable, os.path.join(backend_path, 'manage.py')] + sys.argv[1:]))
