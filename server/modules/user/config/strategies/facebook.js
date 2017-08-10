'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    FacebookStrategy = require('passport-facebook').Strategy,
    users = require('../../controllers/user.controller');

module.exports = function (config) {
    // Use facebook strategy
    passport.use(new FacebookStrategy({
        clientID: config.facebook.clientID,
        clientSecret: config.facebook.clientSecret,
        callbackURL: config.facebook.callbackURL,
        profileFields: ['id', 'name', 'emails', 'photos'],
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
            email: profile.emails ? profile.emails[0].value : undefined,
            username: profile.username || generateUsername(profile),
            profile_image: (profile.id) ? '//graph.facebook.com/' + profile.id + '/picture?type=large' : undefined,
            provider: 'facebook',
            providerIdentifierField: 'id',
            provider_data: provider_data
        };

        // Save the user OAuth profile
        users.saveOAuthUserProfile(req, providerUserProfile, done);

        function generateUsername(profile) {
            var username = '';

            if (profile.emails) {
                username = profile.emails[0].value.split('@')[0];
            } else if (profile.name) {
                username = profile.name.givenName[0] + profile.name.familyName;
            }

            return username.toLowerCase() || undefined;
        }
    }));
};
