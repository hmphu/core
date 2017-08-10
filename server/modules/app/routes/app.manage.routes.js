'use strict';

/**
 * Module dependencies.
 */
var appPolicy = require('../policies/app.manage.policy'),
    appManage = require('../controllers/app.manage.controller'),
    upload = require('../../core/resources/upload');

var uploadOpts = {
    mimetype : "application/zip application/octet-stream application/x-zip-compressed",
    single: 'upload_app'
};

module.exports = function(app) {
    // get all app 
    app.route('/api/apps/manage').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, appManage.list );
    
    // get app setting  by id
    app.route('/api/apps/manage/:appId').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, appManage.getAppSetting )
        .put(appPolicy.permissionFeatures, appManage.edit )
        .post(appPolicy.permissionFeatures, appManage.update )
        .delete(appPolicy.permissionFeatures, appManage.delete);
    
    // dowload app
    app.route('/api/apps/download/:appId').all(appPolicy.isAllowed)
        .get(appPolicy.permissionFeatures, appManage.download );
    
    // enable or disable app
    app.route('/api/apps/toggle/:appId').all(appPolicy.isAllowed)
        .put(appPolicy.permissionFeatures, appManage.toggle );
    
    // upload app
    app.route('/api/apps/upload').all(appPolicy.isAllowed)
        .post(appPolicy.permissionUpload,  upload(uploadOpts), appManage.upload);
    
    // Finish by binding the manage middleware
    app.param('appId', appManage.getAppById);
};
