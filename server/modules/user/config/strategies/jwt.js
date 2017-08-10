'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var LocalStrategy = require('passport-local').Strategy;
var config = require(path.resolve("./config/config"));
var User = require('mongoose').model('User');
var UserSso = require('mongoose').model('UserSso');
var Nonce = require('mongoose').model('Nonce');

module.exports = function() {
    // Use local strategy
    passport.use("jwt", new LocalStrategy({
        passReqToCallback : true,
        usernameField : 'sub_domain',
        passwordField : 'token'
    }, function(req, subDomain, token, done) {
        // verify if single sign on is enable for owner account
        var verifyOwnerSso = new Promise((resolve, reject) => {
            var stages = [{
                $match : {
                    sub_domain : subDomain,
                    roles : 'owner'
                }
            }, {
                $lookup : {
                    from : `${config.dbTablePrefix}user_sso`,
                    localField : '_id',
                    foreignField : 'ed_user_id',
                    as : 'sso'
                }
            }, {
                $match : {
                    'sso.provider' : 'jwt',
                    'sso.is_enable' : true
                }
            }];
            
            var results = [];
            var cursor = User.aggregate(stages).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
            cursor.each((err, doc) => {
                if (err) {
                    return reject({
                        message : 'sso.jwt.system.error',
                        error : err
                    });
                }

                if (doc) {
                    return results.push(doc);
                }
                
                if (results[0]) {
                    return resolve(results[0].sso[0]);
                }
                
                reject({
                    message : 'sso.jwt.notfound.owner',
                    error : new Error('sso.jwt.notfound.owner')
                });
            });
        });
        
        // verify token symmetric
        var verifyJwt = (sso) => {
            return new Promise((resolve, reject) => {
                var secret = sso.provider_data.token;
                
                var verifyOpts = {
                    ignoreExpiration : true,
                    ignoreNotBefore : true
                };

                jwt.verify(token, secret, verifyOpts, function(err, decoded) {
                    if (err) {
                        return reject({
                            message : 'sso.jwt.invalid.token',
                            error : err
                        });
                    }
                    
                    sso.provider_data.decoded = decoded;
                    
                    resolve(sso);
                });
            });
        };
        
        // verify nonce
        var verifyNonce = (sso) => { 
            return new Promise((resolve, reject) => {
                var nonce = new Nonce({
                    nonce : sso.provider_data.decoded.jti,
                    expires : new Date()
                });
                
                nonce.save((err, newNonce) => {
                    if (err) {
                        return reject({
                            message : 'sso.jwt.invalid.nonce',
                            error : err
                        });
                    }
                    
                    resolve(sso);
                });
            });
        };
        
        // verify expiration (allow 2 minutes since issued time)
        var verifyExpiration = (sso) => {
            return new Promise((resolve, reject) => {
                var iat = sso.provider_data.decoded.iat;
                var interval = Math.floor(Date.now() / 1000) - parseInt(iat);
                var isExpired = !isNaN(interval) && interval > 2 * 60;
                
                if (isExpired) {
                    return reject({
                        message : 'sso.jwt.expired.token',
                        error : new Error('sso.jwt.expired.token')
                    });
                }
                
                resolve(sso);
            });
        };
        
        // start verifying
        verifyOwnerSso.then(sso => {
            return verifyJwt(sso);
        }).then(sso => {
            return verifyNonce(sso);
        }).then(sso => {
            return verifyExpiration(sso);
        }).then(sso => {
            var decoded = sso.provider_data.decoded;
            var email = (decoded.email || '').toLowerCase();
            
            User.findOne({
                sub_domain : subDomain,
                email : email,
                is_requester : false,
                is_suspended : false
            }, function(err, user) {
                if (err) {
                    throw {
                        message : 'sso.jwt.common.error',
                        error : err
                    };
                }
                
                delete sso.provider_data.token; // remove sensitive data

                if (user) {
                    user.sso = sso;
                }
                
                done(null, user);
            });
        }).catch(ex => {
            console.error(ex.error);
            done(new TypeError(ex.message));
        });
    }));
};
