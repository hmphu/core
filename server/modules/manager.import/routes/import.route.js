'use strict';
/**
 * Module dependencies.
 */
var importPolicy = require('../policies/import.policy'),
    upload = require('../../core/resources/upload'),
    importController = require('../controllers/import.controller');

var uploadOpts = {
    mimetype : "text/csv application/vnd.ms-excel application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    single: 'import'
};
module.exports = (app) => {
    // izicomment collection routes
    app.route('/api/manager-import/ticket').all(importPolicy.isAllowed)
        .post(upload(uploadOpts), importController.ticket_bulk_import);
};
