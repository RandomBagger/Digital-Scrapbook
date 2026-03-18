/* ───────────────────────────────────────────────────
   Digital Scrapbook — frontend logic
   ─────────────────────────────────────────────────── */

const ROTATIONS = [-3, 1.5, -1, 2.5, -2, 0.5, 3, -1.5, 2, -2.5];

let currentImageDataUrl = null;
let allPosts = [];

/* ─── QR Code Generation ─────────────────────────── */
function generateQRCode(url, logoDataUrl) {
  return new Promise((resolve) => {
    const container = document.getElementById('qrGen');
    container.innerHTML = '';

    let qrInstance;
    try {
      qrInstance = new QRCode(container, {
        text: url,
        width: 300,
        height: 300,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (e) {
      resolve(null);
      return;
    }

    setTimeout(() => {
      const canvas = container.querySelector('canvas');
      if (!canvas) { resolve(null); return; }

      if (logoDataUrl) {
        const ctx = canvas.getContext('2d');
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
          const logoSize = Math.floor(canvas.width * 0.26);
          const x = Math.floor((canvas.width - logoSize) / 2);
          const y = Math.floor((canvas.height - logoSize) / 2);

          // White padding behind logo
          ctx.fillStyle = '#ffffff';
          const pad = 8;
          ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);

          // Draw logo, clipped to rounded square
          ctx.save();
          const r = 8;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + logoSize - r, y);
          ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + r);
          ctx.lineTo(x + logoSize, y + logoSize - r);
          ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - r, y + logoSize);
          ctx.lineTo(x + r, y + logoSize);
          ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logo, x, y, logoSize, logoSize);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };
        logo.onerror = () => resolve(canvas.toDataURL('image/png'));
        logo.src = logoDataUrl;
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    }, 150);
  });
}

/* ─── Stars Renderer ──────────────────────────────── */
function ratingToStars(rating) {
  // rating is 0–100 → 0–5 stars
  const stars = (rating / 100) * 5;
  const full = Math.floor(stars);
  const half = (stars - full) >= 0.4 ? 1 : 0;
  const empty = 5 - full - half;
  return '⭐'.repeat(full) + (half ? '✨' : '') + '☆'.repeat(empty);
}

function ratingToLabel(rating) {
  if (rating === null || rating === undefined) return '';
  if (rating >= 95) return '🔥 FIRE!';
  if (rating >= 75) return '🌶 Spicy!';
  if (rating >= 50) return '😍 Loving it';
  if (rating >= 25) return '👍 Pretty good';
  return '😐 Meh…';
}

/* ─── Tape element creator ────────────────────────── */
const TAPE_STYLES = [
  'tape-tl',
  'tape-tr',
  'tape-dots',
];
const TAPE_COLORS = [
  { bg: 'rgba(255,0,110,0.6)', stripe: 'rgba(255,80,160,0.35)' },
  { bg: 'rgba(139,0,255,0.6)', stripe: 'rgba(180,80,255,0.35)' },
  { bg: 'rgba(255,0,64,0.6)', stripe: 'rgba(255,80,120,0.35)' },
  { bg: 'rgba(220,0,200,0.55)', stripe: 'rgba(255,60,200,0.3)' },
  { bg: 'rgba(100,0,220,0.55)', stripe: 'rgba(160,0,255,0.3)' },
];

function makeTape(id) {
  const colorIdx = id % TAPE_COLORS.length;
  const c = TAPE_COLORS[colorIdx];
  const tape = document.createElement('div');
  tape.className = 'tape';

  // alternate positions
  if (id % 3 === 0) {
    tape.style.cssText = `top:-10px;left:${20 + (id % 4) * 12}px;width:${48 + (id % 3) * 10}px;transform:rotate(${-4 + (id % 7)}deg)`;
  } else if (id % 3 === 1) {
    tape.style.cssText = `top:-10px;right:${16 + (id % 5) * 8}px;width:${44 + (id % 4) * 8}px;transform:rotate(${2 + (id % 5)}deg)`;
  } else {
    tape.style.cssText = `bottom:-8px;left:50%;transform:translateX(-50%) rotate(${(id % 3) - 1}deg);width:${40 + (id % 4) * 10}px`;
  }

  tape.style.background = `repeating-linear-gradient(${id % 2 ? 45 : -45}deg,${c.bg},${c.bg} 4px,${c.stripe} 4px,${c.stripe} 8px)`;
  tape.style.height = '20px';
  tape.style.borderRadius = '2px';
  tape.style.opacity = '0.85';
  tape.style.position = 'absolute';
  return tape;
}

