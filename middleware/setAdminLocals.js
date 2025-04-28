module.exports = function(req, res, next) {
  res.locals.admin = req.session.admin || null;
  next();
};
