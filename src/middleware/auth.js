/**
 * Middleware for authentication and role-based access control.
 */

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
}

function requireRole(...roles) {
  return [
    requireLogin,
    (req, res, next) => {
      if (roles.includes(req.session.userRole)) {
        return next();
      }
      res.status(403).render('admin/403', {
        title: 'Access Denied',
        user: req.session.username,
        role: req.session.userRole,
      });
    },
  ];
}

function alreadyLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

module.exports = { requireLogin, requireRole, alreadyLoggedIn };
