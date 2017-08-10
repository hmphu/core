'use strict';
//
//  core.routes.js
//  handle core system routes
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');

/**
 * Extend user's controller
 */
module.exports = _.assign(
    require('./strategies/local'),
    require('./strategies/gmail')
);
