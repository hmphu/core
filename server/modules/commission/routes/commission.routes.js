'use strict';

/**
 * Module dependencies.
 */
var commisssionPolicy = require('../policies/commission.policy'),
    commissionController = require('../controllers/commission.controller');

module.exports = function(app) {
    
    app.route('/api/commission/get-reference-info').all(commisssionPolicy.isAllowed)
        .get( commissionController.getReferenceInfo);
    
    app.route('/api/commission/get-total-commission').all(commisssionPolicy.isAllowed)
        .get( commissionController.getTotalCommission );
};
