'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    GithubStrategy = require('passport-github').Strategy,
    users = require('../../controllers/user.controller');

module.exports = function (config) {
    // Use github strategy
    passport.use(new GithubStrategy({
        clientID: config.github.clientID,
        clientSecret: config.github.clientSecret,
        callbackURL: config.github.callbackURL,
        passReqToCallback: true
    },
    function (req, accessToken, refreshToken, profile, done) {
        // Set the provider data and include tokens
        var provider_data = profile._json;
        provider_data.accessToken = accessToken;
        provider_data.refreshToken = refreshToken;

        // Create the user OAuth profile
        var display_name = profile.display_name ? profile.display_name.trim() : profile.username.trim();
        var iSpace = display_name.indexOf(' '); // index of the whitespace following the first_name
        var first_name = iSpace !== -1 ? display_name.substring(0, iSpace) : display_name;
        var last_name = iSpace !== -1 ? display_name.substring(iSpace + 1) : '';

        var providerUserProfile = {
            first_name: first_name,
            last_name: last_name,
            display_name: display_name,
            email: profile.emails[0].value,
            username: profile.username,
            // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
            profile_image: (provider_data.avatar_url) ? provider_data.avatar_url : undefined,
            // jscs:enable
            provider: 'github',
            providerIdentifierField: 'id',
            provider_data: provider_data
        };

        // Save the user OAuth profile
        users.saveOAuthUserProfile(req, providerUserProfile, done);
    }));
};
