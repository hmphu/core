'use strict'
//
//  fb.js
//  define fb function
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var path = require('path'),
    config = require(path.resolve('./config/config')),
    _ = require('lodash'),
    utils = require('../resources/utils'),
    FB = require('fb');

//Set version
FB.options({version: config.facebook.version});


/*
 * @author: khanhpq 
 * remove Facebook app
 * return true or false
 */
exports.removePage = (token, page_id, next) => {
    FB.setAccessToken(token);
    FB.api( page_id + '/subscribed_apps', "DELETE", function (res) {
        if (!res || res.error) {
            //console.error(res.error, "Failed to remove fab page with token");
            return next(res.error);
        }
        return next(null, res.success);
    });
};

/*
 * @author: khanhpq 
 * check access token of Facebook
 * return true or false
 */
exports.fetch = (token, uri, next) => {
    FB.setAccessToken(token);
    FB.api( uri, function (res) {
        if (!res || res.error) {
            //console.error(res.error, "Failed to fetch fb data with token");
            return next(res.error);
        }
        return next(null, res);
    });
};

/*
 * @author: khanhpq
 * subscribed page
 */
exports.pageSubscribedApp = (token, page_id, next) => {
    FB.setAccessToken(token);
    FB.api(`${page_id}/subscribed_apps?access_token=${token}`, 'POST', function (res) {
        if (!res || res.error) {
            //console.error(res.error, "Failed to subscribed page fb");
            return next(res.error);
        }
        return next(null, res);
    });
};


/*
 * @author: khanhpq
 * get access token based on its code
 */
exports.getAccessTokenByCode = (redirect_uri, code, next) => {
    FB.api(config.facebook.accessTokenUrl, {
        client_id: config.facebook.clientID,
        client_secret: config.facebook.clientSecret,
        redirect_uri: redirect_uri,
        code: code
    }, function (res) {
        if (!res || res.error) {
            //console.error(res.error, 'Failed to getAccessTokenByCode');
            //TODO notif to user
            return next(res.error);
        }
        
        return next(null, {
            access_token: res.access_token
        });
    });
};


/*
 * @author: khanhpq
 * get fb_exchange_token
 */
exports.getExchangeToken = (access_token, next) => {
    //Extend expiry time of the access token
    FB.api(config.facebook.accessTokenUrl, {
        client_id: config.facebook.clientID,
        client_secret: config.facebook.clientSecret,
        grant_type: 'fb_exchange_token',
        fb_exchange_token: access_token
    }, function (res) {
        if (!res || res.error) {
            //console.error(res.error, 'Failed to fb_exchange_token');
            return next(res.error);
        }

        return next(null, {
            access_token: res.access_token
        });
    });
};

/*
 * author: vupl
 * reply a ticket a via facebook comment
 */
exports.replyCommentFacebook = (data, access_token, next) =>{
    var destination = data.post_id;
    if(!utils.isEmpty(data.comment_id)){
        destination = data.comment_id
    }
    var message = utils.cleanText(data.message);
    FB.setAccessToken(access_token);

    var post_data = {
        message: message
    };
    if(data.attachment_url){
        post_data.attachment_url = data.attachment_url;
    }

    FB.api(`${destination}/comments`, "POST", post_data, (res) =>{
        if(!res){
            return next(null, null);
        }
        if(res.error){
            //console.error(res.error, "Failed comment reply to facebook");
            return next(new TypeError(JSON.stringify(res.error)));
        }
        return next(null, {
            comment_id: res.id
        });
    });
};

/*
 * author: vupl
 * reply a ticket a via facebook message
 */
exports.replyMessageFacebook = (data, access_token, next) =>{
    var conversation_id = data.thread_id;
    var message = utils.cleanText(data.message);
    FB.setAccessToken(access_token);
    FB.api(`${conversation_id}/messages?fields=created_time,from,id,message,subject,to,attachments,shares`, "POST", {
        message: message
    }, (res) =>{
        if(!res){
            return next(null, null);
        }
        if(res.error){
            //console.error(res.error, "Failed message to facebook");
            return next(new TypeError(JSON.stringify(res.error)));
        }
        return next(null, res);
    });
};

/*
 * author: vupl
 * like a comment
 */
exports.likeFacebookComment = (data, access_token, next) =>{
    var destination = data.comment_id;
    FB.setAccessToken(access_token);
    FB.api(`${destination}/likes`, data.method, {}, (res) =>{
        if(!res && res.error && res.error.code){
            return next(res.error, res.success);
        }else{
            return next(res.error, res.success);
        }
    })
}

/*
 * author: vupl
 * like a comment
 */
exports.hideFacebookComment = (data, access_token, next) =>{
    var destination = data.comment_id;
    FB.setAccessToken(access_token);
    FB.api(`${destination}?is_hidden=${data.type}`, "POST",{}, (res) =>{
        if(!res && res.error && res.error.code){
            return next(res.error, res.success);
        }else{
            return next(res.error, res.success);
        }
    });
}

exports.getAccessTokenApp = (facebook_id, next) =>{
    FB.setAccessToken(config.facebook.appToken);
    FB.api(facebook_id, "GET", (res) =>{
        if(!res || res.error){
            console.error(res.error, "Failed Access Token");
            return next(new TypeError("facebook error"));
        }
        return next(null, res);
    })
}
