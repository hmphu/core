'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    users = require('../../controllers/user.controller');

module.exports = function (config) {
    // Use twitter strategy
    passport.use(new TwitterStrategy({
        consumerKey: config.twitter.clientID,
        consumerSecret: config.twitter.clientSecret,
        callbackURL: config.twitter.callbackURL,
        passReqToCallback: true
    },
    function (req, token, tokenSecret, profile, done) {
        // Set the provider data and include tokens
        var provider_data = profile._json;
        provider_data.token = token;
        provider_data.tokenSecret = tokenSecret;

        // Create the user OAuth profile
        var display_name = profile.display_name.trim();
        var iSpace = display_name.indexOf(' '); // index of the whitespace following the first_name
        var first_name = iSpace !== -1 ? display_name.substring(0, iSpace) : display_name;
        var last_name = iSpace !== -1 ? display_name.substring(iSpace + 1) : '';

        var providerUserProfile = {
            first_name: first_name,
            last_name: last_name,
            display_name: display_name,
            username: profile.username,
            profile_image: profile.photos[0].value.replace('normal', 'bigger'),
            provider: 'twitter',
            providerIdentifierField: 'id_str',
            provider_data: provider_data
        };

        // Save the user OAuth profile
        users.saveOAuthUserProfile(req, providerUserProfile, done);
    }));
};
