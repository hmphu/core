'use strict'
//
// youtube.js
// define youtube function
//
// Created by khanhpq on 2015-12-17.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var path = require('path'),
    _ = require('lodash'),
    moment = require("moment"),
    config = require(path.resolve('./config/config')),
    google = require("googleapis"),
    mongoose = require('mongoose'),
    key = require('./gmail.key.json'),
    fs = require("fs"),
    http = require('./http'),
    googleAuth = require("google-auth-library");


var redirect_uri = `${config.izi.protocal}://`;
    if(config.izi.domain.toLowerCase().indexOf('izihelp') != -1 && config.izi.domain.toLowerCase().indexOf('www') == -1){
        redirect_uri += `www.${config.izi.domain}`
    }else{
        redirect_uri += `${config.izi.domain}`
    }

    if(config.izi.port != 80 && config.izi.port != 443){
        redirect_uri += `:${config.izi.port}`;
    }
    redirect_uri += `${config.google.youtube_callbackURL}`;

var auth = new googleAuth(),
    oauth2Client = new auth.OAuth2(config.google.clientID, config.google.clientSecret, redirect_uri);

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
var getJwtClient = function(mail, next){
    var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, config.google.scopes_youtube, mail);
    jwtClient.authorize(function(err, tokens) {
        next(err, jwtClient);
    })
};

var getYoutubeServer = function(mail, callback){
    getJwtClient(mail, function(err, result){
        if(err){
            console.error(err, 'Failed to get youtube api');
            callback(err, null);
            return ;
        }
        
        oauth2Client.setCredentials(result.credentials);
        callback(null, google.youtube({
          version: 'v3',
          auth: oauth2Client
        }));
    });
};


/*
 * @author: khanhpq get token
 */
var getToken = function(code, next) {
    oauth2Client.getToken(code, function(err, tokens) {
        if (!tokens || err) {
            console.error(err, 'Failed to get gmail token');
            return next(err);
        }
        oauth2Client.setCredentials(tokens);
        next(err, tokens);
    });
};

/*
data: {
    access_token
    expires_in
    created
}
*/
var refreshToken = function(data, next) {
    oauth2Client.getToken(code, function(err, tokens) {
        if (!tokens || err) {
            console.error(err, 'Failed to get gmail token');
            return next(err);
        }
        
        oauth2Client.setCredentials(tokens);
        next(err, tokens);
    });
};

var getYoutubePaging = function(service, params, nextPageToken, aray_temp, callback){
    var options = params;
    if(nextPageToken && nextPageToken != ""){
        options.pageToken = nextPageToken;
    }
    
    service(options, function(err, result){
        if (err) {
            return callback(err);
        }

        if (!result) {
            return callback(null, aray_temp);
        }

        aray_temp.push(result);
        
        if(result.nextPageToken){
            return (getYoutubePaging(service, params, result.nextPageToken, aray_temp, callback));
        }else{
            return callback(null, aray_temp, {nextPageToken : nextPageToken, count_last_result: result.pageInfo.totalResults});
        }
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * @author: khanhpq get token
 */
module.exports.generateAuthUrl = (next) => {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: config.google.scopes_youtube
    });
    next(authUrl);
};

/*
 * @author: khanhpq getChannels
 */
module.exports.subscribe = (code, next) => {

    getToken(code, function(err, token){
        if (err) {
            return next(err);
        }
        http({
            host: 'www.googleapis.com',
            path: `/oauth2/v1/userinfo?alt=json&access_token=${token.access_token}`,
            port: 443,
            is_https: true,
            method: "GET"
        }, (err, profile) =>{
            if (err) {
                return next(err);
            }

            exports.getChannels(profile.email, function(err, channels){
                if(err){
                    return next(err);
                }
                
                return next(null, {
                    profile: profile,
                    channels: channels
                });
            });
        });  
    });
};


/* 
 * @params: email //email off channel
 */
module.exports.getChannels = (email, next) => {
    getYoutubeServer(email, function(err, server){
        if(err){
            return next(err);
        }
        
        var params = {
            part: 'snippet, contentDetails',
            mine: true,
            maxResults: 50
        };
        getYoutubePaging(server.channels.list, params, '', [], function(err, results){
            if(err){
                return next(err);
            }
            var channels = [];
            results.forEach(function(page){
                (page.items || []).forEach(function(channel){
                    channels.push({
                        channel_id: channel.id,
                        title: channel.snippet.title,
                        description: channel.snippet.description,
                        publishedAt: channel.snippet.publishedAt,
                        thumbnails: channel.snippet.thumbnails
                    });
                });
            });
            next(null, channels);
        });
    });
};

/* 
 * @params: {
        email //email off channel
        channel_yt_id //string channel_id of youtube
    }
 */
module.exports.getVideos = (email, channel_yt_id, next) => {
    getYoutubeServer(email, function(err, server){
        if(err){
            return next(err);
        }

        var params_search = {
            part: 'snippet',
            channelId: channel_yt_id,
            maxResults: 1
        };
        
        getYoutubePaging(server.search.list, params_search, '', [], function(err, results){
            if(err){
                return next(err);
            }
            var videos = [];
            results.forEach(function(result){
                if(result.items){
                    videos = _.concat(videos, result.items);
                }
            });
            next(null, videos);
        });
    });
}

/* 
 * @params: {
        email //email off channel
        video_id //string
    }
 */
module.exports.getComments = (options, next) => {
    getYoutubeServer(options.email, function(err, server){
        if(err){
            return next(err);
        }

        var params_comment = {
            part: 'snippet, replies',
            videoId: options.video_id,
            textFormat: 'plainText', //html
            moderationStatus: 'published',
            maxResults: 50,
            fields: 'items,nextPageToken,pageInfo,tokenPagination',
            //fields: 'etag,eventId,items,kind,nextPageToken,pageInfo,tokenPagination,visitorId'
        };
        
        getYoutubePaging(server.commentThreads.list, params_comment, '', [], function(err, data, nextPageInfor){
            if(err){
                return next(err);
            }
            var comments = [];
            data.forEach(function(result){
                if(result.items){
                    comments = _.concat(comments, result.items);
                }
            });
            next(null, {comments: comments, nextPageInfor: nextPageInfor});
        });
    });
}

/* 
 * create new comment youtube
 * @params: {
        email //email off channel
        content: '',
        parentId: '',
        channelId: ''
   }
 */
module.exports.insertCommentThread = (options, next) => {
    getYoutubeServer(options.email, function(err, server){
        //Create a comment with snippet.
        var data = {
            part: 'snippet, replies',
            resource: {
                snippet: {
                    channelId: options.channelId,
                    videoId: options.videoId,
                    topLevelComment: {
                        snippet: {
                            textOriginal: options.content
                        }
                    }
                }
            }
        }
        server.commentThreads.insert(data, next);
    });
};


/* 
 * create new reply comment youtube
 * @params: {
        email //email off channel
        content: '',
        parentId: '',
        channelId: '',
        videoId: ''
   }
 */
module.exports.insertReplyComment = (options, next) => {
    getYoutubeServer(options.email, function(err, server){
        //Create a comment with snippet.
        var data = {
            part: 'snippet, id',
            resource: {
                snippet: {
                    channelId: options.channelId,
                    videoId: options.videoId,
                    parentId: options.parentId,
                    textOriginal: options.content
                }
            }
        }
        server.comments.insert(data, next);
    });
};
