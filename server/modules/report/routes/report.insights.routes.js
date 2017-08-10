'use strict';
/**
 * Module dependencies.
 */
var reportPolicy = require('../policies/report.insights.policy'),
    report = require('../controllers/report.insights.controller');

module.exports = (app) => {
    // report collection routes
    app.route('/api/reports').all(reportPolicy.isAllowed)
        .post(reportPolicy.permissionFeatures, report.add);

    app.route('/api/reports/count').all(reportPolicy.isAllowed)
        .get(reportPolicy.permissionFeatures, report.count);
    
    app.route('/api/reports/list/:is_active').all(reportPolicy.isAllowed)
        .get(reportPolicy.permissionFeatures, report.list);
    
    // Single routes
    app.route('/api/reports/:reportId').all(reportPolicy.isAllowed)
        .get(reportPolicy.permissionFeatures, report.read)
        .put(reportPolicy.permissionFeatures, report.update)
        .delete(reportPolicy.permissionFeatures, report.delete);
    
    // Clone routes
    app.route('/api/reports/:reportId/clone').all(reportPolicy.isAllowed)
        .get(reportPolicy.permissionFeatures, report.clone);

    app.route('/api/reports/inactive/remove').all(reportPolicy.isAllowed)
        .delete(reportPolicy.permissionFeatures, report.deleteInactive);
    
    app.route('/api/reports/toggle/:reportId').all(reportPolicy.isAllowed)
        .put(reportPolicy.permissionFeatures, report.toggle);

    // Finish by binding the report middleware
    app.param('reportId', report.reportByID);
};
