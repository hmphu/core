'use strict';

/**
 * Module dependencies.
 */
var appPolicy = require('../policies/app.policy'),
    application = require('../controllers/app.controller');

module.exports = function(app) {
    // fectch data
    app.route('/api/apps/fetch-data/:app_id').all(appPolicy.isAllowed)
        .post(appPolicy.permissionFeatures, application.load_ajax_content);
    
    // load file of app assets
    app.route('/api/apps/assets/:app_id/:type/:file_name').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.load_assets);
    
    // load file of market app assets
    app.route('/api/apps/market-screens/:app_name/:file_name').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.load_market_screenshots);

    // load file of market app assets
    app.route('/api/apps/content/:appId').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.getAppContent);
    
    // get all app by location
    app.route('/api/apps/available/:location').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.getAvailableApps);
    
};
