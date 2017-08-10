'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    User = require('mongoose').model('User'),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    userProfile = require('../controllers/users/user.profile.controller'),
    config = require(path.resolve('./config/config'));

/**
 * Module init function.
 */
module.exports = function(app, db) {
    // Serialize sessions
    passport.serializeUser(function(req, user, done) {
        var idOwner = utils.getParentUserId(user);
        done(null, {idOwner: idOwner, userId: user.id});
    });

    // Deserialize sessions
    passport.deserializeUser(function(req, userSession, done) {
        userProfile.userByIdInternal(req, userSession.idOwner, userSession.userId, done);
    });

    // Initialize strategies
    config.utils.getGlobbedPaths(path.join(__dirname, './strategies/**/*.js')).forEach(function(strategy) {
        require(path.resolve(strategy))(config);
    });

    // Add passport's middleware
    app.use(passport.initialize());
    app.use(passport.session());
};
