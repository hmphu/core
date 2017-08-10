'use strict';

/**
 * Module dependencies.
 */
var localPolicy = require('../policies/user.local.policy'),
    userLocal = require('../controllers/user.local.controller');

module.exports = (app) => {
    // user localization routes
    app.route('/api/user/localization').all(localPolicy.isAllowed)
        .get(userLocal.read)
        .put(userLocal.update);
};
