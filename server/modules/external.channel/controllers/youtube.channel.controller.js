'use strict';
//
//  youtube.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    http = require('../../core/resources/http'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    Youtube = mongoose.model('Youtube'),
    YoutubeChannel = mongoose.model('YoutubeChannel'),
    YoutubeVideo = mongoose.model('YoutubeVideo'),
    Utils = require('../../core/resources/utils'),
    youtube_res = require('../../core/resources/youtube'),
    validate = require('../validator/youtube.channel.validator'),
    request = require('request');

/*youtube_res.insertCommentThread({
    email: "dragonhehe88@gmail.com",
    content: 'comment insert',
    parentId: '',
    channelId: 'UCuD5QLu9G7-SRC7k_xzUf8g',
    videoId: 'xZtGmeVvuDk',
}, (err, result) => {
    console.log(err);
    console.log(result);
});*/


/*youtube_res.insertReplyComment({
    email: "dragonhehe88@gmail.com",
    content: 'comment insert reply',
    parentId: 'z12wt5v5av3sv1dac04chhsozrnaf3tgiik',
    channelId: 'UCuD5QLu9G7-SRC7k_xzUf8g',
    videoId: 'xZtGmeVvuDk',
    //z12wt5v5av3sv1dac04chhsozrnaf3tgiik.1487314910059166
}, (err, result) => {
    console.log(err);
    console.log(result);
});*/


var responseHtml = function(res, data){
    var response = `<html><body>Response youtube<script type='text/javascript'>var data = ${data};localStorage.setItem('youtube_callback',JSON.stringify(data)); window.self.close();</script></body></html>`;
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});

    res.write(response, 'utf8');
    res.end();
    return;
}


var getCallbackUrl = function(){
    
    var redirect_uri = `${config.izi.protocal}://realtime.`;
    if(config.izi.domain.toLowerCase().indexOf('izihelp') != -1 && config.izi.domain.toLowerCase().indexOf('www') == -1){
        redirect_uri += `www.${config.izi.domain}`
    }else{
        redirect_uri += `${config.izi.domain}`
    }

    if(config.izi.port != 80 && config.izi.port != 443){
        redirect_uri += `:${config.izi.port}`;
    }
    redirect_uri += '/api/youtube/realtime';

    return redirect_uri;
};

/**
 * @author: khanhpq
 * @params: {
        channel_id: "",
        mode: "" //'subscribe', 'unsubscribe'
   }
 */
var subscribe_toggle = function(options, next){

    var subscribe_url = 'https://pubsubhubbub.appspot.com/subscribe',
    topic_url = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${options.channel_id}`,
    callback_url = getCallbackUrl();

    var data = {
        mode : options.mode || 'subscribe',
        callback : callback_url,
        lease_seconds : 60*60*24*365,
        topic: topic_url
    };

    var query_str = `hub.mode=${data.mode}&hub.callback=${data.callback}&hub.lease_seconds=${data.lease_seconds}&hub.topic=${data.topic}`;

     http({
        host: 'pubsubhubbub.appspot.com',
        path: `/subscribe?${query_str}`,
        //port: 443,
        is_https: true,
        method: "POST",
        headers : {
            'Content-Type' : 'Content-type: application/x-www-form-urlencoded'
        },
        data : data
    }, (err, result) =>{
        if (err) {
            return next(err);
        }
        return next(null, result);
    });  
};


/**
 * get link redirect url to get all youtube
 * @author : khanhpq
 */
exports.authorize = (req, res, next) => {
    youtube_res.generateAuthUrl(function(authUrl){
        return res.redirect(authUrl + "&state=" + req.user.sub_domain);
    });
};

/**
 * redirect to link has login
 * @author : khanhpq
 */

exports.callback = (req, res, next) => {
    var query = req.query,
    subdomain = req.query.state,
    errors = null;

    if(!query.state){
        errors = {err: 'user.youtube.sub_domain_not_found'};
    }

    if(!query.code){
        errors = {err: 'user.youtube.code_not_found'};
    }

    if(query.error){
        errors = {err: `user.youtube.${query.error}`};
    }

    if(errors){
        responseHtml(res, JSON.stringify(errors));
        return;
    }else{
        var redirect_uri = `${config.izi.protocal}://${subdomain}.${config.izi.domain}`;
            if(config.izi.port != 80 && config.izi.port != 443){
            redirect_uri += `:${config.izi.port}`;
        }
        redirect_uri += `${config.google.youtube_subscribeURL}?code=${query.code}`;
        return res.redirect(redirect_uri);
    }
};

