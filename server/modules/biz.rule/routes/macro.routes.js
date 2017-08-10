'use strict';
/**
 * Module dependencies.
 */
var macroPolicy = require('../policies/macro.policy'),
    macro = require('../controllers/macro.controller');

module.exports = (app) => {
    // macro collection routes
    app.route('/api/macros').all(macroPolicy.isAllowed)
        .post(macroPolicy.permissionFeatures, macro.add);

    app.route('/api/macros/inactive/remove/:isPersonal/:group_id').all(macroPolicy.isAllowed)
        .delete(macroPolicy.permissionFeatures, macro.deleteInactive);
    
    app.route('/api/macros/:is_active/:isPersonal/:sort_by/:group_id').all(macroPolicy.isAllowed)
        .get(macroPolicy.permissionFeatures, macro.list);
    
    app.route('/api/macros').all(macroPolicy.isAllowed)
        .get(macroPolicy.permissionFeatures, macro.list_all);

    app.route('/api/macros/count/:isPersonal/:group_id').all(macroPolicy.isAllowed)
        .get(macroPolicy.permissionFeatures, macro.count);
    
    app.route('/api/macros/count/group').all(macroPolicy.isAllowed)
        .get(macroPolicy.permissionFeatures, macro.countGroup);
    
    // Single routes
    app.route('/api/macros/:macro_id').all(macroPolicy.isAllowed)
        .get(macroPolicy.permissionFeatures, macro.read)
        .put(macroPolicy.permissionFeatures, macro.update)
        .delete(macroPolicy.permissionFeatures, macro.delete);
    
    // Clone routes
    app.route('/api/macros/:macro_id/clone').all(macroPolicy.isAllowed)
        .get(macroPolicy.permissionFeatures, macro.clone);

    app.route('/api/macros/reorder/:biz_id_from/:biz_id_to').all(macroPolicy.isAllowed)
        .put(macroPolicy.permissionFeatures, macro.reorder);
    
    // Finish by binding the macro middleware
    app.param('macro_id', macro.macroByID);
};
