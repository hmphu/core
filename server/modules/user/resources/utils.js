
'use strict'
//
//  utils.js
//  user util
//
//  Created by vupl on 2016-03-02.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var black_list = require('./black_list.json');

/*
 * check whether subdomain is in blacklist or not
 * @author: thanhdh
 */
exports.checkDomainBlackList = (domain) =>{
    var blackList = black_list.domain_black_list;
    for (var i =0; i< blackList.length; ++i) {
        var regex = new RegExp(blackList[i], "i");
        if (domain.search(regex) != -1){
            return true;
        }
    }
    return false;
};

/*
 * send custom user data
 * @author: lamtv
 */
exports.getUserData = function(user) {

    var custom_fields = {
        _id : "_id",
        name: "name",
        ed_parent_id: "ed_parent_id",
        email: "email",
        is_requester: "is_requester",
        is_suspended: "is_suspended",
        is_verified: "is_verified",
        profile_image: "profile_image",
        provider: "provider",
        roles: "roles",
        sub_domain: "sub_domain",
        tags: "tags",
        time_format: "time_format",
        time_zone: "time_zone",
        settings: "settings",
        language: "language"
    };

    var data = {};
    for (var i in custom_fields) {
        data[custom_fields[i]] = user[i];
    }
    return data;
};
