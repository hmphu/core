'use strict';

/**
 * Module dependencies.
 */
var subsciptionPolicy = require('../policies/subscription.policy'),
    subsciption = require('../controllers/subscription.controller'),
    plan = require('../controllers/plan.controller'),
    paymentHist = require('../controllers/payment.hist.controller');

module.exports = function(app) {

    // callback url from onepay
    app.route('/api/subscription/purchase-response/:paymentId').all(subsciptionPolicy.isAllowed)
        .get( subsciption.purchaseResponse);

    // process for payment
    app.route('/api/subscription/purchase/:planId').all(subsciptionPolicy.isAllowed)
        .post( subsciption.purchase);

    // suspend accounts
    app.route('/api/subscription/auth-cancel').all(subsciptionPolicy.isAllowed)
        .post( subsciption.authCancelAccount);

    // TODO: remove later
    app.route('/api/subscription/testpdf').all(subsciptionPolicy.isAllowed)
        .post( subsciption.testPdf);
    
    app.route('/api/subscription/test').all(subsciptionPolicy.isAllowed)
        .get( subsciption.testSubscription);
    
    
    app.route('/api/subscription/exchange/:planId')
        .get( subsciption.exchangeData);
    
    // Finish by binding the subscription middleware
    app.param('planId', plan.planById);
    app.param('paymentId', paymentHist.paymentById);
};
