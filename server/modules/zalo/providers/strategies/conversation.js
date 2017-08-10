'use strict';
//
//  conversation.js
//  feed conversation data for fb schema
//
//  Created by thanhdh on 2016-02-22.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');
var path = require('path');
var config = require(path.resolve('./config/config'));
/**
 * set conversation data to provider
 * author : thanhdh
 */
exports.setConversation = (thread, data) => {
    let attachments = [];
    if(data.attachments){
        if(_.isArray(data.attachments)){
            _.forEach(data.attachments, (file)=>{
                attachments.push(`${config.assets_path}${data.ed_user_id}/${file.filename}`);
            });
        }else if(data.attachments.data.length > 0){
            _.forEach(data.attachments.data, (item)=>{
                if(_.indexOf(["image/png", "image/jpeg", "image/jpg", "image/gif"], item.mime_type) !== -1){
                    attachments.push(item.image_data.url);
                } else {
                    attachments.push(item.file_url);
                }
            });
        }
    }
    return {
        thread_id: thread.thread_id,
        shares: data.shares? data.shares.data: [],
        attachments: attachments
    };
};
