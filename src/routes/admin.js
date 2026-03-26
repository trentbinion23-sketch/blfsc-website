const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireRole } = require('../middleware/auth');
const { logActionDirect } = require('../middleware/audit');

// Dashboard – accessible to any logged-in user (admin, editor, member)
router.get('/dashboard', requireRole('admin', 'editor', 'member'), (req, res) => {
  db.all(
    `SELECT action, details, ip_address, created_at FROM audit_log ORDER BY created_at DESC LIMIT 10`,
    [],
    (err, recentActivity) => {
      db.get(`SELECT COUNT(*) AS total FROM users`, [], (err2, userCount) => {
        res.render('admin/dashboard', {
          title: 'Dashboard',
          user: req.session.username,
          role: req.session.userRole,
          recentActivity: recentActivity || [],
          userCount: userCount?.total || 0,
        });
      });
    }
  );
});

// User management – admin only
router.get('/users', requireRole('admin'), (req, res) => {
  db.all(
    `SELECT id, username, email, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC`,
    [],
    (err, users) => {
      if (err) {
        return res.status(500).render('admin/error', { title: 'Error', message: 'Failed to load users.' });
      }
      res.render('admin/users', {
        title: 'User Management',
        user: req.session.username,
        role: req.session.userRole,
        users: users || [],
        success: req.query.success || null,
        error: req.query.error || null,
      });
    }
  );
});

// Create user form – admin only
router.get('/users/new', requireRole('admin'), (req, res) => {
  res.render('admin/user-form', {
    title: 'Create User',
    user: req.session.username,
    role: req.session.userRole,
    editUser: null,
    error: null,
  });
});

// Create user POST – admin only
router.post(
  '/users/new',
  requireRole('admin'),
  [
    body('username').trim().isLength({ min: 3, max: 32 }).withMessage('Username must be 3–32 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['admin', 'editor', 'member']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('admin/user-form', {
        title: 'Create User',
        user: req.session.username,
        role: req.session.userRole,
        editUser: null,
        error: errors.array()[0].msg,
      });
    }

    const { username, email, password, role } = req.body;
    try {
      const hash = await bcrypt.hash(password, 12);
      db.run(
        `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        [username, email, hash, role],
        function (err) {
          if (err) {
            const msg = err.message.includes('UNIQUE') ? 'Username or email already exists.' : 'Failed to create user.';
            return res.render('admin/user-form', {
              title: 'Create User',
              user: req.session.username,
              role: req.session.userRole,
              editUser: null,
              error: msg,
            });
          }
          logActionDirect(req, 'USER_CREATED', `New user: ${username} role: ${role}`);
          res.redirect('/admin/users?success=User+created+successfully');
        }
      );
    } catch {
      res.render('admin/user-form', {
        title: 'Create User',
        user: req.session.username,
        role: req.session.userRole,
        editUser: null,
        error: 'Server error. Please try again.',
      });
    }
  }
);

// Edit user form – admin only
router.get('/users/:id/edit', requireRole('admin'), (req, res) => {
  db.get(`SELECT id, username, email, role, is_active FROM users WHERE id = ?`, [req.params.id], (err, editUser) => {
    if (err || !editUser) {
      return res.redirect('/admin/users?error=User+not+found');
    }
    res.render('admin/user-form', {
      title: 'Edit User',
      user: req.session.username,
      role: req.session.userRole,
      editUser,
      error: null,
    });
  });
});

// Edit user POST – admin only
router.post(
  '/users/:id/edit',
  requireRole('admin'),
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('role').isIn(['admin', 'editor', 'member']).withMessage('Invalid role'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const userId = req.params.id;

    if (errors.isEmpty()) {
      const { email, role, password, is_active } = req.body;
      const active = is_active === 'on' ? 1 : 0;

      const finalize = () => {
        logActionDirect(req, 'USER_UPDATED', `User ID: ${userId} role: ${role}`);
        res.redirect('/admin/users?success=User+updated+successfully');
      };

      if (password) {
        const hash = await bcrypt.hash(password, 12);
        db.run(
          `UPDATE users SET email = ?, role = ?, is_active = ?, password_hash = ? WHERE id = ?`,
          [email, role, active, hash, userId],
          finalize
        );
      } else {
        db.run(
          `UPDATE users SET email = ?, role = ?, is_active = ? WHERE id = ?`,
          [email, role, active, userId],
          finalize
        );
      }
    } else {
      db.get(`SELECT id, username, email, role, is_active FROM users WHERE id = ?`, [userId], (err, editUser) => {
        res.render('admin/user-form', {
          title: 'Edit User',
          user: req.session.username,
          role: req.session.userRole,
          editUser,
          error: errors.array()[0].msg,
        });
      });
    }
  }
);

// Delete user – admin only (cannot delete own account)
router.post('/users/:id/delete', requireRole('admin'), (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.session.userId) {
    return res.redirect('/admin/users?error=You+cannot+delete+your+own+account');
  }
  db.run(`DELETE FROM users WHERE id = ?`, [userId], (err) => {
    if (err) return res.redirect('/admin/users?error=Failed+to+delete+user');
    logActionDirect(req, 'USER_DELETED', `Deleted user ID: ${userId}`);
    res.redirect('/admin/users?success=User+deleted');
  });
});

// Toggle user active status – admin only
router.post('/users/:id/toggle', requireRole('admin'), (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.session.userId) {
    return res.redirect('/admin/users?error=You+cannot+deactivate+your+own+account');
  }
  db.get(`SELECT is_active, username FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.redirect('/admin/users?error=User+not+found');
    const newStatus = user.is_active ? 0 : 1;
    db.run(`UPDATE users SET is_active = ? WHERE id = ?`, [newStatus, userId], () => {
      const action = newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
      logActionDirect(req, action, `User: ${user.username}`);
      res.redirect('/admin/users?success=User+status+updated');
    });
  });
});

