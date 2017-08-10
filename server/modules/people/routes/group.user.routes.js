'use strict';
/**
 * Module dependencies.
 */
var groupUserPolicy = require('../policies/group.user.policy'),
    groupUser = require('../controllers/people.group.user.controller');

module.exports = (app) => {
    // group.user collection routes
    app.route('/api/people/groups/:groupId/users').all(groupUserPolicy.isAllowed)
        //save users into this group
        .post(groupUser.add)
        //get all user of this group
        .get(groupUser.list);

    app.route('/api/people/groups/:groupId/users/:userId').all(groupUserPolicy.isAllowed)
        // change group default
        .put(groupUser.update)
        // delete group.
        .delete(groupUser.delete);
    
    app.route('/api/people/groups/:userId/groups').all(groupUserPolicy.isAllowed)
        //get all groups of this user
        .get(groupUser.listUser);
    
    app.route('/api/people/groups/list/agents').all(groupUserPolicy.isAllowed)
        .get(groupUser.listGroupAgent);
};
