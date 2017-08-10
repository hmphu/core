'use strict';
//
//  fb.routes.js
//  handle fb realtime
//
//  Created by thanhdh on 2016-02-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var oa = require('../controllers/user.zalo.page.controller'),
    oaPolicy = require('../policies/user.zalo.page.policy');

module.exports = function (app) {

    app.route('/api/zalo/authorize/callback')
        .get(oa.authorizeCallback);

    app.route('/api/zalo/pages/token/add').all(oaPolicy.isAllowed)
        .post(oa.addOAToken);

    app.route('/api/zalo/pages/authorize/url').all(oaPolicy.isAllowed)
        .get(oa.authorizeURL);

    app.route('/api/zalo/pages/list')
        .get(oaPolicy.isAllowed, oa.list);

    app.route('/api/zalo/pages/count')
        .get(oaPolicy.isAllowed, oa.count);

    app.route('/api/zalo/pages/:oaId').all(oaPolicy.isAllowed)
        .get(oa.read)
        .put(oa.edit)
        .delete(oa.remove);

    app.route('/api/zalo/pages/act/get-name').all(oaPolicy.isAllowed)
        .get(oa.readNameByPageId)

    app.param('oaId', oa.oaById);

    app.param('oaPageId', oa.oaByPageId);

};
