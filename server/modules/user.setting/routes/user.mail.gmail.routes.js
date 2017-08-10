'use strict';

/**
 * Module dependencies.
 */
var gmailPolicy = require('../policies/user.mail.gmail.policy'),
    gmail = require('../controllers/user.mail.gmail.controller');

module.exports = (app) => {
    
    app.route('/api/gmail/authorize').all(gmailPolicy.isAllowed)
        .get(gmail.authorize);
    
    app.route('/api/gmail/authorize/callback')
        .get(gmail.callback);
    
    app.route('/api/gmail/authorize/subscribe').all(gmailPolicy.isAllowed)
        .get(gmail.subscribe);
    
    app.route('/api/gmail').all(gmailPolicy.isAllowed)
        .delete(gmail.stop_notification)
        .put(gmail.update);

//    app.route( "/api/gmail-real-time" )
//        .post(gmail.real_time);
};
