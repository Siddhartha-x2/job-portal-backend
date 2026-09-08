function allowedRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Your role cannot use this route' });
    }
    next();
  };
}

module.exports = allowedRoles;
