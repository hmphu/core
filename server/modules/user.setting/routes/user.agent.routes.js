'use strict';

/**
 * Module dependencies.
 */
var agentPolicy = require('../policies/user.agent.policy'),
    coreController = require('../../core/controllers/core.controller'),
    userAgent = require('../controllers/user.agent.controller');

module.exports = (app) => {
    // user address routes
    app.route('/api/user/agent').all(agentPolicy.isAllowed)
        .get(userAgent.read)
        .put( userAgent.update);
};
