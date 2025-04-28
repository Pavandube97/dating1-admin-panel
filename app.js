    const express = require('express');
    const session = require('express-session');
    const path = require('path');
    const app = express();
    const bodyParser = require('body-parser');
    
    const expressLayouts = require('express-ejs-layouts');

    // View Engine Setup
    app.use(expressLayouts); //  ONLY ONCE
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.set('layout', 'layout'); //  Set default layout (optional but safe)

    // Public Folder
    app.use(express.static(path.join(__dirname, 'public')));

    // Body Parser
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(session({
        secret: 'adminSecretKey',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }  // Add this line for non-https requests
      }));

      const setAdminLocals = require('./middleware/setAdminLocals');
      app.use(setAdminLocals);

      app.use((req, res, next) => {
        res.locals.currentUrl = req.originalUrl;
        next();
      });

    // Routes
    const adminRoutes = require('./routes/admin');
    app.use('/', adminRoutes);

    // Server Start
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    });
