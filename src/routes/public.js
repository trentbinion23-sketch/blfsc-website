const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('public/home', { title: 'BLFSC – Home' });
});

router.get('/about', (req, res) => {
  res.render('public/about', { title: 'About – BLFSC' });
});

router.get('/contact', (req, res) => {
  res.render('public/contact', { title: 'Contact – BLFSC' });
});

module.exports = router;
