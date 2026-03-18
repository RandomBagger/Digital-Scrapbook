# Digital Scrapbook

A modern, interactive web application for collecting, organizing, and rating your favorite web content. Save URLs with screenshots, generate QR codes, add tags and descriptions, and share your discoveries with a beautiful glass-morphism interface.

## 🚀 Live Demo

Try it out now: [Digital Scrapbook Live Demo](https://digitalscrapebook.pythonanywhere.com/)

## Features

✨ **Core Functionality**
- 🔗 **URL Scrapbooking** - Save and manage links with metadata
- 📸 **Screenshot Capture** - Automatically capture images of saved URLs
- 🎯 **QR Code Generation** - Generate QR codes for any saved link
- 🏷️ **Smart Tagging** - Organize content with custom tags
- ⭐ **Rating System** - Rate and review saved content
- 💾 **Persistent Sessions** - Your scrapbook persists across browser sessions

🛡️ **Security & Performance**
- Server-side session management with cryptographic signing
- Rate limiting to prevent abuse (200 per day, 60 per minute)
- SQLite database with proper transaction handling
- Session-based isolation for user data

🎨 **Design**
- Glass morphism UI with organic ripple effects
- Responsive design for desktop and mobile
- Beautiful handwriting-style fonts (Caveat & Special Elite)
- Smooth animations and transitions

## Tech Stack

- **Backend**: Flask
- **Database**: SQLite3
- **Session Management**: Flask-Session (filesystem-based)
- **Rate Limiting**: Flask-Limiter
- **QR Codes**: qrcode
- **Image Processing**: Pillow
- **HTTP Requests**: requests

## Installation

### Prerequisites
- Python 3.7+
- pip

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/RandomBagger/Digital-Scrapbook.git
   cd Digital-Scrapbook
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python run.py
   ```

5. **Access the app**
   Open your browser and navigate to `http://localhost:5000`

## Usage

### Adding Content
1. Enter a URL in the text field (e.g., `example.com` or `https://example.com`)
2. Optionally add:
   - Title for the bookmark
   - Description of the content
   - Tags for organization
3. Click "Add" to save the link

### Managing Your Scrapbook
- **View all saved links** - Browse your collection on the main page
- **Rate content** - Click the stars to rate saved items (1-5)
- **Search and filter** - Use tags to organize and find content
- **View QR codes** - Quickly access saved links via QR code

## Project Structure

```
Digital-Scrapbook/
├── app.py                 # Flask application & API routes
├── run.py                 # Application entry point
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── scrapbook.db          # SQLite database (auto-created)
├── flask_sessions/       # Session storage (auto-created)
├── static/
│   ├── script.js         # Frontend JavaScript
│   └── style.css         # CSS styling
└── templates/
    └── index.html        # Main HTML template
```

## API Endpoints

### GET `/api/posts`
Retrieve all saved posts with ratings
- **Rate limit**: 60 per minute
- **Response**: Array of post objects

### POST `/api/posts`
Create a new post
- **Rate limit**: 10 per minute
- **Request body**:
  ```json
  {
    "url": "https://example.com",
    "title": "Example",
    "description": "An interesting link",
    "tags": ["example", "web"],
    "image_data": "base64_image_string",
    "qr_code_data": "base64_qr_string"
  }
  ```

### POST `/api/posts/<id>/rate`
Rate a post (1-5 stars)
- **Rate limit**: 30 per minute
- **Request body**: `{"rating": 4.5}`

## Environment Variables

- `SCRAPBOOK_DB` - Path to SQLite database (default: `./scrapbook.db`)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - Feel free to use and modify for your own purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Happy scrapbooking! 📚✨**

