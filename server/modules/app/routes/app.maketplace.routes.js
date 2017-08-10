'use strict';

/**
 * Module dependencies.
 */
var appPolicy = require('../policies/app.marketplace.policy'),
    application = require('../controllers/app.marketplace.controller');

module.exports = function(app) {
    // get all category
    app.route('/api/apps/categories').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.getCategories);
    
    // get all app
    app.route('/api/apps/marketplace').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.getAllApp);
    
    // get featured app
    app.route('/api/apps/marketplace/featured').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.getFeaturedApp);
    
    // get featured app
    app.route('/api/apps/marketplace/recommended').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.getRecommendApp);
    
    // get detail app
    app.route('/api/apps/marketplace/detail/:marketAppId').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, application.detail);
    
    // install app from market
    app.route('/api/apps/marketplace/install/:marketAppId').all(appPolicy.isAllowed)
        .post(appPolicy.permissionFeatures, application.install );
    
    // Finish by binding the marketplace middleware
    app.param('marketAppId', application.getAppGlobalById);
    
};