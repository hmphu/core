'use strict';
/**
 * Module dependencies.
 */
var orgPolicy = require('../policies/org.policy'),
    org = require('../controllers/people.organization.controller');

module.exports = (app) => {
    // org collection routes
    app.route('/api/people/organizations').all(orgPolicy.isAllowed)
        .post(org.add)
        .get(org.list);
    
    // org collection routes
    app.route('/api/people/organizations/count').all(orgPolicy.isAllowed)
        .get(org.count);

    app.route('/api/people/organizations/:org_id').all(orgPolicy.isAllowed)
        .get(org.read)
        .put(org.update)
        .delete(org.delete);
    
    app.route('/api/people/organizations/:org_id_search/requester').all(orgPolicy.isAllowed)
        .get(org.searchRequesterByOrgId);

    // Finish by binding the middleware
    app.param('org_id', org.orgByID);
};
