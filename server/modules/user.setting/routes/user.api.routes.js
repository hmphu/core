'use strict';

/**
 * Module dependencies.
 */
var apiPolicy = require('../policies/user.api.policy'),
    userApi = require('../controllers/user.api.controller');

module.exports = (app) => {
    
    // user api routes
    app.route('/api/user/api').all(apiPolicy.isAllowed)
        .get(userApi.read)
        .put(userApi.toggle);
    
    // user api token routes
    app.route('/api/user/api-token').all(apiPolicy.isAllowed)
        .post(userApi.addToken);
    app.route('/api/user/api-token/:token').all(apiPolicy.isAllowed)
        .delete(userApi.removeToken);
};
