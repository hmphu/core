'use strict';
//
//  core.routes.js
//  handle core system routes
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

module.exports = function (app) {
    // Root routing
    var core = require('../controllers/core.controller');

    app.route('/api/images/:image').get(core.loadImage);
    app.route('/api/files/:type/:file').get(core.loadFile);
    app.route('/api/country').get(core.getCountries);
    app.route('/api/timezone').get(core.getTimezones);
    app.route('/api/export/:file').get(core.loadFileExport);
    app.route('/api/country/:code').get(core.getCountryByCode);
    app.route('/api/forum').get(core.listForum);
    app.route('/api/forum/:domain').get(core.getForumByDomain);
};
