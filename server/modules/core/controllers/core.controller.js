'use strict';
//
//  core.controller.js
//  common functions of system
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var path = require('path'),
    utils = require('../resources/utils'),
    config = require(path.resolve('./config/config')),
    fs = require('fs'),
    _ = require('lodash'),
    mongoose = require('mongoose'),
    Country = mongoose.model("Country"),
    Forum = mongoose.model("Forum"),
    Timezone = mongoose.model("TimeZone");

/**
 * load images from server
 * author : thanhdh
 */
exports.loadImage = (req, res) =>{
    var image   = req.params.image,
        ownerId = utils.getParentUserId(req.user || {}),
        noImg   = path.resolve('./assets/img/no-img.jpg'),
        file    = path.resolve("./assets/img/default.png");

    // if no img path or logged-in user
    if(!image || !ownerId){
        res.sendFile(noImg);
        return;
    }
    if(image != "default.png"){
        file = path.resolve(`./assets/uploads/${ownerId}/${image}`);
    }
    // cache control
    var maxAge = 60 * 60 * 24 * 30;

    res.header('Cache-Control', `public max-age=${maxAge}`);
    res.header('Expires', (new Date(new Date().getTime() + maxAge * 1000)).toUTCString());

    // response file
    if( fs.existsSync( file ) ){
        res.sendFile(file);
    } else {
        res.sendFile(noImg);
    }
};

/**
 * load file from server
 * author : thanhdh
 */
exports.loadFile = (req, res) =>{
    var type   = req.params.type,
        file    = req.params.file,
        ownerId = utils.getParentUserId(req.user || {});

    // if no img path or logged-in user
    if(!type || !ownerId){
        res.status(404).send({});
        return;
    }
    file = path.resolve(`./assets/uploads/${ownerId}/${type}/${file}`);

    // cache control
    var maxAge = 60 * 60 * 24 * 30;

    res.header('Cache-Control', `public max-age=${maxAge}`);
    res.header('Expires', (new Date(new Date().getTime() + maxAge * 1000)).toUTCString());

    // response file
    if( fs.existsSync( file ) ){
        res.sendFile(file);
    } else {
        return res.status(404).send({});
    }
};


/**
 * load file export from server
 * author : khanhpq
 */
exports.loadFileExport = (req, res) =>{
    var file    = req.params.file,
        ownerId = utils.getParentUserId(req.user || {});

    if(!file || !ownerId){
        res.status(404).send({});
        return;
    }
    file = path.resolve(`./assets/export/${ownerId}/${file}`);

    // cache control
    var maxAge = 60 * 60 * 24 * 30;

    res.header('Cache-Control', `public max-age=${maxAge}`);
    res.header('Expires', (new Date(new Date().getTime() + maxAge * 1000)).toUTCString());

    // response file
    if( fs.existsSync( file ) ){
        res.sendFile(file);
    } else {
        return res.status(404).send({});
    }
};


/**
 * get all country
 * author : dientn
 */
exports.getCountries = (req, res, next) =>{
    Country.find((err, countries)=>{
        if(err) return next(err);
        res.json(countries);
    });
};


/**
 * get all forum
 * author : dientn
 */
exports.listForum = (req, res, next) =>{
    var params = {
        query:{
            
        },
        sort: "add_time",
        skip: req.query.skip,
        sort_order: req.query.sort_order || -1,
        limit: req.query.limit || config.paging.limit
    };
    if(req.query.name){
        params.query.domain = new RegExp(decodeURI(req.query.name.replace(/(\W|\D])/g, "\\$1")), "i");
    }
    
    utils.findByQuery(Forum, params)/*Forum.find(params)*/.exec(function (err, forums) {

        if (err) {
            return next(err);
        }
        res.json(forums);
    });
};

/**
 * get forum by domain
 * author : dientn
 */
exports.getForumByDomain = (req, res, next) =>{
    var domain = req.params.domain;
    if(!domain){
        return next(new TypeError('forum.domain.required'));
    }
    
    var query = {domain: domain};
    Forum.findOne(query, (err, forum)=>{
        if(err) return next(err);
        res.json(forum);
    });
};
/**
 * get all country
 * author : dientn
 */
exports.getCountryByCode = (req, res, next) =>{
    var code = req.params.code;
    if(!code){
        return next(new TypeError('country.code.required'));
    }
    
    code = parseInt(code);
    if(isNaN(code)){
        return next(new TypeError('country.code.is_number'));
    }
    var query = {code: code};
    Country.findOne(query, (err, countries)=>{
        if(err) return next(err);
        res.json(countries);
    });
};

/**
 * get all time zone
 * author : dientn
 */
exports.getTimezones = (req, res, next) =>{
    Timezone.find().select("display_text _id").sort('value').exec((err, timezones)=>{
        if(err) return next(err);
        res.json(timezones);
    });
};

/**
 * remove empty field
 * author : dientn
 */
exports.compactBody = (req, res, next) =>{
    if(_.isEmpty(_.keys(req.body))){
        return next();
    }
    
    req.body =  _.reduce(req.body, (result, value, key) =>{
        if(!_.isString(value) || value != ''){
          result[key] = value;
        }
       return result;
    }, {});
    
    next();
};
