'use strict';

/**
 * Module dependencies.
 */
var userPolicy = require('../policies/user.setting.policy'),
    userSetting = require('../controllers/user.setting.controller');

module.exports = (app) => {
    // user address routes
    app.route('/api/user/setting').all(userPolicy.isAllowed)
        .get(userSetting.read);
};
