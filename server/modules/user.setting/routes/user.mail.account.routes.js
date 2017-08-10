'use strict';

/**
 * Module dependencies.
 */
var mailAccountPolicy = require('../policies/user.mail.account.policy'),
    userMailAccount = require('../controllers/user.mail.account.controller');

module.exports = (app) => {
    //  mail account routes
    app.route('/api/user/mail-accounts').all(mailAccountPolicy.isAllowed)
        .get(userMailAccount.list)
        .post(userMailAccount.add);

    app.route('/api/user/mail-accounts/:mailId').all(mailAccountPolicy.isAllowed)
        .put(userMailAccount.update)
        .delete(userMailAccount.remove);

    // make default email
    app.route('/api/user/mail-accounts/make-default/:mailId').all(mailAccountPolicy.isAllowed)
        .put(userMailAccount.setDefault);
    
    // make default email
    app.route('/api/user/mail-accounts/verify/:mailId').all(mailAccountPolicy.isAllowed)
        .get(userMailAccount.sendMailVerify);
    
    // Finish by binding the mail account middleware
    app.param('mailId', userMailAccount.findById);
};