/* ─── Build Post Card HTML ────────────────────────── */
function buildCard(post) {
  const rot = ROTATIONS[post.id % ROTATIONS.length];
  const dateStr = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const effectiveRating = post.user_rating !== null ? post.user_rating : post.avg_rating;
  const sliderVal = effectiveRating !== null ? effectiveRating : 50;

  const card = document.createElement('article');
  card.className = 'post-card';
  card.dataset.id = post.id;
  card.style.setProperty('--card-rot', `${rot}deg`);
  card.style.transform = `rotate(${rot}deg)`;

  // Tape decoration
  card.appendChild(makeTape(post.id));

  // Owner delete button
  if (post.is_owner) {
    const ownerDiv = document.createElement('div');
    ownerDiv.className = 'owner-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.title = 'Remove from scrapbook';
    delBtn.textContent = '✕ remove';
    delBtn.addEventListener('click', () => deletePost(post.id));
    ownerDiv.appendChild(delBtn);
    card.appendChild(ownerDiv);
  }

  // Polaroid
  const polaroid = document.createElement('a');
  polaroid.className = 'polaroid';
  polaroid.href = post.url;
  polaroid.target = '_blank';
  polaroid.rel = 'noopener noreferrer';
  polaroid.title = 'Click QR or 🔗 to open link';

  const qrImg = document.createElement('img');
  qrImg.className = 'qr-img';
  qrImg.alt = 'QR Code';
  qrImg.src = post.qr_code_data || '';
  polaroid.appendChild(qrImg);

  const caption = document.createElement('div');
  caption.className = 'polaroid-caption';
  caption.textContent = post.title || '📌';
  polaroid.appendChild(caption);

  card.appendChild(polaroid);

  // Meta text
  const meta = document.createElement('div');
  meta.className = 'post-meta';

  const dateEl = document.createElement('span');
  dateEl.className = 'post-date';
  dateEl.textContent = '📅 ' + dateStr;
  meta.appendChild(dateEl);

  if (post.title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'post-title';
    titleEl.textContent = post.title;
    meta.appendChild(titleEl);
  }

  // Stars
  const starsRow = document.createElement('div');
  starsRow.className = 'stars-row';
  const starsEl = document.createElement('span');
  starsEl.className = 'stars';
  starsEl.id = `stars-${post.id}`;
  starsEl.textContent = effectiveRating !== null ? ratingToStars(effectiveRating) : '☆☆☆☆☆';
  const ratingLabelEl = document.createElement('span');
  ratingLabelEl.className = 'rating-label';
  ratingLabelEl.id = `rlabel-${post.id}`;
  if (post.rating_count > 0) {
    ratingLabelEl.textContent = `${post.rating_count} ${post.rating_count === 1 ? 'rating' : 'ratings'}`;
  } else {
    ratingLabelEl.textContent = 'No ratings yet';
  }
  starsRow.appendChild(starsEl);
  starsRow.appendChild(ratingLabelEl);
  meta.appendChild(starsRow);

  if (post.description) {
    const descEl = document.createElement('div');
    descEl.className = 'post-desc';
    descEl.textContent = '✦ ' + post.description;
    meta.appendChild(descEl);
  }

  // Tags
  if (post.tags && post.tags.length > 0) {
    const tagsEl = document.createElement('div');
    tagsEl.className = 'tags';
    post.tags.forEach(t => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '#' + t;
      tagsEl.appendChild(tag);
    });
    meta.appendChild(tagsEl);
  }



  card.appendChild(meta);

  // ── Slider section
  const sliderSection = document.createElement('div');
  sliderSection.className = 'slider-section';

  const sliderLabels = document.createElement('div');
  sliderLabels.className = 'slider-labels';
  sliderLabels.innerHTML = `<span>Meh…</span><span class="fire-label">FIRE! 🔥</span>`;
  sliderSection.appendChild(sliderLabels);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'fire-slider';
  slider.min = 0;
  slider.max = 100;
  slider.step = 1;
  slider.value = sliderVal;
  slider.id = `slider-${post.id}`;
  sliderSection.appendChild(slider);

  const sliderStatus = document.createElement('div');
  sliderStatus.className = 'slider-status';
  sliderStatus.id = `sstatus-${post.id}`;
  if (post.user_rating !== null) {
    sliderStatus.textContent = `Your rating: ${ratingToLabel(post.user_rating)}`;
  } else if (post.avg_rating !== null) {
    sliderStatus.textContent = `Avg: ${ratingToLabel(post.avg_rating)} (${post.rating_count} ${post.rating_count === 1 ? 'person' : 'people'})`;
  } else {
    sliderStatus.textContent = 'Slide to rate!';
  }
  sliderSection.appendChild(sliderStatus);

  card.appendChild(sliderSection);

  // Slider events
  let sliderTimer = null;
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    document.getElementById(`stars-${post.id}`).textContent = ratingToStars(val);
    sliderStatus.textContent = ratingToLabel(val);
    if (val >= 95) slider.classList.add('fire-anim');
    else slider.classList.remove('fire-anim');
  });

  slider.addEventListener('change', () => {
    clearTimeout(sliderTimer);
    sliderTimer = setTimeout(() => submitRating(post.id, parseInt(slider.value)), 400);
  });

  return card;
}

