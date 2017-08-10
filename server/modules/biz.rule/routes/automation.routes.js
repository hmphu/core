'use strict';
/**
 * Module dependencies.
 */
var automationPolicy = require('../policies/automation.policy'),
    automation = require('../controllers/automation.controller');

module.exports = (app) => {
    // automation collection routes
    app.route('/api/automations').all(automationPolicy.isAllowed)
        .post(automationPolicy.permissionFeatures, automation.add);
    
    app.route('/api/automations/count').all(automationPolicy.isAllowed)
        .get(automationPolicy.permissionFeatures, automation.count);
    
    app.route('/api/automations/list/:is_active/:auto_sort_by').all(automationPolicy.isAllowed)
        .get(automationPolicy.permissionFeatures, automation.list);

    // Single routes
    app.route('/api/automations/:automationId').all(automationPolicy.isAllowed)
        .get(automationPolicy.permissionFeatures, automation.read)
        .put(automationPolicy.permissionFeatures, automation.update)
        .delete(automationPolicy.permissionFeatures, automation.delete);
    
    // Clone routes
    app.route('/api/automations/:automationId/clone').all(automationPolicy.isAllowed)
        .get(automationPolicy.permissionFeatures, automation.clone);

    app.route('/api/automations/reorder/:biz_id_from/:biz_id_to').all(automationPolicy.isAllowed)
        .put(automationPolicy.permissionFeatures, automation.reorder);
    
    app.route('/api/automations/inactive/remove').all(automationPolicy.isAllowed)
        .delete(automationPolicy.permissionFeatures, automation.deleteInactive);
    
    // Finish by binding the automation middleware
    app.param('automationId', automation.automationByID);
    app.param('biz_id_from', automation.position_valid);
    app.param('biz_id_to', automation.position_valid);
};
