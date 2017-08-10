'use strict';

/**
 * Module dependencies.
 */
var fbPagePolicy = require('../policies/user.fb.page.policy'),
    userFbPage = require('../controllers/user.fb.page.controller');

module.exports = (app) => {
    //  fb_page routes
    app.route('/api/fb-pages').all(fbPagePolicy.isAllowed)
        .post(fbPagePolicy.permissionFeatures, userFbPage.add)
        .get(fbPagePolicy.permissionFeatures, userFbPage.list);
    
    app.route('/api/fb-pages/count').all(fbPagePolicy.isAllowed)
        .get(fbPagePolicy.permissionFeatures, userFbPage.count);
    
    app.route('/api/fb-pages/callback').all(fbPagePolicy.isAllowed)
        .get(fbPagePolicy.permissionFeatures, userFbPage.callback);
    
    app.route('/api/fb-pages/:fb_page_id').all(fbPagePolicy.isAllowed)
        .get(fbPagePolicy.permissionFeatures, userFbPage.getPage)
        .put(fbPagePolicy.permissionFeatures, userFbPage.editPageSetting)
        .delete(fbPagePolicy.permissionFeatures, userFbPage.remove); //unlink

    app.route('/api/fb-pages/:fb_page_id/toggle').all(fbPagePolicy.isAllowed)
        .put(fbPagePolicy.permissionFeatures, userFbPage.toggle); //active or deactive
    
    // Finish by binding the middleware
    app.param('fb_page_id', userFbPage.fbPageByID);
};