/* ─── Submit Rating ───────────────────────────────── */
async function submitRating(postId, rating) {
  try {
    const res = await fetch(`/api/rate/${postId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    if (!res.ok) return;
    const data = await res.json();

    // Update stars and status
    const starsEl = document.getElementById(`stars-${postId}`);
    const statusEl = document.getElementById(`sstatus-${postId}`);
    const labelEl = document.getElementById(`rlabel-${postId}`);

    if (starsEl) starsEl.textContent = ratingToStars(data.user_rating);
    if (statusEl) statusEl.textContent = `Your rating: ${ratingToLabel(data.user_rating)}`;
    if (labelEl) labelEl.textContent = `${data.rating_count} ${data.rating_count === 1 ? 'rating' : 'ratings'}`;
  } catch (e) {
    console.error('Rating failed:', e);
  }
}

/* ─── Delete Post ────────────────────────────────── */
async function deletePost(postId) {
  if (!confirm('Remove this memory from your scrapbook?')) return;
  try {
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      const card = document.querySelector(`.post-card[data-id="${postId}"]`);
      if (card) {
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
          card.remove();
          checkEmpty();
        }, 300);
      }
    }
  } catch (e) {
    console.error('Delete failed:', e);
  }
}

/* ─── Fetch & Render Posts ────────────────────────── */
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    allPosts = await res.json();
    renderPosts(allPosts);
    updateDateRange(allPosts);
  } catch (e) {
    console.error('Failed to load posts:', e);
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('postsGrid');
  const empty = document.getElementById('emptyState');

  // Remove existing cards (keep emptyState)
  [...grid.querySelectorAll('.post-card')].forEach(c => c.remove());

  if (posts.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  posts.forEach(post => {
    const card = buildCard(post);
    grid.appendChild(card);
  });
}

function checkEmpty() {
  const grid = document.getElementById('postsGrid');
  const cards = grid.querySelectorAll('.post-card');
  document.getElementById('emptyState').style.display = cards.length === 0 ? '' : 'none';
}

function updateDateRange(posts) {
  const el = document.getElementById('bookDates');
  if (!posts || posts.length === 0) {
    el.textContent = 'Your memories, curated';
    return;
  }
  const dates = posts.map(p => new Date(p.created_at)).sort((a, b) => a - b);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (dates.length === 1) {
    el.textContent = fmt(dates[0]);
  } else {
    el.textContent = `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
  }
}

/* ─── Modal ──────────────────────────────────────── */
const overlay = document.getElementById('modalOverlay');

function openModal() { overlay.classList.add('open'); }
function closeModal() {
  overlay.classList.remove('open');
  resetForm();
}

document.getElementById('fabBtn').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

function resetForm() {
  document.getElementById('inputUrl').value = '';
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputDesc').value = '';
  document.getElementById('inputTags').value = '';
  clearImage();
}

/* ─── Image handling ─────────────────────────────── */
const dropArea = document.getElementById('dropArea');
const imageFile = document.getElementById('imageFile');
const imagePreview = document.getElementById('imagePreview');
const dropHint = document.getElementById('dropHint');
const removeImg = document.getElementById('removeImg');

document.getElementById('browseBtn').addEventListener('click', () => imageFile.click());
dropArea.addEventListener('click', (e) => {
  if (e.target !== removeImg && !removeImg.contains(e.target)) imageFile.click();
});

imageFile.addEventListener('change', () => {
  if (imageFile.files[0]) loadImageFile(imageFile.files[0]);
});

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageFile(file);
});

function loadImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    alert('Image is too large (max 5MB)');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    currentImageDataUrl = e.target.result;
    imagePreview.src = currentImageDataUrl;
    imagePreview.hidden = false;
    dropHint.hidden = true;
    removeImg.hidden = false;
  };
  reader.readAsDataURL(file);
}

removeImg.addEventListener('click', (e) => {
  e.stopPropagation();
  clearImage();
});

function clearImage() {
  currentImageDataUrl = null;
  imagePreview.src = '';
  imagePreview.hidden = true;
  dropHint.hidden = false;
  removeImg.hidden = true;
  imageFile.value = '';
}

/* ─── Submit New Post ────────────────────────────── */
document.getElementById('btnSubmit').addEventListener('click', submitPost);

async function submitPost() {
  const url = document.getElementById('inputUrl').value.trim();
  if (!url) {
    document.getElementById('inputUrl').focus();
    document.getElementById('inputUrl').style.borderColor = '#c04040';
    return;
  }
  document.getElementById('inputUrl').style.borderColor = '';

  const submitBtn = document.getElementById('btnSubmit');
  const submitLabel = document.getElementById('submitLabel');
  const submitSpinner = document.getElementById('submitSpinner');
  submitBtn.disabled = true;
  submitLabel.hidden = true;
  submitSpinner.hidden = false;

  try {
    // Full URL
    let fullUrl = url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }

    // Generate QR code
    const qrData = await generateQRCode(fullUrl, currentImageDataUrl);

    const title = document.getElementById('inputTitle').value.trim();
    const description = document.getElementById('inputDesc').value.trim();
    const tagsRaw = document.getElementById('inputTags').value;
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    const body = {
      url: fullUrl,
      image_data: currentImageDataUrl || null,
      qr_code_data: qrData,
      title,
      description,
      tags
    };

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error('Server error');
    const newPost = await res.json();

    closeModal();

    // Prepend the new card
    const grid = document.getElementById('postsGrid');
    const empty = document.getElementById('emptyState');
    empty.style.display = 'none';

    const card = buildCard(newPost);
    card.style.opacity = '0';
    card.style.transform = `translateY(-20px) rotate(${ROTATIONS[newPost.id % ROTATIONS.length]}deg)`;
    grid.insertBefore(card, grid.firstChild);

    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = `rotate(${ROTATIONS[newPost.id % ROTATIONS.length]}deg)`;
    });

    updateDateRange([newPost, ...allPosts]);
    allPosts.unshift(newPost);
  } catch (e) {
    console.error('Failed to create post:', e);
    alert('Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitLabel.hidden = false;
    submitSpinner.hidden = true;
  }
}

/* ─── Keyboard shortcuts ──────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && overlay.classList.contains('open') && e.ctrlKey) submitPost();
});

/* ─── Init ────────────────────────────────────────── */
loadPosts();

