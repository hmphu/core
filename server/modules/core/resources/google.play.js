'use strict'
//
// google.play.js
// define google.play function
//
// Created by khanhpq on 2015-12-17.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var path = require('path'),
    _ = require('lodash'),
    moment = require("moment"),
    config = require(path.resolve('./config/config')),
    googleAuth = require("google-auth-library"),
    google = require("googleapis");

// set version

var googlePlay = google.androidpublisher('v2');
var scopes = ['https://www.googleapis.com/auth/androidpublisher'];
    // TODO: change url

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

var getJwtClient = function(keys, next){
    var jwtClient = new google.auth.JWT(keys.client_email, null, keys.private_key, scopes, null);
    //jwtClient.fromJSON(keys);
    jwtClient.authorize(function(err, tokens) {
        next(err, jwtClient);
    });
};

/*
options: {
    packageName : app_id,
    maxResults: 100,
    startIndex: 0,
    auth: jwt
}
*/
var getReview = (options, nextPageToken, reviews, last_review_id, next) => {
    if(!nextPageToken || nextPageToken == ''){
        return callback(null, reviews);
    }
    options.token = nextPageToken;

    googlePlay.reviews.list(options, function(err, result){
        if(err){
            console.error(err, "Failed to get reviews google play, paging ");
            return next(null, reviews);
        }
        reviews.reviews = _.concat(reviews.reviews, result.reviews);
        
        var index = _.findIndex(reviews.reviews, function(o) { return o.reviewId == last_review_id; });
        if(index != -1){
            reviews.reviews = reviews.reviews.slice(0, index);
            return next(null, reviews);
        }
        
        if(result.tokenPagination && result.tokenPagination.nextPageToken){
            return getReview(options, result.tokenPagination.nextPageToken, reviews, next);
        }else{
            return next(null, reviews);
        }
    });
};


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========
module.exports.getReview = (app_id, keys, last_review_id, next) => {
    getJwtClient(keys, function(err, jwt){
        if (err) {
            return next(err);
        }
        var options = {
            packageName : app_id,
            maxResults: 100,
            startIndex: 0,
            auth: jwt
        },
        index = -1;
        
        googlePlay.reviews.list(options, function(err, result){
            if(err){
                return next(err);
            }
            
            index = _.findIndex(result.reviews, function(o) { return o.reviewId == last_review_id; });
            if(index != -1){
                result.reviews = result.reviews.slice(0, index);
                return next(null, result);
            }
            
            if(result.tokenPagination && result.tokenPagination.nextPageToken){
                return getReview(options, result.tokenPagination.nextPageToken, result, last_review_id, next);
            }else{
                return next(null, result);
            }
        });
    });
};

module.exports.replyReview = (app_id, keys, reviewId, text, next) => {
    getJwtClient(keys, function(err, jwt){
        if (err) {
            return next(err);
        }
        var options = {
            packageName: app_id,
            reviewId: reviewId,
            resource: {
              replyText: text
            },
            auth: jwt
        };

        googlePlay.reviews.reply(options, function(err, result){
            return next(err, result);
        });
    });
};
