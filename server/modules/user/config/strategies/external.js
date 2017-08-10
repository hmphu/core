'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;
var mongoose = require('mongoose');
var User = require('mongoose').model('User');
var ExternalApi = mongoose.model('ExternalApi');
var userProfile = require(path.resolve('./modules/user/controllers/users/user.profile.controller'));
var utils = require(path.resolve('./modules/core/resources/utils'));
var cache = require(path.resolve('./config/lib/redis.cache'));

module.exports = function() {
    // Use bearer strategy
    passport.use('external', new BearerStrategy({
        passReqToCallback : true
    }, function(req, bearerToken, done) {
        // if user logged in already with local strategy ==> ignore bearer strategy
        if (typeof req.user !== 'undefined') {
            console.log('User already logged in. Ignore bearer token header for user [%s].', JSON.stringify(req.user));
            return done(null, req.user);
        }
        // Bearer Strategy: authenticate user access by token from header
        // e.g.: Authorization: Bearer appId:appToken:domain
        console.log('Bearer token = [%s]', bearerToken);
        var credentials = bearerToken.split(':');

        var appId = credentials[0] || '';
        var appSecret = credentials[1] || '';
        var appDomain = credentials[2] || '';

        var subDomain = (req.subdomains && req.subdomains[0]) || '';
        console.log('External api called from sub domain [%s].', subDomain);

        ExternalApi.findOne({
            app_id : appId.toLowerCase(),
            app_secret : appSecret.toLowerCase(),
            app_domain : appDomain.toLowerCase()
        }, (err, result) => {
            if (err) {
                return done(err);
            }
            
            if (!result) {
                return done(new TypeError('common.users.unauthenticated'));
            }

            var idOwner = result.ed_user_id.toString();
            
            userProfile.userByIdInternal(req, idOwner, idOwner, done);
        });
    }));
};
