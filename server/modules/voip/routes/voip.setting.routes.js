'use strict';

/**
 * Module dependencies.
 */
var voipsettingsPolicy = require('../policies/voip.setting.policy'),
    voipSettings = require('../controllers/voip.setting.controller');

module.exports = (app) => {
    // sms collection routes
    app.route('/api/voip-settings').all(voipsettingsPolicy.isAllowed)
        .get(voipsettingsPolicy.permissionFeatures, voipSettings.loadSetting)
        .post(voipsettingsPolicy.permissionFeatures, voipSettings.add);

    // sms routes
    app.route('/api/voip-settings/:voipSettingId').all(voipsettingsPolicy.isAllowed)
        .get(voipsettingsPolicy.permissionFeatures, voipSettings.read)
        .put(voipsettingsPolicy.permissionFeatures, voipSettings.update)
        .delete(voipsettingsPolicy.permissionFeatures, voipSettings.delete);

    // Finish by binding the ticket middleware
    app.param('voipSettingId', voipSettings.voipByID);
};
