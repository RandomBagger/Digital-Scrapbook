#!/usr/bin/env python3
"""
Digital Scrapbook - Startup Script
Run:  python run.py
Then: Open http://localhost:5000
"""
from app import app, init_db

if __name__ == '__main__':
    init_db()
    print('\n' + '='*50)
    print('  🎨  Digital Scrapbook')
    print('  👉  http://localhost:5000')
    print('='*50 + '\n')
    app.run(debug=True, port=5000)
