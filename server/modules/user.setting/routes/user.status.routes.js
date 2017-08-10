'use strict';

/**
 * Module dependencies.
 */
var statusPolicy = require('../policies/user.status.policy'),
    userStatus = require('../controllers/user.status.controller');

module.exports = (app) => {
    // user address routes
    app.route('/api/user/status').all(statusPolicy.isAllowed)
        .post(userStatus.change)
        .get(userStatus.read)
        .delete(userStatus.delete);
};
