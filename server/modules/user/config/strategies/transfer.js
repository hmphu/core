'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');
var userProfile = require(path.resolve('./modules/user/controllers/users/user.profile.controller'));
var cache = require(path.resolve('./config/lib/redis.cache'));

module.exports = function() {
    // Use bearer strategy
    passport.use('transfer', new BearerStrategy({
        passReqToCallback : true
    }, function(req, bearerToken, done) {
        // if user logged in already with local strategy ==> ignore bearer strategy
        if (typeof req.user !== 'undefined') {
            console.log('User already logged in. Ignore bearer transfer token header for user [%s].', JSON.stringify(req.user));
            return done(null, req.user);
        }

        // Bearer Strategy: authenticate user access by token from header
        // e.g.: Authorization: Bearer ownerId:transferTokenstring
        console.log('Bearer transfer token = [%s]', bearerToken);
        var credentials = bearerToken.split(':');

        var idOwner = credentials[0];
        var token = credentials[1];

        if (token !== '!@#$%^') {
            return done(null, false, new TypeError('common.users.token.invalid'));
        }

        User.findById(idOwner, function(err, user) {
            if (err) {
                return done(err);
            }

            if (!user) {
                return done(null, false, new TypeError('common.users.unauthenticated'));
            }

            if (user.is_suspended) {
                return done(null, false, new TypeError('common.users.suspended'));
            }

            userProfile.userByIdInternal(req, idOwner, user._id.toString(), done);
        });
    }));
};
