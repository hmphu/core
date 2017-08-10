'use strict';
//
//  redis.cache.js
//  lib for caching mongoose query data by redis
//
//  Created by dientn on 2016-01-21.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var path = require('path'),
    _ = require('lodash'),
    redis = require(path.resolve('./config/lib/redis'));

/**
 * caching the query data
 * @params:
 *          - modelFind: model.find or model.find
 * author : thanhdh
 */
exports.findWithCache = (hashKey, model, query, next) =>{
    // get data from redis
    redis.hgetall(hashKey, (err, result) =>{
        // if data exists
        if(result){
            return next(null, _.values(result));
        }
        // throw error if any
        if(err){
            console.error(err, `Redis: findWithCache GET - ${hashKey}`);
        }
        var condition = query;
        if(query.query){
            condition = query.query;
        }
        // load data from db if there is no cache
        model.find(condition).sort(query.sort || '').exec((err, result) => {
            if(err){
                return next(err);
            }
            if(!result || result.length == 0){
                return next(null, []);
            }
            var obj = {};
            (result || []).forEach((value)=>{
                obj[value._id.toString()] = value;
            });
            redis.hmset(hashKey, obj, (err) => {
                if(err){
                    console.error(err, `Redis: findWithCache SET - ${hashKey}`);
                }
                return next(null, result);
            });
        });
    });
};

/**
 * caching the query data of facebook
 * @params:
 *          - modelFind: model.find or model.find
 * author : vupl
 */
exports.facebookFindWithCache = (hashKey, model, query, next) =>{
    // get data from redis
    redis.hgetall(hashKey, (err, result) =>{
        // if data exists
        if(result){
            return next(null, _.values(result));
        }
        // throw error if any
        if(err){
            console.error(err, `Redis: findWithCache GET - ${hashKey}`);
        }
        var condition = query;
        if(query.query){
            condition = query.query;
        }
        // load data from db if there is no cache
        model.find(condition).sort(query.sort || '').exec((err, result) => {
            if(err){
                return next(err);
            }
            if(!result || result.length == 0){
                return next(null, []);
            }
            var obj = {};
            (result || []).forEach((value)=>{
                if(value.fb_id){
                    obj[value.fb_id.toString()] = value;
                }else {
                    obj[value.page_id.toString()] = value;
                }
            });
            redis.hmset(hashKey, obj, (err) => {
                if(err){
                    console.error(err, `Redis: findWithCache SET - ${hashKey}`);
                }
                return next(null, result);
            });
        });
    });
};

/**
 * caching the query data
 * @params:
 *          - modelFind: model.findOne or model.find
 * author : thanhdh
 */
exports.findWithFieldkeyCache = (hashKey, fieldKey, model, query, next) =>{
    // get data from redis
    redis.hget(hashKey, fieldKey, (err, result) =>{
        // if data exists
        if(result){
            // recreate mongoose model
            return next(null, result);
        }
        // throw error if any
        if(err){
            console.error(err, `Redis: findWithFieldkeyCache GET - ${hashKey} - ${fieldKey}`);
        }
        model.find(query.query || {}).sort(query.sort || '').exec((err, result) => {
            if(err){
                return next(err);
            }
            redis.hset(hashKey, fieldKey, result, (err) => {
                if(err){
                    console.error(err, `Redis: findWithFieldkeyCache SET - ${hashKey} - ${fieldKey}`);
                }
                return next(null, result);
            });
        });
    });
};

/**
 * caching the query data
 * @params:
 *          - modelFind: model.findOne or model.find
 * author : thanhdh
 */
exports.findOneWithCache = (hashKey, fieldKey, model, query, next) =>{
    // get data from redis
    redis.hget(hashKey, fieldKey, (err, result) =>{
        // if data exists
        if(result){
            // recreate mongoose model
            var _model = new model(result);
            _model.isNew = false;
            return next(null, _model);
        }
        // throw error if any
        if(err){
            console.error(err, `Redis: findOneWithCache GET - ${hashKey} - ${fieldKey}`);
        }
        console.log(query);
        // load data from db if there is no cache
        model.findOne(query, (err, result) => {
            if(err){
                return next(err);
            }
            if(!result){
                return next(null, null);
            }
            redis.hset(hashKey, fieldKey, result, (err) => {
                if(err){
                    console.error(err, `Redis: findOneWithCache SET - ${hashKey} - ${fieldKey}`);
                }
                return next(null, result);
            });
        });
    });
};

