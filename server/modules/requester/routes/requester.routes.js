'use strict';
/**
 * Module dependencies.
 */
var requesterPolicy = require('../policies/requester.policy'),
    requester = require('../controllers/requester.controller');

module.exports = (app) => {
    // requester collection routes
    app.route('/api/requester-filters').all(requesterPolicy.isAllowed)
        .post(requester.add);

    app.route('/api/requester-filters/:is_active').all(requesterPolicy.isAllowed)
        .get(requester.list);

    // Single routes
    app.route('/api/requester-filters/:requesterId').all(requesterPolicy.isAllowed)
        .get(requester.read)
        .put(requester.update)
        .delete(requester.delete);
    
    // Clone routes
    app.route('/api/requester-filters/clone/:requesterId').all(requesterPolicy.isAllowed)
        .get(requester.read);

    // Finish by binding the requester middleware
    app.param('requesterId', requester.requesterByID);
};
