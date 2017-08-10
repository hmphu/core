'use strict';

/**
 * Module dependencies.
 */
var planPolicy = require('../policies/plan.policy'),
    plan = require('../controllers/plan.controller');

module.exports = function(app) {
    // get all public plans
    app.route('/api/plans').all(planPolicy.isAllowed)
        .get( plan.getPlans);
    
    // get all public plans
    app.route('/api/plans/:planId').all(planPolicy.isAllowed)
        .get( plan.getPlan);

    // check the availability of upgrading a plan
    app.route('/api/plans/current-plan-is-max').all(planPolicy.isAllowed)
        .post( plan.checkCurrentPlanIsMax);
    
};
