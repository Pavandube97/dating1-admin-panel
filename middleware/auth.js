function checkAuth(req, res, next) {
    if (req.session && req.session.token) return next();
    return res.redirect('/');
  }
  
  module.exports = { checkAuth };