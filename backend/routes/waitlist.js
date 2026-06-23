const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

// ── VALIDATION ─────────────────────────────────────────────
const waitlistValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('company')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }),

  body('role')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }),

  body('devices')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100000 }).withMessage('Enter a valid device count')
];

// ── POST /api/waitlist/join ────────────────────────────────
// Join the NADT early access waitlist
router.post('/join', waitlistValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }

  const { email, company, role, devices } = req.body;

  try {
    // Check if already on waitlist
    const existing = db.prepare(
      'SELECT id FROM waitlist WHERE email = ?'
    ).get(email);

    if (existing) {
      return res.status(200).json({
        success: true,
        already_joined: true,
        message: "You're already on the waitlist! We'll notify you when NADT launches."
      });
    }

    db.prepare(`
      INSERT INTO waitlist (email, company, role, devices)
      VALUES (?, ?, ?, ?)
    `).run(
      email,
      company ? company.trim() : null,
      role    ? role.trim()    : null,
      devices ? parseInt(devices) : null
    );

    // Get total count for social proof
    const { count } = db.prepare(
      'SELECT COUNT(*) as count FROM waitlist'
    ).get();

    return res.status(201).json({
      success: true,
      message: "You're on the list! We'll email you the moment NADT launches.",
      total_count: count
    });

  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

// ── GET /api/waitlist/count ────────────────────────────────
// Returns current waitlist count (public — for social proof display)
router.get('/count', (req, res) => {
  try {
    const { count } = db.prepare(
      'SELECT COUNT(*) as count FROM waitlist'
    ).get();
    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
