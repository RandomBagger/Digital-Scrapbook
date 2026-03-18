from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3
import uuid
import json
import os
from datetime import timedelta

# ── App setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = 'scrapbook-secret-2024-xyz'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

# ── Flask-Session: server-side filesystem sessions ──────────────────────────
SESSION_DIR = os.path.join(os.path.dirname(__file__), 'flask_sessions')
os.makedirs(SESSION_DIR, exist_ok=True)

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = SESSION_DIR
app.config['SESSION_PERMANENT'] = True
app.config['SESSION_USE_SIGNER'] = True       # signs the session cookie
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
Session(app)

# ── Flask-Limiter: rate limiting by IP ─────────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=['200 per day', '60 per minute'],
    storage_uri='memory://',
)

DATABASE = os.environ.get('SCRAPBOOK_DB', os.path.join(os.path.dirname(__file__), 'scrapbook.db'))


# ── Database helpers ────────────────────────────────────────────────────────
def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    with get_db() as db:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                url TEXT NOT NULL,
                image_data TEXT,
                qr_code_data TEXT,
                title TEXT DEFAULT '',
                description TEXT DEFAULT '',
                tags TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                session_id TEXT NOT NULL,
                rating REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, session_id),
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            );
        ''')


# ── Error handlers ──────────────────────────────────────────────────────────
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Rate limit exceeded', 'detail': str(e.description)}), 429


# ── Session middleware ──────────────────────────────────────────────────────
@app.before_request
def ensure_session():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        session.permanent = True


# ── Routes ──────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/posts', methods=['GET'])
@limiter.limit('60 per minute')
def get_posts():
    sid = session.get('session_id')
    db = get_db()
    posts = db.execute('''
        SELECT
            p.*,
            COALESCE(AVG(r.rating), NULL) AS avg_rating,
            COUNT(r.id) AS rating_count,
            (SELECT rating FROM ratings WHERE post_id = p.id AND session_id = ?) AS user_rating
        FROM posts p
        LEFT JOIN ratings r ON p.id = r.post_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    ''', (sid,)).fetchall()

    result = []
    for p in posts:
        result.append({
            'id': p['id'],
            'url': p['url'],
            'image_data': p['image_data'],
            'qr_code_data': p['qr_code_data'],
            'title': p['title'] or '',
            'description': p['description'] or '',
            'tags': json.loads(p['tags']) if p['tags'] else [],
            'created_at': p['created_at'],
            'avg_rating': p['avg_rating'],
            'rating_count': p['rating_count'],
            'user_rating': p['user_rating'],
            'is_owner': p['session_id'] == sid
        })

    return jsonify(result)


@app.route('/api/posts', methods=['POST'])
@limiter.limit('10 per minute')
def create_post():
    sid = session.get('session_id')
    data = request.get_json()

    url = (data.get('url') or '').strip()
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    image_data = data.get('image_data') or None
    qr_code_data = data.get('qr_code_data') or None
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    raw_tags = data.get('tags') or []
    tags = json.dumps([t.strip() for t in raw_tags if t.strip()])

    db = get_db()
    cursor = db.execute('''
        INSERT INTO posts (session_id, url, image_data, qr_code_data, title, description, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (sid, url, image_data, qr_code_data, title, description, tags))
    db.commit()

    post_id = cursor.lastrowid
    post = db.execute('SELECT * FROM posts WHERE id = ?', (post_id,)).fetchone()

    return jsonify({
        'id': post_id,
        'url': post['url'],
        'image_data': post['image_data'],
        'qr_code_data': post['qr_code_data'],
        'title': post['title'] or '',
        'description': post['description'] or '',
        'tags': json.loads(post['tags']) if post['tags'] else [],
        'created_at': post['created_at'],
        'avg_rating': None,
        'rating_count': 0,
        'user_rating': None,
        'is_owner': True
    }), 201


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
@limiter.limit('5 per minute')
def delete_post(post_id):
    sid = session.get('session_id')
    db = get_db()
    post = db.execute('SELECT * FROM posts WHERE id = ?', (post_id,)).fetchone()
    if not post:
        return jsonify({'error': 'Not found'}), 404
    if post['session_id'] != sid:
        return jsonify({'error': 'Forbidden'}), 403
    db.execute('DELETE FROM ratings WHERE post_id = ?', (post_id,))
    db.execute('DELETE FROM posts WHERE id = ?', (post_id,))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/rate/<int:post_id>', methods=['POST'])
@limiter.limit('30 per minute')
def rate_post(post_id):
    sid = session.get('session_id')
    data = request.get_json()
    rating = float(data.get('rating', 50))
    rating = max(0, min(100, rating))

    db = get_db()
    post = db.execute('SELECT id FROM posts WHERE id = ?', (post_id,)).fetchone()
    if not post:
        return jsonify({'error': 'Not found'}), 404

    db.execute('''
        INSERT INTO ratings (post_id, session_id, rating)
        VALUES (?, ?, ?)
        ON CONFLICT(post_id, session_id) DO UPDATE SET rating = excluded.rating
    ''', (post_id, sid, rating))
    db.commit()

    stats = db.execute('''
        SELECT AVG(rating) AS avg, COUNT(*) AS cnt
        FROM ratings WHERE post_id = ?
    ''', (post_id,)).fetchone()

    return jsonify({
        'avg_rating': stats['avg'],
        'rating_count': stats['cnt'],
        'user_rating': rating
    })


@app.route('/api/session')
def get_session():
    return jsonify({'session_id': session.get('session_id')})


if __name__ == '__main__':
    init_db()
    print('\n' + '='*50)
    print('  🎨  Digital Scrapbook')
    print('  👉  http://localhost:5000')
    print('='*50 + '\n')
    app.run(debug=True, port=5000)
