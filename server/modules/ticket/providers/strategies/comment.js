'use strict';
//
//  comment.js
//  feed comment data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set ticket channel to provider
 * author : lamtv
 */
exports.setComment = (data) => {
    return {
        ref_ticket : data.ref_ticket,
        izi_comment_id : data._id,
        izi_comment_user_id : data.user_id,
        izi_comment_url_key : data.url_key,
        izi_comment_account_id : data.izi_comment_account_id
    };
};

/**
 * set comment channel to provider
 * author : lamtv
 */
exports.setCommentReply = (data) => {
    return {
        izi_comment_id : data.is_comment?data._id:data.comment_id,
        izi_comment_reply_id : data.is_comment?null:data._id,
        izi_comment_user_id : data.user_id,
        izi_comment_account_id : data.izi_comment_account_id
    };
};
