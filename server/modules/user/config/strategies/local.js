'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    User = require('mongoose').model('User');

module.exports = function() {
    // Use local strategy
    passport.use(new LocalStrategy({
        passReqToCallback: true,
        usernameField: 'email',
        passwordField: 'password'
    },
    function(req, username, password, done) {
        User.findOne({
            sub_domain: req.res.locals.sub_domain,
            email: username.toLowerCase()
        }, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user || !user.authenticate(password)) {
                return done(null, false, new TypeError('common.users.unauthenticated'));
            }
            if(user.is_suspended == true){
                return done(null, false, new TypeError('common.users.suspended'));
            }
            return done(null, user);
        });
    }));
};