/**
 * gmail youtube get code and token
 * @author : khanhpq
 */
exports.subscribe = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        code = req.query.code,
        errors = null;

    if (!code || code == 'undefined') {
        errors = {err: 'user.youtube.code.not_found'};
    }

    if(errors){
        responseHtml(res, JSON.stringify(errors));
        return;
    }

    //Get channels
    youtube_res.subscribe(code, function(err, data_channel){
        if(err){
            console.error(err, 'Get channels youtube fail: ' + JSON.stringify(req.query));
            return next(err);
        }
        
        var tasks = [], channels =[];

        (data_channel.channels ||[]).forEach((channel) => {
            var promise = new Promise((resolve, reject) => {
                YoutubeChannel.findOne({
                    channel_id: channel.channel_id
                }, (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    
                    if(!result){
                        channels.push(channel);
                    }
                    resolve();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(results) {
            var data = {
                email: data_channel.profile.email,
                id: data_channel.profile.id,
                channels: channels
            };
            responseHtml(res, JSON.stringify({data})); 
        }, function(reason) {
            return next(reason);
        });
    });
};


/**
 * add a new Youtube Channel
 * author : khanhpq
 */
exports.add = [
    (req, res, next)=>{
        if(!req.body.channel_id){
            return next(new TypeError('^validator.youtube.channel_invalid'));
        }
        YoutubeChannel.findOne({
            channel_id: req.body.channel_id
        }, (err, result) => {
            if (err) {
                return next(err);
            }
            if(result){
                return next(new TypeError('^validator.youtube.channel_exist'));
            }
            next();
        });
    },
    (req, res, next) =>{
        req.body.name = req.body.name || req.body.title;
        req.body.avatar = req.body.thumbnails ? req.body.thumbnails.default.url : "";

        var yt_channel = new YoutubeChannel(req.body),
            idOwner = Utils.getParentUserId(req.user);

        yt_channel.ed_user_id = idOwner;
        yt_channel.is_active = true;
        yt_channel.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            subscribe_toggle({channel_id: yt_channel.channel_id, mode: 'subscribe'}, function(err, result){
                /*emitter.emit('evt.youtube.video.getvideos', {
                    idOwner: idOwner,
                    email: yt_channel.email,
                    channel_yt_id: yt_channel.channel_id,
                    channel_id: yt_channel._id,
                    req_user: req.user
                });*/

                request({
                    uri: `${config.izi.protocal}://crawler.${config.izi.domain}/api/crawl`, 
                    method: 'POST', 
                    json: {
                        channel : "youtube", 
                        provider : "channel", 
                        provider_data : {
                            channel_id : yt_channel.channel_id, 
                            crawl_id : yt_channel.channel_id
                        }
                    }
                }, function (error, response, body) {
                    if(error){
                        return next(error);
                    }

                    if (response.statusCode != 200) {
                        console.error('Get channels  fail: ' + JSON.stringify(req.query));
                    }

                    res.json(yt_channel);
                });
            });
        });
    }
];

/**
 * show current Youtube
 * author : khanhpq
 */
exports.read = (req, res) => {
    req.youtube_channel.token = undefined;
    req.youtube_channel.refesh_token = undefined;
    res.json(req.youtube_channel);
};

/**
 * update the current Youtube Channel
 * author : khanhpq
 */
exports.update = (req, res, next) =>{
    var youtube_channel = req.youtube_channel;

    delete req.body.ed_user_id;
    delete req.body.is_active;
    delete req.body.token;
    delete req.body.refesh_token;
    
    // Merge existing youtube channel
    yt_channel = _.assign(youtube_channel, req.body);
    yt_channel.save((errsave) => {
        if(errsave){
            return next(errsave);
        }
        res.json(youtube);
    });
};

/**
 * remove all inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        tasks = [];

    YoutubeChannel.find({
        ed_user_id: idOwner,
        is_active: false
    }).exec((err, arr) =>{
        if(err){
            return next(err);
        }

        arr.forEach((yt_channel) => {
            var promise = new Promise((resolve, reject) => {
                yt_channel.remove(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(yts) {
            res.json({is_succes: true});

        }, function(reason) {
            return next(reason);
        });
    });
};

/**
 * logically delete the current youtube channel
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
    var youtube_channel = req.youtube_channel;
    youtube_channel.remove(function (err) {
        if (err) {
            return next(err);
        }
        res.json({is_success: true});
    });
};

/**
 *
 * author : khanhpq
 * get list youtube channel
 */
exports.list = (req, res) => {
    var idOwner = Utils.getParentUserId(req.user),
        params = {
            query: {
                ed_user_id: idOwner,
                is_active: req.query.is_active == 1? true: false
            },
            select: '-token -refesh_token',
            skip: req.query.skip,
            sort_order: 1,
            sort: 'add_time',
            limit: req.query.limit || config.paging.limit
        };

    Utils.findByQuery(YoutubeChannel, params).exec(function (err, channels) {
        if (err) {
            return next(err);
        }
        res.json(channels);
    });
};


/*
    Count all channel youtube
    @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);

    new Promise(function(resolve, reject) {
        YoutubeChannel.count({
            ed_user_id: idOwner,
            is_active: true
        }, function (err, count) {
            if (err) {
                return reject(new TypeError('youtube.channel.count.fail'));
            }
            resolve(count);
        });

    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            YoutubeChannel.count({
                ed_user_id: idOwner,
                is_active: false
            }, function (err, count) {
                if (err) {
                    return reject(new TypeError('youtube.channel.count.fail'));
                }
                res.json({count_inactive: count, count_active: count_active});
            });
        });

    }, function(reason) {
        next(reason);
    });
};


/**
 * deactive or active yt channels
 * @author: khanhpq
 */
exports.toggle = (req, res, next) => {
    var yt_channel = req.youtube_channel,
        idOwner = Utils.getParentUserId(req.user),
        is_active = null;
    
    if(req.query && req.query.is_active != undefined){
        is_active = req.query.is_active;
    }
    
    // double click -> return error
    if(is_active != yt_channel.is_active){
        return next(new TypeError('youtube.channel.toggle.invalid'));
    }
    
    yt_channel.is_active = !yt_channel.is_active;
    yt_channel.save((errsave) => {
        if(errsave){
            return next(errsave);
        }
        
        if(!yt_channel.is_active){
            subscribe_toggle({channel_id: yt_channel.channel_id, mode: 'unsubscribe'}, function(err, result){
                console.log(err);
                console.log(result);
            });
        }
        
        emitter.emit('evt.youtube.update.user_setting', {
            idOwner: idOwner,
            value: yt_channel.is_active ? 1 : -1
        });
        
        res.json({is_success: false});
    });
};


/**
 * Youtube middleware
 */
exports.youtubeChannelByID = (req, res, next, id) => {

    // check the validity of id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('youtube.channel.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find youtubes by its id
    YoutubeChannel.findById(id).exec((err, youtube_channel) => {
        if (err){
            return next(err);
        }
        if (!youtube_channel || !_.isEqual(idOwner, youtube_channel.ed_user_id)) {
            return next(new TypeError('youtube.channel.id.notFound'));
        }
        req.youtube_channel = youtube_channel;
        next();
    });
};
