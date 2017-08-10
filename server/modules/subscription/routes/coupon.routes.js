'use strict';

/**
 * Module dependencies.
 */
var couponPolicy = require('../policies/coupon.policy'),
    coupon = require('../controllers/coupon.controller');

module.exports = function(app) {

    // apply promotion code
    app.route('/api/coupon/apply').all(couponPolicy.isAllowed)
        .post( coupon.checkPromoCode);
};
