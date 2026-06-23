const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const slugify = require('slugify');

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════

// POST /api/admin/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  const { email, password } = req.body;

  try {
    const admin = db.prepare(
      'SELECT * FROM admin_users WHERE email = ?'
    ).get(email);

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    db.prepare(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(admin.id);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/me — verify token + get admin info
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// ══════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ══════════════════════════════════════════════════════════

// GET /api/admin/stats
router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = {
      technicians: {
        total:    db.prepare("SELECT COUNT(*) as c FROM technicians").get().c,
        pending:  db.prepare("SELECT COUNT(*) as c FROM technicians WHERE status='pending'").get().c,
        approved: db.prepare("SELECT COUNT(*) as c FROM technicians WHERE status='approved'").get().c,
        rejected: db.prepare("SELECT COUNT(*) as c FROM technicians WHERE status='rejected'").get().c
      },
      bookings: {
        total:      db.prepare("SELECT COUNT(*) as c FROM bookings").get().c,
        new:        db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='new'").get().c,
        in_progress:db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='in_progress'").get().c,
        completed:  db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='completed'").get().c
      },
      waitlist: {
        total: db.prepare("SELECT COUNT(*) as c FROM waitlist").get().c,
        today: db.prepare("SELECT COUNT(*) as c FROM waitlist WHERE DATE(created_at)=DATE('now')").get().c
      },
      blog: {
        total:     db.prepare("SELECT COUNT(*) as c FROM blog_posts").get().c,
        published: db.prepare("SELECT COUNT(*) as c FROM blog_posts WHERE published=1").get().c,
        drafts:    db.prepare("SELECT COUNT(*) as c FROM blog_posts WHERE published=0").get().c
      },
      recent_bookings: db.prepare(`
        SELECT id, service_type, status, customer_name, city, created_at
        FROM bookings ORDER BY created_at DESC LIMIT 5
      `).all(),
      recent_technicians: db.prepare(`
        SELECT id, full_name, city, expertise, status, created_at
        FROM technicians ORDER BY created_at DESC LIMIT 5
      `).all()
    };

    return res.json({ success: true, stats });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
//  TECHNICIANS
// ══════════════════════════════════════════════════════════

// GET /api/admin/technicians
router.get('/technicians', requireAuth, (req, res) => {
  const { status, city, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM technicians WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (city)   { query += ' AND city LIKE ?'; params.push(`%${city}%`); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  try {
    const rows  = db.prepare(query).all(...params);
    const total = db.prepare(
      'SELECT COUNT(*) as c FROM technicians WHERE 1=1' +
      (status ? ' AND status=?' : '') + (city ? ' AND city LIKE ?' : '')
    ).get(...params.slice(0, -2)).c;

    return res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/admin/technicians/:id/status
router.patch('/technicians/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const result = db.prepare(
      'UPDATE technicians SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).run(status, parseInt(id));

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }
    return res.json({ success: true, message: `Technician status updated to ${status}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/technicians/:id
router.delete('/technicians/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM technicians WHERE id=?'
    ).run(parseInt(req.params.id));
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }
    return res.json({ success: true, message: 'Technician deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
//  BOOKINGS
// ══════════════════════════════════════════════════════════

// GET /api/admin/bookings
router.get('/bookings', requireAuth, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT b.*, t.full_name as technician_name
    FROM bookings b
    LEFT JOIN technicians t ON b.assigned_to = t.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND b.status = ?'; params.push(status); }
  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  try {
    const rows  = db.prepare(query).all(...params);
    const total = db.prepare(
      'SELECT COUNT(*) as c FROM bookings' + (status ? ' WHERE status=?' : '')
    ).get(...(status ? [status] : [])).c;

    return res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/admin/bookings/:id
router.patch('/bookings/:id', requireAuth, (req, res) => {
  const { status, assigned_to, notes } = req.body;
  const updates = [];
  const params  = [];

  if (status)      { updates.push('status=?');      params.push(status); }
  if (assigned_to) { updates.push('assigned_to=?'); params.push(parseInt(assigned_to)); }
  if (notes !== undefined) { updates.push('notes=?'); params.push(notes); }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'Nothing to update' });
  }

  updates.push('updated_at=CURRENT_TIMESTAMP');
  params.push(parseInt(req.params.id));

  try {
    const result = db.prepare(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id=?`
    ).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    return res.json({ success: true, message: 'Booking updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
//  WAITLIST
// ══════════════════════════════════════════════════════════

// GET /api/admin/waitlist
router.get('/waitlist', requireAuth, (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const rows  = db.prepare(
      'SELECT * FROM waitlist ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(parseInt(limit), offset);
    const total = db.prepare('SELECT COUNT(*) as c FROM waitlist').get().c;
    return res.json({ success: true, data: rows, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/waitlist/:id
router.delete('/waitlist/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM waitlist WHERE id=?').run(parseInt(req.params.id));
    return res.json({ success: true, message: 'Entry removed from waitlist' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
//  BLOG CMS
// ══════════════════════════════════════════════════════════

// GET /api/admin/blog — list all posts
router.get('/blog', requireAuth, (req, res) => {
  try {
    const posts = db.prepare(
      'SELECT id,title,slug,category,excerpt,author,published,featured,created_at,published_at FROM blog_posts ORDER BY created_at DESC'
    ).all();
    return res.json({ success: true, data: posts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/blog/:id — single post with full content
router.get('/blog/:id', requireAuth, (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM blog_posts WHERE id=?').get(parseInt(req.params.id));
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    return res.json({ success: true, data: post });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/blog — create new post
router.post('/blog', requireAuth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('excerpt').optional({ checkFalsy: true }).trim(),
  body('author').optional({ checkFalsy: true }).trim(),
  body('read_time').optional({ checkFalsy: true }).trim(),
  body('published').optional().isBoolean(),
  body('featured').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    title, category, content, excerpt,
    author = 'Neurovia Team',
    read_time, published = false, featured = false
  } = req.body;

  try {
    // Generate unique slug
    let slug = slugify(title, { lower: true, strict: true });
    const existing = db.prepare('SELECT id FROM blog_posts WHERE slug=?').get(slug);
    if (existing) slug = `${slug}-${Date.now()}`;

    const publishedAt = published ? new Date().toISOString() : null;

    const result = db.prepare(`
      INSERT INTO blog_posts
        (title, slug, category, content, excerpt, author, read_time, published, featured, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(), slug, category.trim(), content.trim(),
      excerpt ? excerpt.trim() : null,
      author.trim(),
      read_time ? read_time.trim() : null,
      published ? 1 : 0,
      featured  ? 1 : 0,
      publishedAt
    );

    return res.status(201).json({
      success: true,
      message: published ? 'Post published successfully' : 'Draft saved successfully',
      id: result.lastInsertRowid,
      slug
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/blog/:id — update post
router.put('/blog/:id', requireAuth, (req, res) => {
  const {
    title, category, content, excerpt,
    author, read_time, published, featured
  } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM blog_posts WHERE id=?').get(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ success: false, message: 'Post not found' });

    // Regenerate slug if title changed
    let slug = existing.slug;
    if (title && title.trim() !== existing.title) {
      slug = slugify(title, { lower: true, strict: true });
      const clash = db.prepare('SELECT id FROM blog_posts WHERE slug=? AND id!=?').get(slug, existing.id);
      if (clash) slug = `${slug}-${Date.now()}`;
    }

    // Set published_at only when first publishing
    let publishedAt = existing.published_at;
    if (published && !existing.published) {
      publishedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE blog_posts SET
        title=?, slug=?, category=?, content=?, excerpt=?,
        author=?, read_time=?, published=?, featured=?,
        published_at=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      title      !== undefined ? title.trim()    : existing.title,
      slug,
      category   !== undefined ? category.trim() : existing.category,
      content    !== undefined ? content.trim()  : existing.content,
      excerpt    !== undefined ? (excerpt ? excerpt.trim() : null) : existing.excerpt,
      author     !== undefined ? author.trim()   : existing.author,
      read_time  !== undefined ? read_time        : existing.read_time,
      published  !== undefined ? (published ? 1 : 0) : existing.published,
      featured   !== undefined ? (featured  ? 1 : 0) : existing.featured,
      publishedAt,
      parseInt(req.params.id)
    );

    return res.json({ success: true, message: 'Post updated successfully', slug });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/blog/:id
router.delete('/blog/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM blog_posts WHERE id=?').run(parseInt(req.params.id));
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'Post not found' });
    return res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUBLIC BLOG ENDPOINTS ──────────────────────────────────
// These are used by your frontend to display blog posts

// GET /api/blog — list published posts (public)
router.get('/public/blog', (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT id, title, slug, category, excerpt, author, read_time, featured, published_at
      FROM blog_posts
      WHERE published = 1
      ORDER BY published_at DESC
    `).all();
    return res.json({ success: true, data: posts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/blog/:slug — single published post by slug (public)
router.get('/public/blog/:slug', (req, res) => {
  try {
    const post = db.prepare(`
      SELECT id, title, slug, category, content, excerpt, author, read_time, published_at
      FROM blog_posts
      WHERE slug = ? AND published = 1
    `).get(req.params.slug);

    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    return res.json({ success: true, data: post });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
