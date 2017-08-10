'use strict';
//
//  user.js
//  feed user data for ticket schema
//
//  Created by thanhdh on 2016-03-09.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set user channel to provider
 * author : thanhdh
 */
exports.setUser = (data) => {
    return {
        is_requester: data.is_requester || false
    };
};
