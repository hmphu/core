'use strict';
/**
 * Module dependencies.
 */
var viewPolicy = require('../policies/view.user.policy'),
    view = require('../controllers/view.user.controller');

module.exports = (app) => {
    // view collection routes
    app.route('/api/views-user').all(viewPolicy.isAllowed)
        .post(view.add);

    app.route('/api/views-user').all(viewPolicy.isAllowed)
        .get(view.list_all);
    
    app.route('/api/views-user/inactive/remove/:isPersonal/:group_id').all(viewPolicy.isAllowed)
        .delete(view.deleteInactive);
        app.route('/api/views-user/count/:is_active/:isPersonal/:group_id').all(viewPolicy.isAllowed)
        .get(view.count);
    
    app.route('/api/views-user/count/group').all(viewPolicy.isAllowed)
        .get(view.countGroup);
    
    app.route('/api/views-user/:is_active/:isPersonal/:sort_by/:group_id').all(viewPolicy.isAllowed)
        .get(view.list);

    // Single routes
    app.route('/api/views-user/:view_user_id').all(viewPolicy.isAllowed)
        .get(view.read)
        .put(view.update)
        .delete(view.delete);
    
    // Clone routes
    app.route('/api/views-user/:view_user_id/clone').all(viewPolicy.isAllowed)
        .get(view.clone);

    app.route('/api/views-user/reorder/:biz_id_from/:biz_id_to').all(viewPolicy.isAllowed)
        .put(view.reorder);
    
    // Finish by binding the view middleware
    app.param('view_user_id', view.viewUserByID);
};
