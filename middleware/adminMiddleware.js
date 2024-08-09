// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
    console.log('User role:', req.user.role); // Log user role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };

//this middleware enables admin to  to yes i want
  ///i want to commit this middlware but i dont no waht is the problem

  //yes
  //yes