'use strict';
//
//  user.controller.js
//  handle user data
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
    require('./users/user.auth.controller'),
    require('./users/user.password.controller'),
    require('./users/user.profile.controller'),
    require('./users/user.login.controller')
);
