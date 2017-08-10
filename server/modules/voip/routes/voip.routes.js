'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    voipPolicy = require('../policies/voip.policy'),
    voip = require('../controllers/voip.controller'),
    upload = require('../../core/resources/upload'),
    voipHist = require('../controllers/voip.hist.controller'),
    voipReport = require('../controllers/voip.stats.controller'),
    userController = require(path.resolve('./modules/user/controllers/users/user.auth.controller'));

var uploadOpts = {
    mimetype : ['image/gif',
                'image/jpeg',
                'image/png',
                'text/plain',
                'application/pdf',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpointtd',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.oasis.opendocument.text',
                'application/vnd.oasis.opendocument.spreadsheet'],
    fields: [
        {name: "attachments", maxCount: 10},
    ],
};
module.exports = (app) => {
    // sms collection routes
    app.route('/api/voip').all(voipPolicy.isAllowed)
        .post(voipPolicy.permissionFeatures, voip.add);
    
    app.route('/api/voip/update-cdr').all(userController.authenticateApi, voipPolicy.isAllowed)
        .post(voipPolicy.permissionFeatures, voip.updateCdr);

    app.route('/api/voip/get-register-ext').all(voipPolicy.isAllowed)
        .get(voipPolicy.permissionFeatures, voip.getRegisterExt);

    app.route('/api/voip/list-history').all(voipPolicy.isAllowed)
        .post(voipHist.history);

    app.route('/api/voip/count-history').all(voipPolicy.isAllowed)
        .post((req, res, next) => {
            req.body.count = true;
            next();
        }, voipHist.history);

    app.route('/api/voip/report-agent-activity').all(voipPolicy.isAllowed)
        .post(voipPolicy.permissionFeatures,voipReport.reportAgentActivity);

    app.route('/api/voip/report-queue-activity').all(voipPolicy.isAllowed)
        .post(voipPolicy.permissionFeatures,voipReport.reportQueueActivity);

    app.route('/api/voip/convert-voip-to-ticket').all(upload(uploadOpts), voipPolicy.isAllowed)
        .post(voipPolicy.permissionFeatures,voipPolicy.preDataVoip, voip.convertVoipToTicket);
    
    app.route('/api/voip/softphone-api').post(voip.softphoneApi);
    app.route('/api/voip/softphone').all(userController.authenticateExternalApi, voipPolicy.isAllowed).post(voip.softphone);
    
    app.route('/api/voip/missed-call').post(voip.updateMissedCall);
};
