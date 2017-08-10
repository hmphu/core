'use strict';
/**
 * Module dependencies.
 */
var path = require('path');
var reportPolicy = require('../policies/report.stats.policy');
var report = require('../controllers/report.stats.controller');
var userController = require(path.resolve('./modules/user/controllers/users/user.auth.controller'));

module.exports = (app) => {
    app.route('/api/stats/*').all(userController.authenticateApi, reportPolicy.isAllowed);
    app.route('/api/stats/ticket_stats/:stats').get(reportPolicy.permissionFeatures, report.ticketStats);
};