/**
 * caching the query data
 * @params:
 *          - modelFind: model.findOne or model.find
 * author : thanhdh
 */
exports.findOneWithMCache = (hashKey, fieldKeys, models, queries, next) =>{
    // get data from redis
    redis.hmget(hashKey, fieldKeys, (err, data) =>{
        // throw error if any
        if(err){
            console.error(err, `Redis: findOneWithMCache GET - ${hashKey} - ${fieldKeys}`);
        }
        var tasks = [];
        fieldKeys.forEach((fieldKey, index) => {
            if(!data[index]){
                tasks.push(new Promise((resolve, reject) => {
                    // load data from db if there is no cache
                    models[index].findOne(queries[index], (err, result) => {
                        if(err){
                            console.error(err);
                            return reject();
                        }
                        redis.hset(hashKey, fieldKeys[index], result, (err) => {
                            if(err){
                                console.error(err, `Redis: findOneWithMCache SET - ${hashKey} - ${fieldKeys[index]}`);
                            }
                            return resolve(result);
                        });
                    });
                }));
            } else {
                tasks.push(new Promise((resolve, reject) => {
                    // recreate mongoose model
                    var model = new models[index](JSON.parse(data[index]));
                    model.isNew = false;
                    return resolve(model);
                }));
            }
        });
        Promise.all(tasks).then(result =>{
            return next(null, result);
        }, reason => {
            return next(new Error('Failed in: findOneWithMCache'));
        });
    });
};

/**
 * save data into DB and update cache
 * author : thanhdh
 */
exports.saveAndUpdateCache = (hashKey, fieldKey, model, next) =>{
    // save data into DB and update cache
    model.save((err, result) => {
        if(err){
            return next(err);
        }
        result['__v'] = undefined;
        redis.hset(hashKey, `${fieldKey}`, result, (err) => {
            if(err){
                console.error(err, `Redis: saveAndUpdateCache SET - ${hashKey} - ${fieldKey}`);
            }
            return next(null, result);
        });
    });
};

/**
 * save data into DB and update cache
 * author : thanhdh
 */
exports.removeDataAndCache = (hashKey, fieldKey, model, cond, next) =>{
    var callback = (err, result) => {
        if(err){
            return next(err);
        }
        redis.hdel(hashKey, `${fieldKey}`, (err) => {
            if(err){
                console.error(err, `Redis: removeDataAndCache SET - ${hashKey} - ${fieldKey}`);
            }
            return next(null, result);
        });
    };
    if(cond){
        // remove data into DB and update cache
        model.remove(cond, callback);
    } else {
        model.remove(callback);
    }
};

/**
 * remove cache
 * author : thanhdh
 */
exports.removeCache = (hashKey, fieldKey, next) =>{
    redis.hdel(hashKey, `${fieldKey}`, (err) => {
        if(err){
            console.error(err, `Redis: removeCache SET - ${hashKey} - ${fieldKey}`);
        }
        return next();
    });
};

/**
 * remove cache
 * author : thanhdh
 */
exports.removeHashKeyCache = (hashKey, next) =>{
    redis.del(hashKey, (err) => {
        if(err){
            console.error(err, `Redis: removeHashKeyCache SET - ${hashKey}`);
        }
        return next();
    });
};

/**
 * mass update data in DB and delete all caches
 * author : thanhdh
 */
exports.massUpdateAndDeleteAllCache = (hashKey, model, cond, data, options, next) => {
    model.update(cond, data, options, err => {
        if (err){
            return next(err);
        }
        redis.del(hashKey, (err) => {
            if(err){
                console.error(err, `Redis: massUpdateAndDeleteAllCache SET - ${hashKey}`);
            }
            return next();
        });
    });
};
