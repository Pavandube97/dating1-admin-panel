const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const axios = require('axios');

const API_BASE = 'http://3.148.215.190/api/v1/admin';


router.get('/', (req, res) => {
  if (req.session.token) return res.redirect('/dashboard');
  const error = req.session.error || null;
  req.session.error = null; // Clear error after reading
  res.render('login', { error, title: 'Login', layout: false });
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const response = await axios.post(`${API_BASE}/login`, { email, password });

    const { token, admin } = response.data.data;
    req.session.token = token;
    req.session.admin = admin;

    res.redirect('/dashboard');
  } catch (err) {
    req.session.error = 'Invalid Credentials';
    res.redirect('/');
  }
});

router.get('/dashboard', checkAuth, (req, res) => {
  res.render('dashboard', {
    admin: req.session.admin,
    title: 'Admin Dashboard'
  });
});


// Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Users List Route
router.get('/users', checkAuth, async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/users`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      },
      params: {
        page: 1,
        limit: 10,
        gender: '',
        minAge: '',
        maxAge: '',
        orientation: '',
        latitude: '',
        longitude: '',
        maxDistance: '',
        search: ''
      }
    });

    // Ensure the response has the 'users' data
    const users = response.data.data.users;
    // Render the users page
    res.render('users', {
      users: users,  // Ensure 'users' is passed as an array
      title: 'User List',
      currentUrl: req.originalUrl
    });
  } catch (err) {
    res.render('users', {
      error: 'Failed to load users',
      title: 'User List',
      users: []
    });
  }
});

// Reported Users List Route
router.get('/reported-users', checkAuth, async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/report/reported-users`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });

    const reportedUsers = response.data.message;

    res.render('reported-users', {
      reportedUsers,
      title: 'Reported Users'
    });

  } catch (err) {
    console.error("Error fetching reported users:", err.message);

    res.render('reported-users', {
      reportedUsers: [],
      error: 'Failed to load reported users',
      title: 'Reported Users',
      currentUrl: req.originalUrl
    });
  }
});

// Questions List Route
router.get('/questions', checkAuth, async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/questions`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });

    const questions = response.data.data;

    res.render('questions', {
      questions,
      title: 'Questions List',
      currentUrl: req.originalUrl
    });

  } catch (err) {
    console.error("Error fetching questions:", err.message);

    res.render('questions', {
      questions: [],
      error: 'Failed to load questions',
      title: 'Questions List'
    });
  }
});

// Add Question Route (POST)
router.post('/questions/add', async (req, res) => {
  try {
    const { question_text, alternate_question_text, options, correct_answer } = req.body;

    const optionsArray = options.split(',').map(opt => opt.trim());

    await axios.post('http://3.148.215.190/api/v1/admin/questions', {
      question_text,
      alternate_question_text,
      options: optionsArray,
      correct_answer
    }, {
      headers: {
        Authorization: `Bearer ${req.session.token}` // Auth token from session
      }
    });

    res.redirect('/questions'); // Reload question list after success
  } catch (err) {
    console.error('Add question error:', err.response?.data || err.message);
    res.redirect('/questions');
  }
});

module.exports = router;
