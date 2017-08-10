'use strict';
/**
 * Module dependencies.
 */
var playAppPolicy = require('../policies/googleplay.app.policy'),
    playApp = require('../controllers/googleplay.app.controller');

module.exports = (app) => {
    app.route('/api/google-play-app').all(playAppPolicy.isAllowed)
        .post(playApp.add)
        .delete(playApp.deleteInactive);

    app.route('/api/google-play-app/list/:is_active/:sort_by').all(playAppPolicy.isAllowed)
        .get(playApp.list);

    app.route('/api/google-play-app/count').all(playAppPolicy.isAllowed)
        .get(playApp.count);

    // Single coupon routes
    app.route('/api/google-play-app/:google_app_id').all(playAppPolicy.isAllowed)
        .get(playApp.read)
        .put(playApp.update)
        .delete(playApp.delete);

    app.route('/api/google-play-app/toggle/:google_app_id').all(playAppPolicy.isAllowed)
        .put(playApp.toggle);

    // Finish by binding middleware
    app.param('google_app_id', playApp.googleplayAppByID);
};
