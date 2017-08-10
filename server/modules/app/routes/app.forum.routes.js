'use strict';

/**
 * Module dependencies.
 */
var appPolicy = require('../policies/app.forum.policy'),
    appCtrl = require('../controllers/app.forum.controller');

module.exports = function(app) {
    // send sms to contacts
    app.route('/api/apps/forum/custom-setting').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, appCtrl.listCustomFields);
    
};