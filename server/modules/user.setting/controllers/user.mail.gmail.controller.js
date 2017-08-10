'use strict';
//
//  user.mail.gmail.controller.js
//  handle user mail account  setting routes
//
//  Created by khanhpq on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    moment = require("moment"),
    enums = require('../resources/enums'),
    provider = require('../providers/index.provider'),
    UserMailAccount = mongoose.model('UserMailAccount'),
    path = require('path'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    redis = require(path.resolve('./config/lib/redis')),
    cachedDb = config.redis.defaultDatabase,
    gmail_res = require('../../core/resources/gmail');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

var markAsInvalidToken = function(gmailAccount, handler) {
    if(gmailAccount.provider_data && gmailAccount.provider == enums.Provider.gmail){
        gmailAccount.provider_data.is_valid_token = false;
        gmailAccount.save(function(err, result){
            if (err){
                console.error(err, 'Failed to set InvalidToken gmail');
                return handler(err, null);
            }
            return handler(err, result);
        });
    }else{
        return handler(null);
    }
};

var responseHtml = function(res, data){
    var response = `<html><body>Response gmail<script type='text/javascript'>var data = ${data};localStorage.setItem('gmail_callback',JSON.stringify(data)); window.self.close();</script></body></html>`;
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    
    res.write(response, 'utf8'); 
    res.end();
    return;
}
//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

/**
 * process mail real time from Gmail
 *    body = {
 *        message:
 *           { data: 'eyJoaXN0b3J5SWQiOjIwNzE1MjIsImVtYWlsQWRkcmVzcyI6ImR1b25ndHJ1Yy45MkBnbWFpbC5jb20ifQ==',
 *             attributes: {},
 *             message_id: '1936919431231'
 *           },
 *         subscription: 'projects/izihelp-gmail/subscriptions/gmail_notif_subscription'
 *    }
 * @author : khanhpq
 */
/*
exports.real_time = (req, res, next) => {
    res.json({});
    if(!req.body.message){
        console.error('Gmail real time: body invalid');
        return;
    }
    rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-gmail', payload: req.body.message});
};
*/

/**
 * get link redirect url to get all google's email
 * @author : khanhpq
 */
exports.authorize = (req, res, next) => {
    var emails = (req.user.settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails;
    //check max support mail.
    if(emails.current_no >= emails.quantity){
        var errors = {err: `user.gmail.max_support`};
        responseHtml(res, JSON.stringify(errors));
        return;
    }
    gmail_res.generateAuthUrl(function(authUrl){
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
        errors = {err: 'user_settings.gmail.sub_domain_not_found'};
    }
    
    if(!query.code){
        errors = {err: 'user_settings.gmail.code_not_found'};
    }
    
    if(query.error){
        errors = {err: `user_settings.gmail.${query.error}`};
    }
    
    if(errors){
        responseHtml(res, JSON.stringify(errors));
        return;
    }else{
        //var redirect_uri = `${config.izi.protocal}://${subdomain}.${config.izi.domain}:${config.izi.port}${config.google.subscribeURL}?code=${query.code}`;
        
        var redirect_uri = `${config.izi.protocal}://${subdomain}.${config.izi.domain}`;
            if(config.izi.port != 80 && config.izi.port != 443){
            redirect_uri += `:${config.izi.port}`;
        }
        redirect_uri += `${config.google.subscribeURL}?code=${query.code}`;
            
        return res.redirect(redirect_uri);
    }
};

/**
 * gmail subscribe get code and token
 * @author : khanhpq
 */
exports.subscribe = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user),
        code = req.query.code,
        errors = null;
    var emails = (req.user.settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails;
    //check max support mail.
    if(emails.current_no >= emails.quantity){
        errors = {err: 'user_settings.gmail.max_support'};
    }

    if (!code || code == 'undefined') {
        errors = {err: 'user_settings.gmail.code.not_found'};
    }
    
    if(errors){
        responseHtml(res, JSON.stringify(errors));
        return;
    }
    
    new Promise(function(resolve, reject) {
        //get gmail profile
        gmail_res.getProfile(code, function(err, gmail_profile){
            if(err){
                console.error(err, 'Get profile gmail fail: ' + gmail_profile.email_address);
                return reject({err: 'user_settings.gmail.getProfile_fail'});
            }
            resolve(gmail_profile);
        });
        
    }).then(function(gmail_profile) {         //check exist
        return new Promise(function(resolve, reject) {
            UserMailAccount.findOne({
                //provider: enums.Provider.gmail,
                mail: gmail_profile.email_address
            }, (err, result) => {
                
                if(err){
                    return reject(err);
                }

                /*
                Check gmail exsited. If existed, remove gmail API
                */
                if(result){
                    if(!_.isEqual(result.ed_user_id, idOwner)){
                        return resolve({gmail_profile: gmail_profile, userMailAccount: result, mail_existed : true});
                    }else{
                        if(result.provider == enums.Provider.gmail){
                            return resolve({gmail_profile: gmail_profile, userMailAccount: result});
                        }else{
                            return resolve({gmail_profile: gmail_profile, userMailAccount: result, mail_existed : true});
                        }
                    }
                    
                }else{
                    //not exist or same ed_user_id
                    return resolve({gmail_profile: gmail_profile, userMailAccount: result});
                }
            });
        });
    }).then(function(gmail_profile) {  //check redis exist
        return new Promise(function(resolve, reject) {
            redis.getWithDb(cachedDb, `gmail_${idOwner}_${gmail_profile.gmail_profile.email_address}`, (err_redis, result_redis) =>{
                if(err_redis){
                    return reject(err_redis);
                }
                gmail_profile.redis_cache = result_redis;
                return resolve(gmail_profile);
            });
        });
    }).then(function(data) {
        return new Promise(function(resolve, reject) {
            var userMailAccount = null;
            if(data.mail_existed){
                //stop notify
                if(data.userMailAccount.provider == enums.Provider.gmail){
                    gmail_res.stop_notification(data.gmail_profile.email_address, function(err, result){
                        if(err){
                            markAsInvalidToken(data.userMailAccount, function(err, result){});
                            console.error(err, 'user_settings.gmail.stop_notification_fail');
                        }
                    });
                }
                responseHtml(res, JSON.stringify({err: 'user_settings.gmail.gmail_existed'}));
                return;
            }else{
                var is_update = false;
                if(data.userMailAccount){
                    //update token
                    userMailAccount = data.userMailAccount;
                    userMailAccount.provider_data = provider.setGmail(data.gmail_profile);
                    userMailAccount.name = data.gmail_profile.display_name || _.split(data.gmail_profile.email_address, '@', 1)[0];
                    is_update = true;
                }else{
                    //create UserMailAccount
                    var userMailAccount = new UserMailAccount({
                        ed_user_id: idOwner,
                        provider: enums.Provider.gmail,
                        provider_data: provider.setGmail(data.gmail_profile),
                        mail: data.gmail_profile.email_address,
                        name: data.gmail_profile.display_name || _.split(data.gmail_profile.email_address, '@', 1)[0],
                        is_verified: true,
                        is_default: false,
                        verified_date: +moment.utc(),
                        is_valid_spf: true
                    });
                }
                
                if(data.redis_cache && parseInt(data.redis_cache.watch_expired_date) > +moment.utc() + 10*1000 ){ //10s 
                    userMailAccount.provider_data.watch_start_historyId = parseInt(data.redis_cache.watch_start_historyId);
                    userMailAccount.provider_data.watch_expired_date = data.redis_cache.watch_expired_date;
                }

                userMailAccount.save((err) => {
                    if (err) {
                        console.error(err, 'save userMailAccount fail');
                        return reject({err: 'user_settings.gmail.userMailAccount_fail'});
                    }
                    if(!is_update){
                        var current_no = (req.user.settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails.current_no;
                        emitter.emit('evt.user.setting.update.max_support', {
                            idOwner: idOwner,
                            current_max_support: current_no + 1,
                            callback: function(err, result){
                                if(err){
                                    console.error(err,'user.current_max_support.update_fail');
                                    return;
                                }
                                var update = {channels:{emails:{current_no: current_no +1}}};
                                req.user.settings.features = req.user.settings.features || {};
                                req.user.settings.features = _.assign(req.user.settings.features, update);
                            }
                        });
                    }
                    responseHtml(res, JSON.stringify({mail: userMailAccount.mail}));
                    return;
                });   
            }
        });
        
    }, function(reason) {
        responseHtml(res, JSON.stringify({reason}));
        return;
    }); 
};

//stop notifications from google mail
exports.stop_notification = (req, res, next) => {
    var ownerId = utils.getParentUserId(req.user),
        query = {
            mail : req.body.emailAddress,
            ed_user_id : ownerId,
            provider: enums.Provider.gmail
        };
    
    utils.findByQuery(UserMailAccount, query).exec((err, mailAccounts) =>{
        if(err){
            return next(err);
        }
        
        if(!mailAccounts || !mailAccounts.length){
            return next(new TypeError('user.gmail.account.not_found'));
        }
        
        var gmailAccount = mailAccounts[0];
        
        if(gmailAccount.is_default){
            return next(new TypeError('user.gmail.account.cant_not_stop.is_default'));
        }
        
        gmail_res.stop_notification(gmailAccount.email_address, function(err, result){
            if(err){
                markAsInvalidToken(gmailAccount, function(err, result){});
				console.error(err,`log_err_stop_notification_gmail: ${gmailAccount}`);
				return;
                //return next(err);
            }
        });
		
        var provider_data = gmailAccount.provider_data;
        
		gmailAccount.remove(function (err) {
			if (err) {
				return next(err);
			}
			var current_no = (req.user.settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails.current_no;
			emitter.emit('evt.user.setting.update.max_support', {
				idOwner: idOwner,
				current_max_support: current_no == 0 ? 0 : (current_no - 1),
				callback: function(err, result){
					if(err){
						console.error(err,'user.current_max_support.update_fail');
						return;
					}
					var update = {channels:{emails:{current_no: current_no == 0 ? 0 : (current_no - 1)}}};
					req.user.settings.features = req.user.settings.features || {};
					req.user.settings.features = _.assign(req.user.settings.features, update);
				}
			});
            if(parseInt(provider_data.watch_expired_date) > +moment.utc()){
                emitter.emit('evt.mail.gmail.cache_redis', {
                    key: `gmail_${ownerId}_${gmailAccount.email_address}`,
                    data: provider_data
                });
            }
			res.json({is_succes: true});
		});
    });
};

//update gmail's name
exports.update = (req, res, next) => {
     var ownerId = utils.getParentUserId(req.user),
         body = req.body;
    
    UserMailAccount.findOne({
        mail: body.email
    }, (err, result) => {
        
        if(err){
            console.error(err,'user.gmail.account.not_found');
            return next(err);
        }
        
        if(!result || result.provider != enums.Provider.gmail || !_.isEqual(result.ed_user_id, ownerId)){
            console.error(err,'user.gmail.account.invalid');
            return;
        }

        result.name = body.display_name;
        
        result.save((err) => {
            if (err) {
                return next(err);
            }
            
            res.json({is_succes: true});
        });
    });
};
