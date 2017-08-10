'use strict';
/**
 * Module dependencies.
 */
var filterUserViewPolicy = require('../policies/filter.user_view.policy'),
    filterUserView = require('../controllers/filter.user_view.controller');

module.exports = (app) => {
    // org collection routes
    app.route('/api/filter-user-view/count/:view_user_id_').all(filterUserViewPolicy.isAllowed)
        .get(filterUserView.count);
    app.route('/api/filter-user-view/list/:view_user_id_').all(filterUserViewPolicy.isAllowed)
        .get(filterUserView.list);
    app.route('/api/filter-user-view/getDetail/:view_user_id_').all(filterUserViewPolicy.isAllowed)
        .get(filterUserView.getDetail);
    
    app.param('view_user_id_', filterUserView.viewUserById);
};
