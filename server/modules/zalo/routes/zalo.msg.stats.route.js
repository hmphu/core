'use strict';
//
//  fb.routes.js
//  handle fb realtime
//
//  Created by thanhdh on 2016-02-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var statsController = require('../controllers/zalo.msg.stats.controller'),
    statsPolicy = require('../policies/zalo.msg.stats.policy');

module.exports = app => {

    app.route('/api/zalo/tickets/search').all(statsPolicy.isAllowed)
        .post(statsController.search);

    app.route('/api/zalo/tickets/:ticket_id/act/solve-ticket').all(statsPolicy.isAllowed)
        .put(statsController.solveTicket);
    
    app.route('/api/zalo/tickets/:id/act/last-comment').all(statsPolicy.isAllowed)
        .get(statsController.getLastTicketComment);

    app.route('/api/zalo/users/:userId/profile-image').all(statsPolicy.isAllowed)
        .get(statsController.getUserProfileImage);
    
    app.route('/api/zalo/users/:zalouid').all(statsPolicy.isAllowed)
        .get(statsController.getUserProfile);
};
