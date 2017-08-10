'use strict';
//
//  ticket googleplay event.js
//
//  Created by khanhpq.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    googlePlay = require('../../core/resources/google.play'),
    utils = require('../../core/resources/utils'),
    enums = require('../resources/enums'),
    ticketController = require('../controllers/ticket.controller'),
    peopleController = require('../../people/controllers/people.user.controller'),
    moment = require('moment'),
    GooglePlayApp = mongoose.model('GooglePlayApp'),
    Ticket = mongoose.model('Ticket');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) =>{
    emitter.on('evt.ticket.add.googleplay.review', (options, reviews) =>{
        var tasks = [];
        reviews.forEach((review, index) => {
            var promise = new Promise((resolve, reject) => {
                //Crate requester

                var requester = {},
                    comment = review.comments[0].userComment.text.split('\t');
          
                if(review.authorName != ""){
                    requester.name = review.authorName;
                    requester.email = review.authorName.replace(/[_\W]+/g, "_") + review.comments[0].userComment.lastModified.seconds + config.mailer.from;
                }else{
                    requester.name = `requester_${review.comments[0].userComment.lastModified.seconds}`;
                    requester.email = `requester_${review.comments[0].userComment.lastModified.seconds}@auto-gen.izihelp.com`;
                }                    
                requester.roles = ["requester"];
                //save requester
                peopleController.add_internal(options.req_user, requester, function(err, result_requester){
                    if(err || !result_requester){
                        console.error(err, "google play add requester fail.");
                        return reject(err);
                    }
                    var str_start = '';
                    for(var i = 0; i < review.comments[0].userComment.starRating; i++){
                        str_start += '★';
                    }
                    var data = {
                        comment: {
                            content: comment[1],
                            user_id: result_requester._id,
                            is_requester: true,
                            provider: 'google_play',
                            provider_data: {
                                reviewId: review.reviewId,
                                authorName: review.authorName,
                                lastModified: review.comments[0].userComment.lastModified,
                                starRating: review.comments[0].userComment.starRating,
                                reviewerLanguage: review.comments[0].userComment.reviewerLanguage,
                                device: review.comments[0].userComment.device,
                                androidOsVersion: review.comments[0].userComment.androidOsVersion,
                                appVersionCode: review.comments[0].userComment.appVersionCode,
                                appVersionName: review.comments[0].userComment.appVersionName
                            }
                        },
                        status: 0,
                        requester_id: result_requester._id,
                        subject: `${str_start} ${comment[0]}`,
                        submitter_id: result_requester._id,
                        ed_user_id: utils.getParentUserId(options.req_user),
                        comment_time: +moment.utc(),
                        organization: undefined
                    };
                    
                    //save ticket
                    ticketController.addInternal(data, options.req_user, (errTicket, resultTicket) =>{
                        if(errTicket){
                            console.error(errTicket, "google play add ticket fail.");
                            return reject(errTicket);
                        }
                        return resolve();
                    });
                });

            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(results) {
            //Update last index_review
            GooglePlayApp.findById(options._id).exec((err, google_app) => {
                google_app.last_review_id = reviews[0].reviewId;
                google_app.save((errsave) => {
                    if(errsave){
                        console.error(errsave, "google play add fail to update.");
                    }
                });
            });
                
        }, function(reason){
                                
        });
    });
};


/*
{"tokenPagination":{"nextPageToken":"AGkSnOxUAZ3QUq-FSybDEUN5hpW9Gc5BBu63sorRi-e8gPE5Xp_Or6g9vEX6IQjxn0CRCvVGroNXHtsuuDQJje21pNyqUmfIhDw7d2VF4WY8RjlJoVgRugTtWow9Gsg4yuO1J2JECKXQOxeWPJL5DQZS5Y9SlGFQbL6WJHqSqn6e3DDIXGZDuOTazH61ByQNAP1l1hCQtdq3"},"reviews":[{"reviewId":"gp:AOqpTOEgfpwW_EORWjEhWJhcf4OKVmh_umatzziTq3ShSkVVRqpI6bbckoZcn84BSVSuIngWpDSOitGteOE8TA","authorName":"","comments":[{"userComment":{"text":"Iove this\tGood app","lastModified":{"seconds":"1471863505","nanos":504000000},"starRating":5,"reviewerLanguage":"en","device":"mobiistar","androidOsVersion":17,"appVersionCode":2,"appVersionName":"1.0.0"}},{"developerComment":{"text":"Thanks you.","lastModified":{"seconds":"1471926197","nanos":683000000}}}]},null]}


{"tokenPagination":{"nextPageToken":"AGkSnOyGjsYThhpMNBbqOlcKHP71JAV1BLcqCKnDcmvx0GIcqymUFkrO7EckrFt3Hp4y4Ic3O20BbXuUDbuKjVgy6z5cJQCr4gXzjO7wfkmenjTycNPSfWr8zZLK0wWKnyyBVj1R-yfcukJqtV-MEAiGSMs0wRUxiOF0FRgjxI0LvrnTo_51xSfmhOZ4NO-L2uPGLselz4Ut"},"reviews":[{"reviewId":"gp:AOqpTOESZlH21sshT96XwRPGS9maxBQ8ldHXyhlAoKZfyhhnPhvJ8MhdJBNN5LLmH4hmlKvpP7oAFFnfgo5sfg","authorName":"Mây nguyen","comments":[{"userComment":{"text":"Good app\tI like this","lastModified":{"seconds":"1472028506","nanos":744000000},"starRating":5,"reviewerLanguage":"vi","device":"t03g","androidOsVersion":19}}]},{"reviewId":"gp:AOqpTOEgfpwW_EORWjEhWJhcf4OKVmh_umatzziTq3ShSkVVRqpI6bbckoZcn84BSVSuIngWpDSOitGteOE8TA","authorName":"","comments":[{"userComment":{"text":"Love this app\tGood app","lastModified":{"seconds":"1472028325","nanos":349000000},"starRating":5,"reviewerLanguage":"en","device":"mobiistar","androidOsVersion":17,"appVersionCode":2,"appVersionName":"1.0.0"}}]},null]}
*/