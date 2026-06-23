const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

// ── VALIDATION RULES ───────────────────────────────────────
const bookingValidation = [
  body('issue_desc')
    .trim()
    .notEmpty().withMessage('Please describe your issue')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10–2000 characters'),

  body('service_type')
    .trim()
    .notEmpty().withMessage('Please select a service type'),

  body('customer_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }),

  body('customer_phone')
    .optional({ checkFalsy: true })
    .matches(/^[+]?[\d\s\-()]{8,15}$/).withMessage('Enter a valid phone number'),

  body('customer_email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
];

// ── POST /api/booking/submit ───────────────────────────────
// Submit a new service booking request
router.post('/submit', bookingValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }

  const {
    issue_desc,
    service_type,
    customer_name,
    customer_phone,
    customer_email,
    city
  } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO bookings
        (issue_desc, service_type, customer_name, customer_phone, customer_email, city)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      issue_desc.trim(),
      service_type.trim(),
      customer_name  ? customer_name.trim()  : null,
      customer_phone ? customer_phone.trim() : null,
      customer_email ? customer_email.trim() : null,
      city           ? city.trim()           : null
    );

    return res.status(201).json({
      success: true,
      message: 'Booking request received! We will match you with a technician shortly.',
      booking_id: result.lastInsertRowid
    });

  } catch (err) {
    console.error('Booking submission error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

// ── GET /api/booking/status/:id ────────────────────────────
// Check booking status by ID (public — customer checks their own booking)
router.get('/status/:id', (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID' });
  }

  try {
    const booking = db.prepare(`
      SELECT
        b.id,
        b.service_type,
        b.status,
        b.created_at,
        t.full_name   AS technician_name,
        t.phone       AS technician_phone,
        t.city        AS technician_city
      FROM bookings b
      LEFT JOIN technicians t ON b.assigned_to = t.id
      WHERE b.id = ?
    `).get(parseInt(id));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    return res.json({ success: true, booking });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
