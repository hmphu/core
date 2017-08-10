'use strict';
//
// user.branding.controller.js
// handle user branding setting routes
//
// Created by dientn on 2015-12-25.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserBranding = mongoose.model('UserBranding'),
    UserMailAccount = mongoose.model('UserMailAccount'),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    file = require('../../core/resources/file'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    config = require(path.resolve('./config/config')),
    cache = require(path.resolve('./config/lib/redis.cache')),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    validator = require('../validator/user.branding.validator');

/**
 * add a new branding setting author : dientn
 */
exports.add = (idOwner, data, next) => {
    var branding  = new UserBranding(data);
    branding.ed_user_id = idOwner;
    
    tmp_data.save('setting_add_branding', idOwner, branding, branding, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, branding);
    });
};

/**
 * show current branding setting author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.branding', UserBranding, query, (err, brandingSetting) =>{
        if(err){
            return next(err);
        }
        res.json(brandingSetting);
    })
};

/**
 * update the current branding settting by id owner author : dientn
 */
exports.update = [
    (req, res, next)=>{
        if(req.body.is_auto_org){
           req.body.is_auto_org = JSON.parse(req.body.is_auto_org);
        }
        
        if(req.body.keyword_black_list){
           req.body.keyword_black_list = req.body.keyword_black_list.split(',');
        }
        if(req.body.host_mapping == ''){
            delete req.body.host_mapping;
        }
        validator.validateUpdate(req.body, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var brading = req.body;

        delete brading.logo;
        delete brading.favicon;
        delete brading.sub_domain;
        delete brading.__v;
        delete brading.upd_time;

        UserBranding.findOne({ed_user_id: idOwner}, (err, branding) =>{
            if(err){
                return next(err);
            }
            if(!branding){
                return next(new TypeError('user.branding.not_found') );
            }
            
            if(req.files){
                if(req.files.logo){
                    brading.logo =req.files.logo[0].filename;
                }

                if(req.files.favicon){
                    brading.favicon =req.files.favicon[0].filename;
                }
            }
            
            branding = _.assign(branding, brading);
            branding.keyword_black_list = brading.keyword_black_list;
            cache.saveAndUpdateCache(idOwner, 'user.setting.branding', branding, (errSave) =>{
                if(errSave){
                    return next(errSave);
                }
                file.moveFile(idOwner, req.files);
                res.json(branding);
            });
        });
    }
];

/**
 * update the current branding settting by id owner author : dientn
 */
exports.changeSubdomain= [
    (req, res, next)=>{
        req.body.parrent_id = utils.getParentUserId(req.user);
        validator.validateSubdomain(req.body, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var sub_domain = req.body.sub_domain.toLowerCase();
        var old_sub_somain = req.user.sub_domain;
        var lang = req.user.language;
        
        UserBranding.findOne({ed_user_id: idOwner}, (err, branding) =>{
            if(err){
                return next(err);
            }
            if(!branding){
                return next(new TypeError('user.branding.not_found') );
            }
            
            if(_.isEqual(branding.sub_domain, sub_domain)){
                return next(new TypeError('user.branding.current_domain') );
            }
            
            branding.sub_domain = sub_domain;
            cache.saveAndUpdateCache(idOwner, 'user.setting.branding', branding, (errBranding) =>{
                if(errBranding){
                    return next(errBranding);
                }
                var old_support = `support@${old_sub_somain}.${config.izi.domain}`;
                
                // change mail support
                UserMailAccount.findOne({ed_user_id: idOwner, mail: old_support}, (err, mail)=>{
                    if(err || !mail) {
                        console.error(err|| new TypeError(`can not found support mail with subdomain [${branding.sub_domain}]`));
                    }else{
                        mail.mail = `support@${branding.sub_domain}.${config.izi.domain}`;
                        mail.save((err)=>{
                            if(err) console.error(err);
                        });
                    }
                });
                // call emiter
                emitter.emit('evt.user.edit.subdomain', idOwner, req.user.sub_domain, branding.sub_domain, lang);
                // response data
                res.json(branding);
            });
        });
    }
];

exports.resetImage = [(req, res, next)=>{
    var idOwner = utils.getParentUserId(req.user);
    UserBranding.findOne({ed_user_id: idOwner}, (err, branding) =>{
        if(err){
            return next(err);
        }
        if(!branding){
            return next(new TypeError('user.branding.not_found') );
        }
        var type = req.params.type;

        branding[type] = null;
        cache.saveAndUpdateCache(idOwner, 'user.setting.branding', branding, (errSave) =>{
            if(errSave){
                return next(errSave);
            }
            res.json({success: true});
        });
    });
}]
