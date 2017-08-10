'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    passport = require('passport'),
    jwt = require('jsonwebtoken'),
    LocalStrategy = require('passport-local').Strategy,
    config = require(path.resolve("./config/config")),
    User = require('mongoose').model('User');

module.exports = function() {
    // Use local strategy
    passport.use("internal", new LocalStrategy({
        passReqToCallback: true,
        usernameField: 'email',
        passwordField: 'token'
    },
    function(req, username, token, done) {
        User.findOne({
            sub_domain: req.res.locals.sub_domain,
            email: username.toLowerCase()
        }, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, new TypeError('common.users.unauthenticated'));
            }
            jwt.verify(token, config.loginSecret, function(err, data) {
                if (err || user.email != data.email || user.sub_domain != data.sub_domain) {
                    return done(null, false, new TypeError('common.users.unauthenticated'));
                }
                if(user.is_suspended == true){
                    return done(null, false, new TypeError('common.users.suspended'));
                }
                return done(null, user);
            });
        });
    }));
};
