const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var Hash = require('password-hash');
const User = require('../models/User');

passport.serializeUser(function (user, done) {
  done(null, user.UserId);
});

passport.deserializeUser(function (id, done) {
  User.findByPk(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      return done(err);
    });
});

passport.use(
  new LocalStrategy(function (username, password, done) {
    User.findOne({ where: { UserEmail: username }, raw: true })
      .then(user => {
        if (!user) return done(null, false, { message: 'null_user' });
        if (!Hash.verify(password, user.UserPassword)) return done(null, false, { message: 'pass' });
        return done(null, user);
      })
      .catch(err => {
        return done(err);
      });
  })
);

module.exports = passport;
