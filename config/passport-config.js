const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
var Hash = require('password-hash');
const Admin = require('../models/Admin');

passport.serializeUser(function(user, done) {
  done(null, user.AdminId);
});

passport.deserializeUser(function(id, done) {
  Admin.findByPk(id)
  .then(admin =>
    {
      done(null, admin);
    })
  .catch(err => {return done(err)})
});

passport.use(new LocalStrategy(function(username, password, done) {
  Admin.findByPk(username, {raw: true})
  .then(admin =>
    {
      if (!admin)
        return done(null, false, {message: 'null_admin'});
      if (!Hash.verify(password, admin.AdminPassword))
        return done(null, false, {message: 'pass'});
      return done(null, admin);
    })
  .catch(err => {
    return done(err);
  })
  })
);
