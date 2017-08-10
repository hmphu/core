'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    LinkedInStrategy = require('passport-linkedin').Strategy,
    users = require('../../controllers/user.controller');

module.exports = function (config) {
    // Use linkedin strategy
    passport.use(new LinkedInStrategy({
        consumerKey: config.linkedin.clientID,
        consumerSecret: config.linkedin.clientSecret,
        callbackURL: config.linkedin.callbackURL,
        passReqToCallback: true,
        profileFields: ['id', 'first-name', 'last-name', 'email-address', 'picture-url']
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
            profile_image: (provider_data.pictureUrl) ? provider_data.pictureUrl : undefined,
            provider: 'linkedin',
            providerIdentifierField: 'id',
            provider_data: provider_data
        };

        // Save the user OAuth profile
        users.saveOAuthUserProfile(req, providerUserProfile, done);
    }));
};
