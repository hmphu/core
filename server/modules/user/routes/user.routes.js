'use strict';

module.exports = function(app) {
    // User Routes
    var users = require('../controllers/user.controller'),
        upload = require('../../core/resources/upload'),
        userPolicy = require('../policies/user.policy');
    var uploadOpts = {
        mimetype : "image/jpeg image/png image/gif",
        single: "profile"
    };

    // setup my account apis
    app.route('/api/user/me').get(users.me);
    app.route('/api/user/internal-token').get(users.internalToken);
    app.route('/api/user/password').post(userPolicy.isAllowed, users.changePassword);
    app.route('/api/user/picture').post(userPolicy.isAllowed, users.userById, upload(uploadOpts), users.changeProfilePicture);
    app.route('/api/user/profile').all(userPolicy.isAllowed, users.userById).put(users.update).delete(users.suspend);

    app.route('/api/user/accounts').delete(users.removeOAuthProvider);
};
