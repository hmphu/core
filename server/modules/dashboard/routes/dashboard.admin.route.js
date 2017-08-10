'use strict';

/**
 * Module dependencies.
 */
var adminPolicy = require('../policies/admin.policy'),
    admin = require('../controllers/admin.controller');

module.exports = function(app) {

    // get ticket by agent id
    app.route('/api/dashboard/admin/invoice').all(adminPolicy.isAllowed)
        .get( admin.getInvoices);
    
    // get plan info
    app.route('/api/dashboard/admin/plan-info').all(adminPolicy.isAllowed)
        .get( admin.getPlanInfo);

    // get ticket by agent id type
    app.route('/api/dashboard/admin/ticket/:agent_id/:type').all(adminPolicy.isAllowed)
        .get( admin.getTickets);
    
     // count ticket by agent id and type
    app.route('/api/dashboard/admin/count/ticket/:agent_id/:type').all(adminPolicy.isAllowed)
        .get( admin.countTickets);
    
    // get ticket by agent id
    app.route('/api/dashboard/admin/sla').all(adminPolicy.isAllowed)
        .get( admin.getSlas);
    
    // get ticket by agent id
    app.route('/api/dashboard/admin/count/sla').all(adminPolicy.isAllowed)
        .get( admin.countSlas);
};
