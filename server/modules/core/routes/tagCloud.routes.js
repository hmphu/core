'use strict';
//
//  tagCloud.routes.js
//  handle core system routes
//
//  Created by dientn on 2015-05-16.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

module.exports = function (app) {
    // Root routing
    var tag = require('../controllers/tagCloud.controller');

    app.route('/api/tag-cloud-type/:type')
        .get(tag.list)
        .post(tag.add);
    
    app.route('/api/tag-cloud/count')
        .get(tag.count);
    
    app.route('/api/tag-cloud/:tagId')
        .get(tag.get)
        .delete(tag.remove);
    
    app.param('tagId', tag.getTagById);
};
