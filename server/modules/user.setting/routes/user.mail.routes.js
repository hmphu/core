'use strict';

/**
 * Module dependencies.
 */
var mailPolicy = require('../policies/user.mail.policy'),
    coreController = require('../../core/controllers/core.controller'),
    userMail = require('../controllers/user.mail.controller');

module.exports = (app) => {
    
    // user mail routes
    app.route('/api/user/mail').all(mailPolicy.isAllowed)
        .get(userMail.read)
        .put(coreController.compactBody, userMail.update);
};
