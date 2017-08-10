'use strict';
/**
 * Module dependencies.
 */
var googleplayPolicy = require('../policies/googleplay.policy'),
    googleplay = require('../controllers/googleplay.controller');

module.exports = (app) => {
    // collection routes
    app.route('/api/google-play').all(googleplayPolicy.isAllowed)
        .put(googleplay.update)
        .delete(googleplay.delete)
        .get(googleplay.read);

    app.route('/api/google-play/toggle').all(googleplayPolicy.isAllowed)
        .put(googleplay.toggle);
};
