'use strict';
/**
 * Module dependencies.
 */
var filterReportPolicy = require('../policies/filter.report.policy'),
    filterReportV2 = require('../controllers/filter.report.v2.controller');

module.exports = (app) => {
    // org collection routes
    app.route('/api/filter-report/detail/:report_filter_id').get(filterReportPolicy.isAllowed)
        .get(filterReportV2.getDetail);
    app.route('/api/filter-report/export/:report_filter_id').get(filterReportPolicy.isAllowed)
        .get(filterReportV2.getExport);
    app.route('/api/filter-report/tickets/:report_filter_id/:serier_id/:page').get(filterReportPolicy.isAllowed)
        .get(filterReportV2.getTickets);

    app.param('report_filter_id', filterReportV2.reportFilterById);
};
