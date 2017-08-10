'use strict';
//
//  fb.controller.js
//  handle fb logic
//
//  Created by thanhdh on 2016-02-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose  = require('mongoose'),
    path = require('path'),
    moment = require('moment'),
    enumsTicket = require('../../ticket/resources/enums'),
    enums = require('../resources/enums'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    UserFbPage = mongoose.model('UserFbPage'),
    UserFbAccount = mongoose.model('UserFbAccount'),
    UserContactController = require('../../people/controllers/people.user.contact.controller'),
    FBCore = require('../../core/resources/fb'),
    Fb = mongoose.model('Fb'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    cache = require(path.resolve('./config/lib/redis.cache')),
    elastics = require('../resources/elastics'),
    redis = require(path.resolve('./config/lib/redis'));
/**
 *
 * author : thanhdh
 */
exports.add = (data, next) =>{
    // find user by its id
    Fb.findOneAndUpdate({
        fb_id: data.fb_id,
        page_id: data.page_id
    },{
         "$set": Object.assign({}, data, {upd_time: +moment.utc()})
    },{
        upsert: true,
        new: true
    }, (err, result) =>{
        if(err){
            return next(err);
        }
        return next(null, result);
    })
};

/**
 *
 * author : thanhdh
 */
exports.delete = (id, next) => {
    Fb.remove({fb_id: id}, err => {
        if (err) {
            return next(err);
        }
        next(null, id);
    });
};

/**
 * update facebook
 * author : vupl
 */
exports.update = (data, ticket, next) => {
    Fb.update({
        ed_user_id: data.ed_user_id,
        _id: data._id
        },{
            ticket_id: ticket._id,
            ticket_comment_id: ticket.comment._id
        },(err, result) =>{
            if(err){
                console.error(err, "Error failed update ticket comment");
                return next(err);
            }
            return next(null, result);
    });
};

/**
 * update facebook
 * author : edit
 */
exports.edit = (data, next) => {
    if(data.operator == 'like'){

    }
    Fb.findById({_id: data._id},(err, comment) =>{
        if(err){
            console.error(err, "Error failed find fb comment by id");
            return next(err);
        }

        if(data.update.provider_data){
            _.assign(comment.provider_data, data.update.provider_data);
            delete data.update.provider_data;
        }
        _.assign(comment, data.update);
        comment.save(errSave=>{
            if(errSave){
                console.error(errSave, "Error failed update fb comment by id");
            }
            return next(errSave, comment);
        });
    });
};


/**
 * author: vupl
 * reset ticket id and ticket commnet id facebook
 */
exports.resetFacebookTicketId = (data) =>{
    if(data.provider == enumsTicket.Provider.fbComment){
        Fb.update({
            ed_user_id: data.ed_user_id,
            page_id: data.provider_data.page_id,
            ticket_id: data._id
        },{
            $unset: {
                ticket_id: 1,
                ticket_comment_id: 1
            }
        },{
            multi: true
        },(err, result) =>{
            if(err){
                console.error(err, "fb core: remove ticket id in facebook");
                return;
            }
            return;
        });
    } else if(data.provider == enumsTicket.Provider.fbMessage){
        Fb.update({
            ed_user_id: data.ed_user_id,
            page_id: data.provider_data.page_id,
            'provider_data.thread_id': data.provider_data.thread_id
        },{
            $unset: {
                ticket_id: 1,
                ticket_comment_id: 1
            }
        },{
            multi: true
        },(err, result) =>{
            if(err){
                console.error(err, "fb core: remove ticket id in facebook");
                return;
            }
            return;
        });
    }
    emitter.emit('evt.ticket.removeProivderDataId', data);
    emitter.emit('evt.ticket_comment.updateTicketCommentClosed', data);
};

exports.getFacebookName = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    if(req.params.is_page == '1'){
        var query = {
            ed_user_id: idOwner,
            page_id: req.params.id
        }
        redis.get(`name_fb_page_${req.params.id}`, (err_redis, result_redis) =>{
            if(err_redis){
                console.error(err_redis, `Failed to get name facebook ${req.params.id}`);
            }
            if(result_redis){
                res.json(result_redis);
                return;
            }
            cache.findOneWithCache(`fb_pages`, req.params.id, UserFbPage, query, (err_cache, result_cache) =>{
                if(err_cache){
                    console.error(err_cache, "Failed to get access token facebook page");
                    return next(err_cache);
                }
                if(!result_cache){
                    res.json(null);
                    return;
                }
                FBCore.fetch(result_cache.access_token, `${req.params.id}`, (err, result) =>{
                    if(err){
                        console.error(err, `Fetch facebook name ${req.params.id}`);
                        redis.set(`name_fb_page_${req.params.id}`, {id: result_cache.page_id, name: result_cache.name}, (err_set, result_set) =>{
                            if(err_set){
                                console.error(err_set, `Failed to set name facebook page ${req.params.id}`);
                                res.json({
                                    name: result_cache.name,
                                    id: result_cache.page_id
                                });
                                return;
                            }
                            redis.expire(`name_fb_page_${req.params.id}`, 24*60*60, (err_expire, result_expire) =>{
                                if(err_expire){
                                    console.error(err_set, `Failed to set expire name facebook page ${req.params.id}`);
                                    res.json({
                                        name: result_cache.name,
                                        id: result_cache.page_id
                                    });
                                    return;
                                }
                                res.json({
                                    name: result_cache.name,
                                    id: result_cache.page_id
                                });
                                return;
                            });
                        });
                    } else {
                        redis.set(`name_fb_page_${req.params.id}`, result, (err_set, result_set) =>{
                            if(err_set){
                                console.error(err_set, `Failed to set name facebook page ${req.params.id}`);
                                res.json(result);
                                return;
                            }
                            redis.expire(`name_fb_page_${req.params.id}`, 24*60*60, (err_expire, result_expire) =>{
                                if(err_expire){
                                    console.error(err_set, `Failed to set expire name facebook page ${req.params.id}`);
                                    res.json(result);
                                    return;
                                }
                                res.json(result);
                                return;
                            })
                        });
                    }
                });
            });
        });
    } else {
        var query = {
            ed_user_id: idOwner,
            fb_id: req.params.id
        }
        redis.get(`name_fb_account_${req.params.id}`, (err_redis, result_redis) =>{
            if(err_redis){
                console.error(err_redis, `Failed to get name facebook account ${req.params.id}`);
            }
            if(result_redis){
                res.json(result_redis);
                return;
            }
            cache.findOneWithCache(`fb_account_${idOwner}`, req.params.id, UserFbAccount, query, (err_cache, result_cache) =>{
                if(err_cache){
                    console.error(err_cache, "Failed to get access token facebook account");
                    return next(err_cache);
                }
                if(!result_cache){
                    res.json(null);
                    return;
                }
                FBCore.fetch(result_cache.access_token, `${req.params.id}`, (err, result) =>{
                    if(err){
                        console.error(err, `Fetch facebook name ${req.params.id}`);
                        redis.set(`name_fb_account_${req.params.id}`, {id: result_cache.fb_id, name: result_cache.name}, (err_set, result_set) =>{
                            if(err_set){
                                console.error(err_set, `Failed to set name facebook account ${req.params.id}`);
                                res.json({
                                    name: result_cache.name,
                                    id: result_cache.fb_id
                                });
                                return;
                            }
                            redis.expire(`name_fb_account_${req.params.id}`, 24*60*60, (err_expire, result_expire) =>{
                                if(err_expire){
                                    console.error(err_set, `Failed to set expire name facebook account ${req.params.id}`);
                                    res.json({
                                        name: result_cache.name,
                                        id: result_cache.fb_id
                                    });
                                    return;
                                }
                                res.json({
                                    name: result_cache.name,
                                    id: result_cache.fb_id
                                });
                                return;
                            });
                        });
                    } else {
                        redis.set(`name_fb_account_${req.params.id}`, result, (err_set, result_set) =>{
                            if(err_set){
                                console.error(err_set, `Failed to set name facebook account ${req.params.id}`);
                                res.json(result);
                                return;
                            }
                            redis.expire(`name_fb_account_${req.params.id}`, 24*60*60, (err_expire, result_expire) =>{
                                if(err_expire){
                                    console.error(err_set, `Failed to set expire name facebook account ${req.params.id}`);
                                    res.json(result);
                                    return;
                                }
                                res.json(result);
                                return;
                            })
                        });
                    }
                });
            });
        });
    }
}

exports.getOriginalPost = (req, res, next) =>{
    var ownerId = utils.getParentUserId(req.user);
    var post_id = req.params.post_id;
    elastics.getPost(ownerId, post_id, (err, result)=>{
        if(err){
            return next(err);
        }
        var res_data = (!result || !result.found) ? {} : result._source.data;
        res.json(res_data);
    });
}

exports.getUserNameFacebook = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user),
        user_id = (req.params.user_id || req.params.user_id !== 'undefined') ? req.params.user_id : null,
        params = {
            query: {
                ed_user_id: idOwner,
                type: 3,
                user_id: (user_id !== undefined || user_id !== 'undefined') ? user_id : null
            }

        };
    UserContactController.findOneByQuery(params, (err, result) =>{
        if(err){
            console.error(err, "find user contact failed");
            return next(err);
        }
        if(!result){
            return res.json({});
        }
        redis.get(`name_fb_account_${result.value}`, (err_redis, result_redis) =>{
            if(err_redis){
                console.error(err_redis, `Failed to get name facebook account ${req.params.id}`);
            }
            if(result_redis){
                res.json(result_redis);
                return;
            }
            FBCore.getAccessTokenApp(result.value, (err_get_name, result_get_name) =>{
                if(err_get_name){
//                    console.error(err_get_name, "failed get name facebook");
                    return res.json({});
                }
                redis.set(`name_fb_account_${result.value}`, result_get_name, (err_set, result_set) =>{
                    if(err_set){
                        console.error(err_set, `Failed to set name facebook account ${result.value}`);
                        res.json(result_get_name);
                        return;
                    }
                    redis.expire(`name_fb_account_${result.value}`, 30*24*60*60, (err_expire, result_expire) =>{
                        if(err_expire){
                            console.error(err_set, `Failed to set expire name facebook account ${result.value}`);
                            res.json(result_get_name);
                            return;
                        }
                        res.json(result_get_name);
                        return;
                    });
                });
            });
        });
    });
}
