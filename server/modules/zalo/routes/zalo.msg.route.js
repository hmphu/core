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
var oa = require('../controllers/zalo.msg.controller'),
    oaPolicy = require('../policies/zalo.msg.policy'),
    upload = require('../../core/resources/upload');

var msgUploadOptstest = {
    mimetype: 'image/gif, image/jpeg, image/png, image/*',
    single: "file"
};


var msgUploadOpts = {
    mimetype: 'image/gif, image/jpeg, image/png, image/*',
    single: "file"
};

module.exports = function (app) {
    app.route('/api/zalo/test')
        .get(oa.test)
        .post(upload(msgUploadOptstest), oa.test);


    app.route('/api/zalo/pages/:oaPageId/messages')
        .post(upload(msgUploadOpts), oa.createMessage).all(oaPolicy.isAllowed);

    app.route('/api/zalo/pages/:oaPageId/users/:id/messages').all(oaPolicy.isAllowed)
        .get(oa.list);
//
//    app.param('automationId', automation.automationByID);
};
