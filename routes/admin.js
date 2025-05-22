const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const axios = require('axios');

const API_BASE = 'http://3.148.215.190/api/v1/admin';


router.get('/', (req, res) => {
  if (req.session.token) return res.redirect('/dashboard');
  const error = req.session.error || null;
  const email = req.session.email || '';
  req.session.error = null; // Clear error after reading
  req.session.email = null; // Clear email after reading
  res.render('login', { error, email, title: 'Login', layout: false });
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
    req.session.email = req.body.email || '';
    res.redirect('/');
  }
});

router.get('/dashboard', checkAuth, async (req, res) => {
  try {
    const headers = {
      Authorization: `Bearer ${req.session.token}`
    };

    // Fetch dashboard data from single API endpoint
    const response = await axios.get(`${API_BASE}/dashboard`, { headers });

    const data = response.data.data || {};

    const totalUsers = data.all_users || 0;
    const totalBlocked = data.blocked_users || 0;
    const totalReported = data.resported_users || 0; // Assuming typo in API response key
    const onlineUsers = data.online_users || 0;

    res.render('dashboard', {
      title: 'Dashboard',
      totalUsers,
      totalBlocked,
      totalReported,
      onlineUsers
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.render('dashboard', {
      title: 'Dashboard',
      totalUsers: 0,
      totalBlocked: 0,
      totalReported: 0,
      totalQuestions: 0,
      error: 'Failed to load dashboard data'
    });
  }
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
        limit: 50,
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

    console.log("Users data:", users);
    // Render the users page
    res.render('users', {
      users: users,  // Ensure 'users' is passed as an array
      title: 'User List',
      currentUrl: req.originalUrl,
      token: req.session.token
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

// Blocked Users List Route
router.get('/blocked-users', checkAuth, async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/block/users`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });

    // Assign response.data.data to blockedUsers
    let blockedUsers = response.data.data;

    // Map each blocked user object to have a 'user' property equal to 'blocked'
    blockedUsers = blockedUsers.map(block => {
      return {
        ...block,
        user: block.blocked
      };
    });
    
    res.render('blocked-users', {
      blockedUsers,
      title: 'Blocked Users'
    });

  } catch (err) {
    console.error("Error fetching blocked users:", err.message);

    res.render('blocked-users', {
      blockedUsers: [],
      error: 'Failed to load blocked users',
      title: 'Blocked Users',
      currentUrl: req.originalUrl
    });
  }
});

// Content Moderation List Route
router.get('/content-moderation', checkAuth, async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/content_moderation`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });

    const rawData = response.data.data || [];
    // const contentModeration = response.data.data;
    // Filter out users with empty or null pending_updated
    const contentModeration = rawData
      .filter(user =>
        Array.isArray(user.pending_updated) && user.pending_updated.length > 0
      )
      .map(user => {
        const lastPending = user.pending_updated[user.pending_updated.length - 1];

        return {
          ...user,
          last_pending: {
            profile_image: lastPending.profile_image || [],
            status: lastPending.status || 'N/A',
            created_at: lastPending.created_at || null,
            reviewed_at: lastPending.reviewed_at || null
          }
        };
      });

    // console.log("Content Moderation data:", contentModeration);
    res.render('content-moderation', {
      contentModeration,
      title: 'Content Moderation'
    });

  } catch (err) {
    console.error("Error fetching content moderation:", err.message);

    res.render('content-moderation', {
      contentModeration: [],
      error: 'Failed to load content moderation',
      title: 'Content Moderation',
      currentUrl: req.originalUrl
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

// router.get('/question-answers', checkAuth, async (req, res) => {
//   try {
//     const response = await axios.get(`${API_BASE}/monitor/question_answer`, {
//       headers: {
//         Authorization: `Bearer ${req.session.token}`
//       }
//     });

//     const questionAnswers = response.data.data;
//     console.log("Question Answers data:", questionAnswers);
//     res.render('question-answers', {
//       questionAnswers,
//       title: 'Question Answers'
//     });

//   } catch (err) {
//     console.error("Error fetching question answers:", err.message);

//     res.render('question-answers', {
//       questionAnswers: [],
//       error: 'Failed to load question answers',
//       title: 'Question Answers'
//     });
//   }
// });

router.post('/users/block-toggle', checkAuth, async (req, res) => {
  try {
    const { userId, block } = req.body;

    const response = await axios.post(`${API_BASE}/users/block/${userId}`, {
      block
    }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error toggling block status:', err.message);
    res.status(500).json({ status: 0, message: 'Failed to toggle block status' });
  }
});

router.get('/revenue', checkAuth, (req, res) => {
  res.render('revenue', { title: 'Revenue' });
});

router.get('/notifications', checkAuth, (req, res) => {
  res.render('notifications', { title: 'Notifications' });
});

// Route to render edit user form
router.get('/users/edit/:id', checkAuth, async (req, res) => {
  const userId = req.params.id;
  try {
    const response = await axios.get(`${API_BASE}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    const user = response.data.data;
    res.render('users-edit', { user, title: 'Edit User' });
  } catch (err) {
    console.error('Error fetching user for edit:', err.message);
    res.redirect('/users');
  }
});

router.post('/users/edit/:id', checkAuth, async (req, res) => {
  const userId = req.params.id;
  const { name, email, gender, age, orientation, is_profile_completed, is_blocked } = req.body;
  try {
    await axios.post(`${API_BASE}/update-user`, {
      name,
      email,
      gender,
      age: age ? parseInt(age) : null,
      orientation,
      is_profile_completed: is_profile_completed === 'true',
      is_blocked: is_blocked === 'true'
    }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      },
      params: {
        userId: userId
      }
    });
    res.redirect('/users');
  } catch (err) {
    console.error('Error updating user:', err.message);
    res.redirect(`/users/edit/${userId}`);
  }
});

// Subscription List Route
router.get('/subscriptions', checkAuth, async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/subscription`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });

    const subscriptions = response.data.data || [];

    res.render('subscriptions', {
      subscriptions,
      title: 'Subscription List',
      currentUrl: req.originalUrl
    });
  } catch (err) {
    console.error("Error fetching subscriptions:", err.message);
    res.render('subscriptions', {
      subscriptions: [],
      error: 'Failed to load subscriptions',
      title: 'Subscription List',
      currentUrl: req.originalUrl
    });
  }
});

module.exports = router;
