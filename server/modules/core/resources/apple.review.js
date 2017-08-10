//'use strict'
////
//
//// Created by khanhpq on 2015-12-17.
//// Copyright 2015 Fireflyinnov. All rights reserved.
////
//
//var path = require('path'),
//    _ = require('lodash'),
//    moment = require("moment"),
//    config = require(path.resolve('./config/config')),
//    appStoreReviews = require("app-store-reviews");
//
//
//// ==========
//// = PUBLIC FUNCTIONS AREA =
//// ==========
//module.exports.getReview = (app_id, keys, next) => {
//    getJwtClient(keys, function(err, jwt){
//        if (err) {
//            return next(err);
//        }
//        var options = {
//            packageName : app_id,
//            maxResults: 100,
//            startIndex: 0,
//            auth: jwt
//        };
//
//        googlePlay.reviews.list(options, function(err, result){
//            if(err){
//                return next(err);
//            }
//            
//            if(result.tokenPagination && result.tokenPagination.nextPageToken){
//                return getReview(options, result.tokenPagination.nextPageToken, result, next);
//            }else{
//                return next(null, result);
//            }
//        });
//    });
//};
