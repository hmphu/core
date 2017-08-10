'use strict';
//
// tagCloud.controller.js
// common functions of system
//
// Created by vupl on 2015-12-17.
// Copyright 2015 Fireflyinnov. All rights reserved.
//
/**
 * Module dependencies.
 */
 var _ = require('lodash'),
     path = require('path'),
    mongoose = require('mongoose'),
    TagCloud = mongoose.model('TagCloud'),
    Utils = require('../resources/utils'),
    config = require(path.resolve('./config/config')),
    enums = require('../resources/enums.res');

var count = (type, idOwner, callback)=>{
    TagCloud.count({tag_cloud_type: type, ed_user_id: idOwner }, callback);
}

 exports.add = (req, res, next) =>{
     var idOwner = Utils.getParentUserId(req.user || {});
     
     var tags = req.body.tags || [];
     var type  = enums.TagCloud[_.capitalize(req.params.type)];
     var results = [];
     var tasks = [];
     _.forEach(tags, tag=>{
         var task = new Promise((resolve, reject)=>{
             if(_.isEmpty(tag)){
                 return resolve();
             }
             TagCloud.findOne({ed_user_id: idOwner, name: tag,tag_cloud_type: type}, (err, tagCloud) =>{
                if(err){
                     return next(err);
                }

                if(tagCloud){
                    return resolve();
                }

                // create new tagCloud
                var tagCloud = new TagCloud();
                tagCloud.ed_user_id = idOwner;
                tagCloud.name = tag;
                tagCloud.tag_cloud_type = type;

                // save tag
                tagCloud.save((err) =>{
                    if(err){
                        return next(err);
                    }
                    results.push(tagCloud);
                    resolve();
                });
            });
         });
         tasks.push(task);
     });
     
     Promise.all(tasks).then(result=>{
         res.json(results);
     }).catch(ex=>{
         return next(new TypeError('tag_cloud.save_failure'));
     });
 };

/**
 * get list tag
 * 
 * @author : dientn
 */
exports.list = (req, res, next) => {
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            tag_cloud_type: enums.TagCloud[_.capitalize(req.params.type)]
        },
        sort: "add_time",
        skip: req.query.skip,
        sort_order: req.query.sort_order || -1,
        limit: req.query.limit || config.paging.limit
    };
    if(req.query.name){
        params.query.name = new RegExp(decodeURI(req.query.name.replace(/(\W|\D])/g, "\\$1")), "i");
    }
    
    Utils.findByQuery(TagCloud, params).exec(function (err, tags) {

        if (err) {
            return next(err);
        }
        res.json(tags);
    });
};

/**
 * get tag
 * 
 * @author : dientn
 */
exports.get = (req, res, next) => {
    res.json(req.tagCloud);
};

/**
 * remove tag
 * 
 * @author : dientn
 */
exports.remove = (req, res, next) =>{
    var tag = req.tagCloud;
    tag.remove(err=>{
        if(err){
            return next(err);
        }
        
        res.json({message: 'tag_cloud.delete_success'});
    });
};

exports.count = (req, res, next)=>{
    var idOwner = Utils.getParentUserId(req.user || {});
    var tasks = [];
    var countTicket = new Promise((resolve, reject)=>{
        count(enums.TagCloud.Ticket, idOwner, (err, count)=>{
            if(err){
                console.error(err);
            }
            resolve(count || 0);
        });
    });
    tasks.push(countTicket);
    var countUser = new Promise((resolve, reject)=>{
        count(enums.TagCloud.User, idOwner, (err, count)=>{
            if(err){
                console.error(err);
            }
            resolve(count || 0);
        });
    });
    tasks.push(countUser);
    
    var countOrg = new Promise((resolve, reject)=>{
        count(enums.TagCloud.Org, idOwner, (err, count)=>{
            if(err){
                console.error(err);
            }
            resolve(count || 0);
        });
    });
    tasks.push(countOrg);
    
    Promise.all(tasks).then(results=>{
        var counter = {
            ticket: results[0],
            user: results[1],
            org: results[2]
        };
        res.json(counter);
    }).catch(ex=>{
        console.log(ex);
        return next(err);
    });
}
/**
 * get tag by name
 * 
 * @author : dientn
 */
exports.getTagById = (req, res, next, id) =>{

    var idOwner = Utils.getParentUserId(req.user);
    // find tag cloud by its name
    TagCloud.findOne({_id : id}).exec((err, tagCloud) => {
        if (err){
            return next(err);
        }
        if (!tagCloud || !_.isEqual(idOwner, tagCloud.ed_user_id)) {
            return next(new TypeError('tag_cloud.tag_notfound'));
        }
        req.tagCloud = tagCloud;
        next();
    });
};