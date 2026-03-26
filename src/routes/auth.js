const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const db = require('../db/database');
const { alreadyLoggedIn } = require('../middleware/auth');
const { logActionDirect } = require('../middleware/audit');

const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60 * 15, // 15 minutes
});

// GET /admin/login
router.get('/login', alreadyLoggedIn, (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    error: null,
    username: '',
  });
});

// POST /admin/login
router.post(
  '/login',
  alreadyLoggedIn,
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const ip = req.ip || '';
    try {
      await loginLimiter.consume(ip);
    } catch {
      logActionDirect(req, 'LOGIN_RATE_LIMITED', `IP: ${ip}`);
      return res.status(429).render('admin/login', {
        title: 'Admin Login',
        error: 'Too many login attempts. Please wait 15 minutes and try again.',
        username: req.body.username || '',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: errors.array()[0].msg,
        username: req.body.username || '',
      });
    }

    const { username, password } = req.body;

    db.get(
      `SELECT * FROM users WHERE username = ? AND is_active = 1`,
      [username],
      async (err, user) => {
        if (err) {
          console.error(err);
          return res.render('admin/login', {
            title: 'Admin Login',
            error: 'A server error occurred. Please try again.',
            username,
          });
        }

        if (!user) {
          logActionDirect(req, 'LOGIN_FAILED', `Unknown user: ${username}`);
          return res.render('admin/login', {
            title: 'Admin Login',
            error: 'Invalid username or password.',
            username,
          });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          logActionDirect(req, 'LOGIN_FAILED', `Bad password for user: ${username}`);
          return res.render('admin/login', {
            title: 'Admin Login',
            error: 'Invalid username or password.',
            username,
          });
        }

        // Regenerate session on successful login to prevent session fixation
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration error:', err);
            return res.render('admin/login', {
              title: 'Admin Login',
              error: 'A server error occurred. Please try again.',
              username,
            });
          }

          req.session.userId = user.id;
          req.session.username = user.username;
          req.session.userRole = user.role;
          req.session.email = user.email;

          db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
          logActionDirect(req, 'LOGIN_SUCCESS', `User: ${username} Role: ${user.role}`);

          loginLimiter.delete(ip);

          const returnTo = req.session.returnTo || '/admin/dashboard';
          delete req.session.returnTo;
          res.redirect(returnTo);
        });
      }
    );
  }
);

// POST /admin/logout
router.post('/logout', (req, res) => {
  const username = req.session?.username || 'unknown';
  logActionDirect(req, 'LOGOUT', `User: ${username}`);
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/admin/login');
  });
});

module.exports = router;