// Audit log – admin only
router.get('/audit-log', requireRole('admin'), (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 25;
  const offset = (page - 1) * limit;

  db.get(`SELECT COUNT(*) AS total FROM audit_log`, [], (err, countRow) => {
    const total = countRow?.total || 0;
    const totalPages = Math.ceil(total / limit);

    db.all(
      `SELECT al.id, al.username, al.action, al.details, al.ip_address, al.created_at
       FROM audit_log al ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
      (err2, logs) => {
        res.render('admin/audit-log', {
          title: 'Audit Log',
          user: req.session.username,
          role: req.session.userRole,
          logs: logs || [],
          currentPage: page,
          totalPages,
          total,
        });
      }
    );
  });
});

// Change own password
router.get('/change-password', requireRole('admin', 'editor', 'member'), (req, res) => {
  res.render('admin/change-password', {
    title: 'Change Password',
    user: req.session.username,
    role: req.session.userRole,
    error: null,
    success: null,
  });
});

router.post(
  '/change-password',
  requireRole('admin', 'editor', 'member'),
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    body('confirm_password').custom((val, { req }) => {
      if (val !== req.body.new_password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  async (req, res) => {
    const render = (error, success) =>
      res.render('admin/change-password', {
        title: 'Change Password',
        user: req.session.username,
        role: req.session.userRole,
        error,
        success,
      });

    const errors = validationResult(req);
    if (!errors.isEmpty()) return render(errors.array()[0].msg, null);

    db.get(`SELECT password_hash FROM users WHERE id = ?`, [req.session.userId], async (err, row) => {
      if (err || !row) return render('Server error.', null);
      const match = await bcrypt.compare(req.body.current_password, row.password_hash);
      if (!match) return render('Current password is incorrect.', null);
      const hash = await bcrypt.hash(req.body.new_password, 12);
      db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, req.session.userId], () => {
        logActionDirect(req, 'PASSWORD_CHANGED', `User: ${req.session.username}`);
        render(null, 'Password updated successfully.');
      });
    });
  }
);

module.exports = router;
