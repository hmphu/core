'use strict';

/**
 * Module dependencies.
 */
var brandingPolicy = require('../policies/user.branding.policy'),
    upload = require('../../core/resources/upload'),
    coreController = require('../../core/controllers/core.controller'),
    userBranding = require('../controllers/user.branding.controller');

var uploadOpts = {
    mimetype : "image/jpeg image/png image/gif",
    fields: [
        {name: "favicon"},
        {name: "logo"}
    ],
//    single: 'favicon'
};
// upload(uploadOpts),
module.exports = (app) => {
    // user branding routes
    app.route('/api/user/branding').all(brandingPolicy.isAllowed)
        .get(userBranding.read)
        .put(upload(uploadOpts), coreController.compactBody, userBranding.update);

    app.route('/api/user/branding/reset/:type').all(brandingPolicy.isAllowed)
        .put(userBranding.resetImage);

    app.route('/api/user/branding/change-subdomain').all(brandingPolicy.isAllowed)
        .put(userBranding.changeSubdomain);
};
