'use strict';
//
//  api.js
//  feed api data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set api channel to provider
 * author : thanhdh
 */
exports.setApi = (data) => {
    return {
        sub_domain: data.sub_domain,
        sender_id: data.sender_id,
        access_token : data.access_token
    };
};
