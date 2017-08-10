'use strict';
//
//  comment.js
//  feed comment data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set comment channel to provider
 * author : thanhdh
 */
exports.setZaloMsgTicket = params => {
    return {
        appid: params.appid,
        oaid: params.oaid,
        zalouid: params.fromuid
    };
};

exports.setZaloMsgComment = params => {
    var thumb = undefined;
    if (params.thumb) {
        thumb = params.thumb.split("/").pop();
    }
    var res_data = {};
    var provider_data = {
        zalouid: params.fromuid,
        oaid: params.oaid,
        mac: params.mac,
        event: params.event,
        display_as: params.display_as || 'text',
        href: params.href,
        thumb_url: params.thumb,
        thumb_downloaded: thumb,
        is_error: params.is_error || false
    };

    for (var i in provider_data) {
        if (provider_data[i] !== undefined) {
            res_data[i] = provider_data[i];
        }
    }
    return res_data;
};
