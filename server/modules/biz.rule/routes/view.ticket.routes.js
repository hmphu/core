'use strict';
/**
 * Module dependencies.
 */
var viewPolicy = require('../policies/view.ticket.policy'),
    view = require('../controllers/view.ticket.controller');

module.exports = (app) => {
    // view collection routes
    app.route('/api/views-ticket').all(viewPolicy.isAllowed)
        .post(view.add);
    
    app.route('/api/views-ticket/inactive/remove/:isPersonal/:group_id').all(viewPolicy.isAllowed)
        .delete(view.deleteInactive);
        
    app.route('/api/views-ticket/count/:is_active/:isPersonal/:group_id').all(viewPolicy.isAllowed)
        .get(view.count);
    
    app.route('/api/views-ticket/count/group').all(viewPolicy.isAllowed)
        .get(view.countGroup);

    app.route('/api/views-ticket/:is_active/:isPersonal/:sort_by/:group_id').all(viewPolicy.isAllowed)
        .get(view.list);
    
    app.route('/api/views-ticket').all(viewPolicy.isAllowed)
        .get(view.list_all);

    // Single routes
    app.route('/api/views-ticket/:view_ticket_id').all(viewPolicy.isAllowed)
        .get(view.read)
        .put(view.update)
        .delete(view.delete);
    
    // Clone routes
    app.route('/api/views-ticket/:view_ticket_id/clone').all(viewPolicy.isAllowed)
        .get(view.clone);

    app.route('/api/views-ticket/reorder/:biz_id_from/:biz_id_to').all(viewPolicy.isAllowed)
        .put(view.reorder);
    
    // Finish by binding the view middleware
    app.param('view_ticket_id', view.viewTicketByID);
};
