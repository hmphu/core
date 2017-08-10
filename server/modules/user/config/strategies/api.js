'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;
var mongoose = require('mongoose');
var User = require('mongoose').model('User');
var UserApi = mongoose.model('UserApi');
var userProfile = require(path.resolve('./modules/user/controllers/users/user.profile.controller'));
var utils = require(path.resolve('./modules/core/resources/utils'));
var cache = require(path.resolve('./config/lib/redis.cache'));

module.exports = function() {
    // Use bearer strategy
    passport.use('api', new BearerStrategy({
        passReqToCallback : true
    }, function(req, bearerToken, done) {
        // if user logged in already with local strategy ==> ignore bearer strategy
        if (typeof req.user !== 'undefined') {
            console.log('User already logged in. Ignore bearer token header for user [%s].', JSON.stringify(req.user));
            return done(null, req.user);
        }

        // Bearer Strategy: authenticate user access by token from header
        // e.g.: Authorization: Bearer khacthanh@mail.com:tokenstring
        console.log('Bearer token = [%s]', bearerToken);
        var credentials = bearerToken.split(':');

        var email = credentials[0];
        var token = credentials[1];

        var subDomain = (req.subdomains && req.subdomains[0]) || '';
        console.log('Api called from sub domain [%s].', subDomain);

        User.findOne({
            sub_domain : subDomain,
            email : email.toLowerCase()
        }, function(err, user) {
            if (err) {
                return done(err);
            }

            if (!user) {
                return done(null, false, new TypeError('common.users.unauthenticated'));
            }

            if (user.is_suspended) {
                return done(null, false, new TypeError('common.users.suspended'));
            }
            
            var idOwner = utils.getParentUserId(user);
            
            var query = {
                ed_user_id: idOwner
            };
            
            cache.findOneWithCache(idOwner, 'user.setting.api', UserApi, query, (cacheErr, apiSetting) => {
                if (cacheErr) {
                    return done(cacheErr);
                }
                
                var isValidToken = apiSetting.access_token.some((accessToken) => {
                    var isValid = accessToken.value === token;
                    return isValid;
                });
                
                isValidToken = isValidToken && apiSetting.is_enable;
                if (!isValidToken) {
                    return done(null, false, new TypeError('common.users.token.invalid'));
                }
                
                userProfile.userByIdInternal(req, idOwner, user._id.toString(), done);
            });
        });
    }));
};
