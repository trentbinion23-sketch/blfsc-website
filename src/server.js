const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const { create: createHandlebars } = require('express-handlebars');

const db = require('./db/database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'blfsc-dev-secret-change-in-production';

// Trust proxy for accurate IP logging when behind a reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// Handlebars setup
const hbs = createHandlebars({
  extname: '.handlebars',
  defaultLayout: 'plain',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  helpers: {
    ifEquals(a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    },
  },
});
app.engine('.handlebars', hbs.engine);
app.set('view engine', '.handlebars');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static assets
app.use(express.static(path.join(__dirname, '../public')));

// Session
const SqliteStore = require('connect-sqlite3')(session);
app.use(
  session({
    store: new SqliteStore({
      db: 'sessions.db',
      dir: path.join(__dirname, '../data'),
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'blfsc.sid',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Attach role flag helper for templates
app.use((req, res, next) => {
  res.locals.isAdmin = req.session?.userRole === 'admin';
  next();
});

// Routes
app.use('/', publicRoutes);
app.use('/admin', authRoutes);
app.use('/admin', adminRoutes);

// Redirect /admin to login or dashboard
app.get('/admin', (req, res) => {
  if (req.session?.userId) return res.redirect('/admin/dashboard');
  res.redirect('/admin/login');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('<h1 style="font-family:sans-serif; text-align:center; padding:4rem;">404 – Page Not Found</h1>');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('<h1 style="font-family:sans-serif; text-align:center; padding:4rem;">500 – Internal Server Error</h1>');
});

app.listen(PORT, () => {
  console.log(`BLFSC server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

module.exports = app;
