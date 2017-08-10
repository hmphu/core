'use strict';
/**
 * Module dependencies.
 */
var dcPolicy = require('../policies/dc.policy'),
    dc = require('../controllers/dc.controller');

module.exports = (app) => {
    // dc collection routes
    app.route('/api/dynamic-contents').all(dcPolicy.isAllowed)
        .post(dc.add)
        .get(dc.list);

    app.route('/api/dynamic-contents/count').all(dcPolicy.isAllowed)
        .get(dc.count);
    
    // Single coupon routes
    app.route('/api/dynamic-contents/:dcId').all(dcPolicy.isAllowed)
        .get(dc.read)
        .put(dc.update)
        .delete(dc.delete);

    // Finish by binding the dc middleware
    app.param('dcId', dc.dcByID);
};
