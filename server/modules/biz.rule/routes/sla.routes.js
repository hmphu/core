'use strict';
/**
 * Module dependencies.
 */
var slaPolicy = require('../policies/sla.policy'),
    sla = require('../controllers/sla.controller'); 

module.exports = (app) => {
    // sla collection routes
    app.route('/api/slas').all(slaPolicy.isAllowed)
        .post(slaPolicy.permissionFeatures, sla.add);

    app.route('/api/slas/count').all(slaPolicy.isAllowed)
        .get(slaPolicy.permissionFeatures, sla.count);
    
    app.route('/api/slas/list/:is_active/:sla_sort_by').all(slaPolicy.isAllowed)
        .get(slaPolicy.permissionFeatures, sla.list);

    // Single routes
    app.route('/api/slas/:slaId').all(slaPolicy.isAllowed)
        .get(slaPolicy.permissionFeatures, sla.read)
        .put(slaPolicy.permissionFeatures, sla.update)
        .delete(slaPolicy.permissionFeatures, sla.delete);
    
    // Clone routes
    app.route('/api/slas/:slaId/clone').all(slaPolicy.isAllowed)
        .get(slaPolicy.permissionFeatures, sla.clone);
    
    app.route('/api/slas/reorder/:biz_id_from/:biz_id_to').all(slaPolicy.isAllowed)
        .put(slaPolicy.permissionFeatures, sla.reorder);
    
    app.route('/api/slas/inactive/remove').all(slaPolicy.isAllowed)
        .delete(slaPolicy.permissionFeatures, sla.deleteInactive);
    
    // Finish by binding the sla middleware
    app.param('slaId', sla.slaByID);
};
