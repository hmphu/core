'use strict';

/**
 * Module dependencies.
 */
var apiPolicy = require('../policies/user.sso.policy'),
    userSso = require('../controllers/user.sso.controller');

module.exports = (app) => {
    app.route('/api/user/sso').get(userSso.readOnly);
    app.route('/api/user/sso-setting').all(apiPolicy.isAllowed).get(userSso.read).post(userSso.toggle).put(userSso.update);
};
