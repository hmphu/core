'use strict';
//
//  ntt.js
//  feed ntt settings
//
//  Created by vupl on 2016-07-29.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');

module.exports = (data) => {
    return {
        domain: data.domain || '',
        ws_servers: data.ws_servers || '',
        password: data.password || '',
        authorization_user: data.authorization_user || '',
        max_interval: data.max_interval,
        min_interval: data.min_interval,
        display_name: data.display_name || '',
        hack_ip_in_contact: data.hack_ip_in_contact || false,
        hack_via_tcp: data.hack_via_tcp || false,
        no_answer_timeout: data.no_answer_timeout,
        session_timers: data.session_timers,
        node_websocket_options: data.node_websocket_options || '',
        register_exprires: data.register_exprires,
        register_server: data.register_server,
        line_access_code : data.line_access_code || '',
        api_key : data.api_key || '',
        api_secret : data.api_secret || '',
        sp_url : data.sp_url || '',
        sp_token : data.sp_token || ''
    }
}
