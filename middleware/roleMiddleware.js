const ApiError = require('../utils/ApiError');

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) throw new ApiError(403, 'Your role cannot perform this action');
    next();
  };
}

module.exports = authorizeRoles;
