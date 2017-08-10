'use strict';

/**
 * Module dependencies.
 */
var smsPolicy = require('../policies/sms.policy'),
    sms = require('../controllers/sms.controller'),
    smsHist = require('../controllers/sms.hist.controller'),
    smsStats = require('../controllers/sms.stats.controller');

module.exports = (app) => {
    // sms collection routes
    app.route('/api/sms').all(smsPolicy.isAllowed)
        .get(smsPolicy.permissionFeatures, sms.loadSettingSms)
        .post(smsPolicy.permissionFeatures, sms.add);

    // sms routes
    app.route('/api/sms/:smsId').all(smsPolicy.isAllowed)
        .get(smsPolicy.permissionFeatures, sms.read)
        .put(smsPolicy.permissionFeatures, sms.update)
        .delete(smsPolicy.permissionFeatures, sms.delete);

    // deactive brand name routes
    app.route('/api/sms/deactive-brand-name/:smsId').all(smsPolicy.isAllowed)
        .put(smsPolicy.permissionFeatures, sms.deactiveBrandName);

    //report sms
    app.route('/api/sms-report/sms-stats').all(smsPolicy.isAllowed)
        .post(smsPolicy.permissionFeatures, smsStats.report_sms_stats);
    app.route('/api/sms-report/sms-total-send-and-received').all(smsPolicy.isAllowed)
        .post(smsPolicy.permissionFeatures, smsStats.report_sms_total_send_and_received);
    app.route('/api/sms-report/sms-by-carrier').all(smsPolicy.isAllowed)
        .post(smsPolicy.permissionFeatures, smsStats.report_sms_by_carrier);
    app.route('/api/sms-history/list-history').all(smsPolicy.isAllowed)
        .post(smsPolicy.permissionFeatures, smsHist.listHistory);
    app.route('/api/sms-history/get-detail-history').all(smsPolicy.isAllowed)
        .post(smsPolicy.permissionFeatures, smsHist.getDetailHistory);
    // Finish by binding the ticket middleware
    app.param('smsId', sms.smsByID);
};
