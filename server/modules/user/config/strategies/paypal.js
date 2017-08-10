'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    PayPalStrategy = require('passport-paypal-openidconnect').Strategy,
    users = require('../../controllers/user.controller');

module.exports = function (config) {
    passport.use(new PayPalStrategy({
        clientID: config.paypal.clientID,
        clientSecret: config.paypal.clientSecret,
        callbackURL: config.paypal.callbackURL,
        scope: 'openid profile email',
        sandbox: config.paypal.sandbox,
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
            email: profile._json.email,
            username: profile.username,
            provider: 'paypal',
            providerIdentifierField: 'user_id',
            provider_data: provider_data
        };

        // Save the user OAuth profile
        users.saveOAuthUserProfile(req, providerUserProfile, done);
    }));
};
