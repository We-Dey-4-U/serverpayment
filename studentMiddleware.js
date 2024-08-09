// backend/middleware/studentMiddleware.js
exports.isStudent = (req, res, next) => {
    if (req.user.role !== 'Student') {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };


  //student middleware