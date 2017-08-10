'use strict';
//
//  gmail.js
//  feed gmail data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set gmail channel to provider
 * author : thanhdh
 */
exports.setGmail = (data) => {
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        is_valid_token: true,
        label_id: data.label_id,
        watch_expired_date: data.watch_expired_date,
        watch_start_historyId: data.watch_start_historyId,
        is_active: true
    };
};
