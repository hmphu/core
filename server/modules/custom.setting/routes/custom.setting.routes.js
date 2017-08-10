'use strict';
/**
 * Module dependencies.
 */
var custom_settingPolicy = require('../policies/custom.setting.policy'),
    custom_setting = require('../controllers/custom.setting.controller');

module.exports = (app) => {
    // custom_setting all active and inactive
    app.route('/api/custom-settings/count/:custom_type').all(custom_settingPolicy.isAllowed)
        .get(custom_settingPolicy.permissionFeatures, custom_setting.count);
    
    // custom_setting collection routes
    app.route('/api/custom-settings/:custom_type').all(custom_settingPolicy.isAllowed)
        .get(custom_settingPolicy.permissionFeatures, custom_setting.list)
        .post(custom_settingPolicy.permissionFeatures, custom_setting.add);

    // custom_setting reorder routes
    app.route('/api/custom-settings/reorder/:custom_type/:cs_id_from/:cs_id_to').all(custom_settingPolicy.isAllowed)
        .put(custom_settingPolicy.permissionFeatures, custom_setting.reorder);

    app.route('/api/custom-settings/inactive/remove/:custom_type').all(custom_settingPolicy.isAllowed)
        .delete(custom_settingPolicy.permissionFeatures, custom_setting.deleteInactive);
    
    // Single routes
    app.route('/api/custom-settings/:custom_type/:custom_settingId').all(custom_settingPolicy.isAllowed)
        .get(custom_settingPolicy.permissionFeatures, custom_setting.read)
        .put(custom_settingPolicy.permissionFeatures, custom_setting.update)
        .delete(custom_settingPolicy.permissionFeatures, custom_setting.delete);
    
    // Clone routes
    app.route('/api/custom-settings/clone/:custom_type/:custom_settingId').all(custom_settingPolicy.isAllowed)
        .get(custom_settingPolicy.permissionFeatures, custom_setting.clone);

    // Finish by binding the custom_setting middleware
    app.param('custom_settingId', custom_setting.custom_settingByID);
    app.param('custom_type', custom_setting.custom_settingByType);
    app.param('cs_id_from', custom_setting.position_valid);
    app.param('cs_id_to', custom_setting.position_valid);
};
