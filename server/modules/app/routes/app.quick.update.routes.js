'use strict';

/**
 * Module dependencies.
 */
var appPolicy = require('../policies/app.quick.update.policy'),
    appQuick = require('../controllers/app.quick.update.controller');

module.exports = function(app) {
    // get all category
    app.route('/api/apps/quick-update/list').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, appQuick.listTicket);
    
    // get all app
    app.route('/api/apps/quick-update/count').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, appQuick.countTicket);
    
    // get featured app
    app.route('/api/apps/quick-update/report').all(appPolicy.isAllowed)
        .post(appPolicy.permissionFeatures, appQuick.reportTickets);
    
    // update ticket
    app.route('/api/apps/quick-update/update').all(appPolicy.isAllowed)
        .post( appQuick.replyTickets);
    
    // export ticket
    app.route('/api/apps/quick-update/export').all(appPolicy.isAllowed)
        .post( appQuick.exportForm);
};