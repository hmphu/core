'use strict'
//
// gmail.js
// define gmail function
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

// var redirect_uri = `${config.izi.protocal}://${config.izi.domain}`;
var redirect_uri = `${config.izi.protocal}://`;
    if(config.izi.domain.toLowerCase().indexOf('izihelp') != -1 && config.izi.domain.toLowerCase().indexOf('www') == -1){
        redirect_uri += `www.${config.izi.domain}`
    }else{
        redirect_uri += `${config.izi.domain}`
    }

    if(config.izi.port != 80 && config.izi.port != 443){
        redirect_uri += `:${config.izi.port}`;
    }
    redirect_uri += `${config.google.callbackURL}`;

var gmail = google.gmail('v1'),
    auth = new googleAuth(),
    oauth2Client = new auth.OAuth2(config.google.clientID, config.google.clientSecret, redirect_uri);

//// set version
//var gmail = google.gmail('v1'),
//    auth = new googleAuth(),
//    oauth2Client = new auth.OAuth2(config.google.clientID, config.google.clientSecret, `${config.izi.protocal}:// ${config.izi.domain}:${config.izi.port}${config.google.callbackURL}`);

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

var getJwtClient = function(email, next){
    var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, config.google.scopes, email);
    jwtClient.authorize(function(err, tokens) {
        next(err, jwtClient);
    })
};

/*
 * decode base 64 gmail @author: khanhpq
 */
var decodeMessage = function(string) {
    var regex1 = new RegExp("-", 'g');
    var regex2 = new RegExp("_", 'g');
    return (string.replace(regex1, "+").replace(regex2, "/"));
};


/*
 * @author: khanhpq get token
 */
var getToken = function(code, next) {
    oauth2Client.getToken(code, function(err, token) {
        if (!token || err) {
            console.error(err, 'Failed to get gmail token');
            return next(err);
        }
        next(err, token);
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
        scope: config.google.scopes
    });
    next(authUrl);
};

/*
 * @author: khanhpq get profile
 */
module.exports.getProfile = (code, next) => {

    new Promise(function(resolve, reject) {
        // get token
        getToken(code, function(err, token){ // is a json {access_token: "",
                                                // refresh_token: ""}
            if (err) {
                return reject(err);
            }
            resolve(token);
        });
    }).then(function(token) {
        oauth2Client.credentials = token;
        
        // get profile
        return new Promise(function(resolve, reject) {
            gmail.users.getProfile({
                auth: oauth2Client,
                userId: "me"
            }, function(err, profile) {
                if (err) {
                    return reject(err);
                }
                resolve({
                    access_token: token.access_token,
                    refresh_token: token.refresh_token ? token.refresh_token : null,
                    email_address: profile.emailAddress
                });
            });

        });
    }).then(function(profile) {
        // get expiration and historyId
        return new Promise(function(resolve, reject) {
 
            gmail.users.watch({
                auth: oauth2Client,
                userId: "me",
                resource: {
                    topicName: config.google.gmail_cloud_topic,
                    labelIds: ['INBOX'],
                    labelFilterAction: 'include'
                }
            }, function(err, watch) { // {expiration: "" , historyId: ""}
                if (err) {
                    return reject(err);
                }
               
                profile.watch_expired_date = watch.expiration;
                profile.watch_start_historyId = watch.historyId;
                
                http({
                    host: 'www.googleapis.com',
                    path: `/oauth2/v1/userinfo?alt=json&access_token=${profile.access_token}`,
                    port: 443,
                    is_https: true,
                    method: "GET"
                }, (err, profile_result) =>{
                    
                    profile.display_name = profile_result.name;
                    
                    resolve(profile);
                });  
            });
        });
        
    }).then(function(profile) {
        // Get labelId
        return new Promise(function(resolve, reject) {
            // Get list labels
            gmail.users.labels.list({
                auth: oauth2Client,
                userId: "me",
            }, function(err, labels) {
                if (err) {
                    return reject(err);
                }
                
                // find this user added Izihelp's app after
                var label = _.find(labels.labels, _.matchesProperty('name', "IZIHelp"));
                
                if(!label){
                    return resolve(profile);
                }
                
                profile.label_id = label.id;
                resolve(profile);
            });
        }); 
    
    }).then(function(profile) {
        // Add new label to mark proccessed email
        return new Promise(function(resolve, reject) {
            if (profile.label_id) {
                return next(null, profile);
            }
            
            // Add Izihelp's app to gmail's profile
            gmail.users.labels.create({
                auth: oauth2Client,
                userId: "me",
                resource: {
                    labelListVisibility: "labelShow",
                    messageListVisibility: "show",
                    "name" : "IZIHelp"
                }
            }, function(err, label) {

                if (err) {
                    return reject(err);
                }
                
                // End
                profile.label_id = label.id;
                return next(null, profile);
            });
        });
    }, function(reason) {
        next(reason);
    });
};

/*
 * @author: khanhpq get token
 */
module.exports.stop_notification = (mail, next) => {

    getJwtClient(mail, function(err, jwt){
        if (err) {
            return next(err);
        }
        // stop notification to google cloud
        gmail.users.stop({
            userId : "me",
            auth: jwt
        }, function(err, result) {
            if (err) {
                console.error(err, 'Failed stop gmail');
                return next(err);
            }
            return next(null, result);
        });
    });
};
