'use strict';
//
//  chat.js
//  feed chat data for ticket schema
//
//  Created by lamtv on 2016-03-23.
//  Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * set chat channel to provider
 * author : lamtv
 */
exports.setChatSession = data => {
    return {
        ref_ticket : data.ref_ticket,
        izi_chat_session_id : data._id,
        izi_chat_account_id : data.izi_chat_account_id
    };
};

exports.setChatMessage = data => {
    return {
        izi_chat_msg_id : data._id,
        izi_chat_user_id : data.user_id,
        izi_chat_msg_type : data.msg_type,
        izi_chat_account_id : data.izi_chat_account_id
    };
};
