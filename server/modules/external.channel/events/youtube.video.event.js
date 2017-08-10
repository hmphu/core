'use strict';
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    YoutubeChannel = mongoose.model('YoutubeChannel'),
    YoutubeVideo = mongoose.model('YoutubeVideo'),
    UserSetting = mongoose.model('UserSetting'),
    User = mongoose.model('User'),
    Utils = require('../../core/resources/utils'),
    moment = require('moment'),
    youtube_res = require('../../core/resources/youtube'),
    ticketController = require('../../ticket/controllers/ticket.controller'),
	rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
	config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    cache = require(path.resolve('./config/lib/redis.cache'));


//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
var createTicketFromVideo = function(options, user, next){
    var data = {
        comment: {
            content: options.video.snippet.description,
            user_id: user._id,
            is_requester: false,
            provider: 'youtube',
            provider_data: {
                video_id: options.video.id,
                channel_yt_id: options.video.snippet.channelId,
                channel_id: options.channel_id,
                thumbnails: options.video.snippet.thumbnails
            }
        },
        status: 0,
        subject: options.video.snippet.title,
        submitter_id: user._id,
        ed_user_id: options.idOwner,
        comment_time: +moment(options.video.snippet.publishedAt).utc(),
        organization: undefined
    };

    User.findById(options.idOwner, (err, owner) => {
        if(err){
            console.error(err, "youtube find owner fail.");
            return next(err);
        }
        //save ticket
        ticketController.addInternal(data, owner, (errTicket, resultTicket) =>{
            if(errTicket){
                console.error(errTicket, "youtube add ticket fail.");
                return next(errTicket);
            }

            return next(null, resultTicket);
        });
    });
}

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

/*
    @params: {
        channel_yt_id // string: channel_id of youtube
        channel_id //ObjectId
        email  // email account youtube,
        req_user
        idOwner
    }
*/
module.exports = (emitter) => {
    emitter.on('evt.youtube.video.getvideos', (options) => {
        youtube_res.getVideos(options.email, options.channel_yt_id, function(err, videos){
            if(err){
                console.error(err, 'Get videos youtube fail: ' + JSON.stringify(options));
                return;
            }
            
            var tasks = [];
            videos.forEach((video) => {
               var promise = new Promise((resolve, reject) => {

                   if(video['id']['videoId']){
                       var yt_video = new YoutubeVideo({
						   ed_user_id: options.idOwner,
                           channel_yt_id: options.channel_yt_id,
                           channel_id:  options.channel_id,
                           video_id: video['id']['videoId'],
                           title: video['snippet']['title'],
                           description: video['snippet']['description'],
                           published: +moment(video['snippet']['publishedAt']).utc()
                       });

                       createTicketFromVideo({
                           video: video,
                           idOwner: options.idOwner,
                           channel_id: options.channel_id
                       }, options.req_user, function(err, result_ticket){
                           
                           if(err){
                               return reject(err);
                           }
                           
                           yt_video.ticket_id = result_ticket._id;
                           
                           yt_video.save((errsave) => {
                               if(errsave){
                                   return reject(errsave);
                               }
                               //send rabbit
                               rbSender(config.rabbit.sender.exchange.batch, { 
                                    topic : 'izi-core-youtube-get-comments-video', 
                                    payload : {
                                        idOwner: options.idOwner,
                                        video_id: yt_video.video_id,
                                        channel_yt_id: yt_video.channel_yt_id,
                                        channel_id: yt_video.channel_id,
                                        email_channel: options.email,
                                        ticket_id: result_ticket._id,
                                        req_user: options.req_user
                                    } 
                                });
                                resolve(); 
                           });
                       });
                   }
                   
                });
                tasks.push(promise);
            });

            Promise.all(tasks).then(function(result) {
                return;
            }, function(reason) {
                console.error(reason, 'Save youtube video fail.');
                return;
            });
        });
    });
    
    emitter.on('evt.youtube.update.user_setting', (options) => {
        cache.findOneWithCache(options.idOwner, 'user.setting.setting', UserSetting, { ed_user_id: options.idOwner }, (err, resultSetting) =>{
            if(resultSetting.features.youtube && resultSetting.features.youtube.is_active){
                
                var current_no = resultSetting.features.youtube.current_no;
                    current_no += options.value;
                
                UserSetting.update({
                    ed_user_id: options.idOwner
                }, {
                    $set: {
                        upd_time: +moment.utc()
                    },
                    $inc: {
                        "features.channels.youtube.current_no": current_no
                    }
                }, (err, result) => {
                    if (err) { console.error(err); }
                    cache.removeCache(options.idOwner, "user.setting.setting", (err) => {
                        err&&console.error(err);
                    });
                });
            }
        });
    });
};
