'use strict';
/**
 * Module dependencies.
 */
var groupPolicy = require('../policies/group.policy'),
    group = require('../controllers/people.group.controller');

module.exports = (app) => {
    // group collection routes
    app.route('/api/people/groups').all(groupPolicy.isAllowed)
        .post(group.add)
        .get(group.list);

    // count group
    app.route('/api/people/groups/count').all(groupPolicy.isAllowed)
        .get(group.count);

    app.route('/api/people/groups/:groupId').all(groupPolicy.isAllowed)
        .get(group.read)
        .put(group.update)
        .delete(group.delete);

    // Finish by binding the middleware
    app.param('groupId', group.groupByID);
};
