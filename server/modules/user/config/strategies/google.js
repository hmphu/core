'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    users = require('../../controllers/user.controller');

module.exports = function (config) {
    // Use google strategy
    passport.use(new GoogleStrategy({
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackURL,
        passReqToCallback: true
    },
    function (req, accessToken, refreshToken, profile, done) {
        // Set the provider data and include tokens
        var provider_data = profile._json;
        provider_data.accessToken = accessToken;
        provider_data.refreshToken = refreshToken;

        // Create the user OAuth profile
        var providerUserProfile = {
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
            display_name: profile.display_name,
            email: profile.emails[0].value,
            username: profile.username,
            profile_image: (provider_data.picture) ? provider_data.picture : undefined,
            provider: 'google',
            providerIdentifierField: 'id',
            provider_data: provider_data
        };

        // Save the user OAuth profile
        users.saveOAuthUserProfile(req, providerUserProfile, done);
    }));
};