/* ─── Liquid Canvas Background ───────────────────── */
(function initLiquid() {
  const canvas = document.getElementById('liquidCanvas');
  const ctx = canvas.getContext('2d');
  const cursorGlow = document.getElementById('cursorGlow');

  let W, H;
  let mouse = { x: -1000, y: -1000 };
  let mouseVel = { x: 0, y: 0 };
  let lastMouse = { x: -1000, y: -1000 };
  let ripples = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Track mouse
  window.addEventListener('mousemove', (e) => {
    mouseVel.x = e.clientX - mouse.x;
    mouseVel.y = e.clientY - mouse.y;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';

    // Spawn ripple on fast movement
    const speed = Math.sqrt(mouseVel.x ** 2 + mouseVel.y ** 2);
    if (speed > 8 && ripples.length < 12) {
      ripples.push({ x: e.clientX, y: e.clientY, r: 0, maxR: 120 + speed * 3, alpha: 0.5, speed: 2 + speed * 0.08 });
    }
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = -2000; mouse.y = -2000;
    cursorGlow.style.opacity = '0';
  });
  window.addEventListener('mouseenter', () => {
    cursorGlow.style.opacity = '1';
  });

  // Blob definition
  class Blob {
    constructor(color, r, speed) {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * speed;
      this.vy = (Math.random() - 0.5) * speed;
      this.r = r;
      this.baseR = r;
      this.color = color; // [r,g,b]
      this.phase = Math.random() * Math.PI * 2;
      this.wobbleAmp = 0.08 + Math.random() * 0.12;
      this.wobbleSpeed = 0.008 + Math.random() * 0.012;
      this.pushVx = 0;
      this.pushVy = 0;
    }

    update(t) {
      this.phase += this.wobbleSpeed;
      // Gentle size pulse
      this.r = this.baseR * (1 + Math.sin(this.phase) * this.wobbleAmp);

      // Cursor repulsion
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const repelRange = this.r * 1.8 + 120;

      if (dist < repelRange && dist > 0) {
        const force = ((repelRange - dist) / repelRange) * 0.6;
        this.pushVx += (dx / dist) * force * 2.2;
        this.pushVy += (dy / dist) * force * 2.2;
      }

      // Dampen push
      this.pushVx *= 0.90;
      this.pushVy *= 0.90;

      this.x += this.vx + this.pushVx;
      this.y += this.vy + this.pushVy;

      // Wrap edges softly
      const margin = this.r;
      if (this.x < -margin) this.x = W + margin;
      if (this.x > W + margin) this.x = -margin;
      if (this.y < -margin) this.y = H + margin;
      if (this.y > H + margin) this.y = -margin;
    }

    draw() {
      const [r, g, b] = this.color;
      const grad = ctx.createRadialGradient(
        this.x - this.r * 0.25, this.y - this.r * 0.25, this.r * 0.05,
        this.x, this.y, this.r
      );
      grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},0.28)`);
      grad.addColorStop(0.75, `rgba(${r},${g},${b},0.10)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.beginPath();
      ctx.ellipse(
        this.x, this.y,
        this.r * (1 + Math.sin(this.phase * 0.7) * 0.06),
        this.r * (1 + Math.cos(this.phase * 0.9) * 0.06),
        this.phase * 0.3,
        0, Math.PI * 2
      );
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // Create blobs: pink, purple, red, magenta, deep-violet
  const BLOB_DEFS = [
    { color: [255, 0, 110], r: 260, spd: 0.35 }, // hot pink  — big
    { color: [139, 0, 255], r: 300, spd: 0.28 }, // purple    — big
    { color: [255, 0, 64], r: 220, spd: 0.40 }, // red       — medium
    { color: [255, 0, 170], r: 190, spd: 0.45 }, // magenta   — medium
    { color: [80, 0, 200], r: 240, spd: 0.22 }, // deep-violet
    { color: [255, 60, 120], r: 160, spd: 0.55 }, // lighter pink — smaller
    { color: [180, 0, 255], r: 200, spd: 0.32 }, // violet
    { color: [255, 0, 40], r: 150, spd: 0.50 }, // crimson
  ];

  const blobs = BLOB_DEFS.map(d => new Blob(d.color, d.r, d.spd));

  let t = 0;

  function drawRipples() {
    ripples = ripples.filter(rp => rp.alpha > 0.01);
    ripples.forEach(rp => {
      rp.r += rp.speed;
      rp.alpha *= 0.93;
      rp.speed *= 0.97;

      const grad = ctx.createRadialGradient(rp.x, rp.y, rp.r * 0.6, rp.x, rp.y, rp.r);
      grad.addColorStop(0, `rgba(255,0,110,0)`);
      grad.addColorStop(0.7, `rgba(255,0,110,${rp.alpha * 0.4})`);
      grad.addColorStop(1, `rgba(139,0,255,0)`);

      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,80,160,${rp.alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // Very dark base
    ctx.fillStyle = '#08000F';
    ctx.fillRect(0, 0, W, H);

    // Composite blobs with 'screen' blending for glow effect
    ctx.globalCompositeOperation = 'screen';
    blobs.forEach(b => { b.update(t); b.draw(); });

    // Ripples on top with normal blend
    ctx.globalCompositeOperation = 'source-over';
    drawRipples();

    // Subtle vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'source-over';
    t++;
    requestAnimationFrame(frame);
  }

  frame();
})();