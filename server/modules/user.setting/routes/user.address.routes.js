'use strict';

/**
 * Module dependencies.
 */
var addressPolicy = require('../policies/user.address.policy'),
    userAddress = require('../controllers/user.address.controller');

module.exports = (app) => {
    // user address routes
    app.route('/api/user/address').all(addressPolicy.isAllowed)
        .get(userAddress.read)
        .put(userAddress.update);
};
