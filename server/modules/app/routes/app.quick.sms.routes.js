'use strict';

/**
 * Module dependencies.
 */
var appPolicy = require('../policies/app.quick.sms.policy'),
    upload = require('../../core/resources/upload'),
    appCtrl = require('../controllers/app.quick.sms.controller');

var uploadOpts = {
    mimetype : "text/csv application/vnd.ms-excel application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    single: 'sms_upload'
};

module.exports = function(app) {
    // send sms to contacts
    app.route('/api/apps/quick-sms/send').all(appPolicy.isAllowed)
        .post(appPolicy.permissionFeatures, appCtrl.sendSms);
    
    // read phone data from file excel or csv
    app.route('/api/apps/quick-sms/from-file').all(appPolicy.isAllowed)
        .post(upload(uploadOpts), appPolicy.permissionFeatures, appCtrl.importFile);
    
};