'use strict';
/**
 * Module dependencies.
 */
var filterTicketViewPolicy = require('../policies/filter.ticket_view.policy'),
    filterTicketView = require('../controllers/filter.ticket_view.controller'),
    filterTicketViewV2 = require('../controllers/filter.ticket_view.v2.controller');

module.exports = (app) => {
    // org collection routes
    app.route('/api/filter-ticket-view/count/:view_id').all(filterTicketViewPolicy.isAllowed)
        .get(filterTicketView.count);
    app.route('/api/filter-ticket-view/list/:view_id').all(filterTicketViewPolicy.isAllowed)
        .get(filterTicketView.list);
    app.route('/api/filter-ticket-view/getDetail/:view_id').all(filterTicketViewPolicy.isAllowed)
        .get(filterTicketView.getDetail);
    // Finish by binding the middleware
    app.param('view_id', filterTicketView.viewById);

    // V2 area
    app.route('/api/filter-ticket-view-v2/list/:view_id_v2').all(filterTicketViewPolicy.isAllowed)
        .get(filterTicketViewV2.list);
    app.route('/api/filter-ticket-view-v2/download/:view_id').all(filterTicketViewPolicy.isAllowed)
        .get(filterTicketViewV2.download);
    app.param('view_id_v2', filterTicketViewV2.viewById);
};
