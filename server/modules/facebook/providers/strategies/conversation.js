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
exports.setConversation = (data) => {
    let attachments = [];
    if(data.attachments){
        if(_.isArray(data.attachments)){
            _.forEach(data.attachments, (file)=>{
                attachments.push(file.filename);
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
        thread_id: data.thread_id,
        thread_id_v1: data.thread_id_v1,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        is_echo: data.is_echo,
        page_id: data.page_id,
        is_error: data.is_error,
        attachments: attachments
    };
};
