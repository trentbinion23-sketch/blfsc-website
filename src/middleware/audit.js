const db = require('../db/database');

function logAction(action, details = '') {
  return (req, res, next) => {
    const userId = req.session?.userId || null;
    const username = req.session?.username || 'anonymous';
    const ip = req.ip || req.socket?.remoteAddress || '';
    db.run(
      `INSERT INTO audit_log (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [userId, username, action, details, ip]
    );
    next();
  };
}

function logActionDirect(req, action, details = '') {
  const userId = req.session?.userId || null;
  const username = req.session?.username || 'anonymous';
  const ip = req.ip || req.socket?.remoteAddress || '';
  db.run(
    `INSERT INTO audit_log (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)`,
    [userId, username, action, details, ip]
  );
}

module.exports = { logAction, logActionDirect };
