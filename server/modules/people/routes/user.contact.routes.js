'use strict';
/**
 * Module dependencies.
 */
var userContactPolicy = require('../policies/user.contact.policy'),
    userContact = require('../controllers/people.user.contact.controller');

module.exports = (app) => {
    // user.contact collection routes
    app.route('/api/people/user/:userId/contacts/:contactId').all(userContactPolicy.isAllowed)
        .delete(userContact.delete)
        .put(userContact.update);

    app.route('/api/people/user/:userId/contacts').all(userContactPolicy.isAllowed)
        .post(userContact.add)

    app.route('/api/people/user/:userId/contacts').all(userContactPolicy.isAllowed)
        .get(userContact.list);

    // Finish by binding the userContact middleware
    app.param('contactId', userContact.contactId);
};
