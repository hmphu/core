'use strict';

/**
 * Module dependencies.
 */
var commisssionHistPolicy = require('../policies/commission.hist.policy'),
    commissionHist = require('../controllers/commission.hist.controller');

module.exports = function(app) {
    app.route('/api/commission/reference-history').all(commisssionHistPolicy.isAllowed)
        .get( commissionHist.getReferenceHistory);
};
