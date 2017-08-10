'use strict';
/**
 * Module dependencies.
 */
var triggerPolicy = require('../policies/trigger.policy'),
    trigger = require('../controllers/trigger.controller');

module.exports = (app) => {
    // trigger collection routes
    app.route('/api/triggers').all(triggerPolicy.isAllowed)
        .post(triggerPolicy.permissionFeatures, trigger.add);

    app.route('/api/triggers/count').all(triggerPolicy.isAllowed)
        .get(triggerPolicy.permissionFeatures, trigger.count);
    
    app.route('/api/triggers/list/:is_active/:trigger_sort_by').all(triggerPolicy.isAllowed)
        .get(triggerPolicy.permissionFeatures, trigger.list);
    
    // Single routes
    app.route('/api/triggers/:triggerId').all(triggerPolicy.isAllowed)
        .get(triggerPolicy.permissionFeatures, trigger.read)
        .put(triggerPolicy.permissionFeatures, trigger.update)
        .delete(triggerPolicy.permissionFeatures, trigger.delete);
    
    // Clone routes
    app.route('/api/triggers/:triggerId/clone').all(triggerPolicy.isAllowed)
        .get(triggerPolicy.permissionFeatures, trigger.clone);

    app.route('/api/triggers/reorder/:biz_id_from/:biz_id_to').all(triggerPolicy.isAllowed)
        .put(triggerPolicy.permissionFeatures, trigger.reorder);
    
    app.route('/api/triggers/inactive/remove').all(triggerPolicy.isAllowed)
        .delete(triggerPolicy.permissionFeatures, trigger.deleteInactive);
    
    // Finish by binding the trigger middleware
    app.param('triggerId', trigger.triggerByID);
};
