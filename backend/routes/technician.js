const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

// ── VALIDATION RULES ───────────────────────────────────────
const techValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[+]?[\d\s\-()]{8,15}$/).withMessage('Enter a valid phone number'),

  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City name too long'),

  body('expertise')
    .trim()
    .notEmpty().withMessage('Primary expertise is required'),

  body('experience')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }),

  body('about')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('About section max 1000 characters')
];

// ── POST /api/technician/register ─────────────────────────
// Submit technician registration
router.post('/register', techValidation, (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }

  const { full_name, phone, email, city, expertise, experience, about } = req.body;

  try {
    // Check for duplicate phone number
    const existing = db.prepare(
      'SELECT id FROM technicians WHERE phone = ?'
    ).get(phone.trim());

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A technician with this phone number is already registered.'
      });
    }

    const result = db.prepare(`
      INSERT INTO technicians (full_name, phone, email, city, expertise, experience, about)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      full_name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      city.trim(),
      expertise.trim(),
      experience ? experience.trim() : null,
      about ? about.trim() : null
    );

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully! We will contact you within 24 hours.',
      id: result.lastInsertRowid
    });

  } catch (err) {
    console.error('Technician registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

// ── GET /api/technician/cities ─────────────────────────────
// Returns list of active technician cities (public)
router.get('/cities', (req, res) => {
  try {
    const cities = db.prepare(`
      SELECT city, COUNT(*) as count
      FROM technicians
      WHERE status = 'approved'
      GROUP BY city
      ORDER BY count DESC
    `).all();

    return res.json({ success: true, cities });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
