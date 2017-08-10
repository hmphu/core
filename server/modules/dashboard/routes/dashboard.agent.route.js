'use strict';

/**
 * Module dependencies.
 */
var agentPolicy = require('../policies/agent.policy'),
    agent = require('../controllers/agent.controller');

module.exports = function(app) {
    // get notify
    app.route('/api/dashboard/stats/:type').all(agentPolicy.isAllowed)
        .get( agent.countStats);
    
    // count tickets
    app.route('/api/dashboard/count/ticket/:channel').all(agentPolicy.isAllowed)
        .get( agent.countTickets);
    
    // get all ticket or by agent id and channel
    app.route('/api/dashboard/ticket/:channel').all(agentPolicy.isAllowed)
        .get( agent.getTickets);
    
    // get all ticket or by agent id and channel
    app.route('/api/dashboard/ticket-group/:channel').all(agentPolicy.isAllowed)
        .get( agent.getTicketsGroup);
    
    // count all ticket by agent id and channel assignee for group
    app.route('/api/dashboard/count/ticket-group/:channel').all(agentPolicy.isAllowed)
        .get( agent.countTicketsGroup);
    
     // get all assigned ticket
    app.route('/api/dashboard/ticket-assigned').all(agentPolicy.isAllowed)
        .get( agent.getTicketAssigned);

    // count assigned ticket
    app.route('/api/dashboard/count/ticket-assigned').all(agentPolicy.isAllowed)
        .get( agent.countTicketAssigned);

    // get all unanswered ticket
    app.route('/api/dashboard/ticket-unanswered').all(agentPolicy.isAllowed)
        .get( agent.getTicketUnanswered);
    
    // count unanswered ticket
    app.route('/api/dashboard/count/ticket-unanswered').all(agentPolicy.isAllowed)
        .get( agent.countTicketUnanswered);
    
    // count sla 
    app.route('/api/dashboard/count/sla').all(agentPolicy.isAllowed)
        .get( agent.countSlas);
    
    // get  sla
    app.route('/api/dashboard/sla').all(agentPolicy.isAllowed)
        .get( agent.getSlas);
    
    // get  user profile
    app.route('/api/dashboard/profile').all(agentPolicy.isAllowed)
        .get( agent.profile);
    
    // count  void stats
    app.route('/api/dashboard/voip-agent').all(agentPolicy.isAllowed)
        .get( agent.countAgentVoipOnline);
    
    // count  void stats
    app.route('/api/dashboard/voip-stats/:voip_type').all(agentPolicy.isAllowed)
        .get( agent.countVoipStats);
    
    // count  void stats
    app.route('/api/dashboard/sys-notify').all(agentPolicy.isAllowed)
        .get( agent.getSysNotifies);
};
