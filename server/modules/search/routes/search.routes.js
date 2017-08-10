'use strict';
/**
 * Module dependencies.
 */
var searchPolicy = require('../policies/search.policy');
var search = require('../controllers/search.controller');
var path = require('path');
var userController = require(path.resolve('./modules/user/controllers/users/user.auth.controller'));


module.exports = (app) => {
    app.route('/api/search').all(userController.authenticateApi, searchPolicy.isAllowed);
    app.route('/api/search').get(search.searchByQuery).post(search.searchByQuery);
};
