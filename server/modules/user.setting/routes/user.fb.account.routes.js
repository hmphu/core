'use strict';

/**
 * Module dependencies.
 */
var fbAccountPolicy = require('../policies/user.fb.account.policy'),
    userFbAccount = require('../controllers/user.fb.account.controller');

module.exports = (app) => {
    //  fb_account routes
    app.route('/api/fb-accounts').all(fbAccountPolicy.isAllowed)
        .get(fbAccountPolicy.permissionFeatures, userFbAccount.list);
    
    app.route('/api/fb-accounts/count').all(fbAccountPolicy.isAllowed)
        .get(fbAccountPolicy.permissionFeatures, userFbAccount.count);
    
    app.route('/api/fb-accounts/callback').all(fbAccountPolicy.isAllowed)
        .get(fbAccountPolicy.permissionFeatures, userFbAccount.callback);
    
    app.route('/api/fb-accounts/:fb_account_id').all(fbAccountPolicy.isAllowed)
        .delete(fbAccountPolicy.permissionFeatures, userFbAccount.remove) //unlink
        .get(userFbAccount.read); //unlink

    app.route('/api/fb-accounts/:fb_account_id/toggle').all(fbAccountPolicy.isAllowed)
        .put(fbAccountPolicy.permissionFeatures, userFbAccount.toggle); //active or deactive

    // Finish by binding the middleware
    app.param('fb_account_id', userFbAccount.fbAccountByID);
};
