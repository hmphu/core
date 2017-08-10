'use strict';
//
// app.controller.js
// handle apps data
//
// Created by dientn on 2016-02-02.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var fs = require('fs');
var fs_extra = require('fs-extra');
var swig = require("swig");
var path = require("path");
var moment = require('moment');
var querystring = require("querystring");
var utils = require('../../core/resources/utils');
var http = require("../../core/resources/http");
var mongoose = require('mongoose');
var Application = mongoose.model("AppUser");
var datetime = require('../../core/resources/datetime');
var enums = require('../resources/enums.res');
var maxAge = 60 * 60 * 24 * 30;


// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

/*
 * @author: dientn parse place holder with format: #param.{xxx}# or
 * #data.{xxxx}# from request params
 */
var parsePlaceHolders = (src_obj, parameters, tpl_data) =>{
    // do noting if there is empty object
    if (!src_obj) {
        return;
    }
    var src_obj_keys = Object.keys(src_obj);

    for (var i = 0; i < src_obj_keys.length; ++i) {
        // parse request options key and value
        var src_obj_key = src_obj_keys[i];
        var src_obj_value = src_obj[src_obj_key];
        if (typeof src_obj_value != "string") {
            continue;
        }

        // fill value from key for parameters in manifest
        parameters.forEach( (param) =>{
            var search_key = "#param." + param.name + "#";
            var value = param.value;
            if (src_obj_value.indexOf(search_key) != -1) {
                if (param.encode) {
                    value = new Buffer(value).toString(param.encode);
                }
                src_obj_value = src_obj_value.replace(search_key, value);
                src_obj[src_obj_key] = src_obj_value;
            }
        });

        // fill value from key for template data in manifest
        var tpl_data = tpl_data || {};
        var tpl_data_keys = Object.keys(tpl_data);
        tpl_data_keys.forEach((key) =>{
            var tpl_data_value = tpl_data[key];
            var search_key = "#data." + key + "#";
            if (src_obj_value.indexOf(search_key) != -1) {
                src_obj_value = src_obj_value.replace(search_key, tpl_data_value);
                src_obj[src_obj_key] = src_obj_value;
            }
        });
    }
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * @author: dientn parse app content
 */
exports.getAppContent = [
    // validate app
    (req, res, next) =>{
        var app = req.app;
        var idOwner = utils.getParentUserId(req.user);
        // check permission
//        if(req.user.roles[0] != 'owner'){
            if(_.isArray(app.permissions) && app.permissions.length >0 && _.indexOf(app.permissions, req.user.roles[0]) == -1 ){
                return next(new TypeError('common.users.notgranted'));
            }
//        }
        
        if( !app.is_enabled || !_.isEqual(app.ed_user_id, idOwner) ){
            return next( new TypeError("manage_app.invalid_app") );
        }
        next();
    },
    (req, res, next) =>{
        var app = req.app;
        var app_id = app._id;
        var idOwner = utils.getParentUserId(req.user); 
        var app_path = `assets/uploads/${idOwner}/apps/${app_id}/`;
        
        var success = (results) =>{
            var manifest = results[0],
                app_js = results[1],
                app_css = results[2],
                languages = results[3],
                layout = results[4],
                js_layout = results[5],
                locale = req.user.language || manifest.defaultLocale || 'en',
                language_data = languages[locale],
                template_data = manifest.templateData || {},
                parameters_data = {},
                parameters = manifest.parameters || [];
            
            for (var i = 0; i < parameters.length; ++i) {
                var param = parameters[i];
                // skip loading this param to client
                if (param.is_only_server) {
                    continue;
                }
                var name = param['name'];
                var value = param['value'] || param['default'] || '';
                parameters_data[name] = value;
            }
            
            var data = {
                lng: language_data,
                tpl_data: template_data,
                name: app.app_name,
                id: app_id,
//                logged_in_info: {
//                    date_format : datetime.getDatePattern( req.user.language ),
//                    time_format : datetime.getTimePattern( req.user.time_format ),
//                    date_time_format: `${datetime.getDatePattern( req.user.language )} ${datetime.getTimePattern( req.user.time_format )}`
//                }
            };
            
            // set template to vairable to render
            js_layout = js_layout.replace(/(\r\n|\n|\r)/gm, "");
            var matches = js_layout.match(/<script.*?id="(.*?)".*?>(.*?)<\/script>/gm);
            var templates = {};
            if (matches && Array.isArray(matches)) {
                matches.forEach(template=>{
                    var found= template.match(/<script.*?id="(.*?)"/i);
                    if(found[1]){
                        templates[found[1]] = template.replace(/<script(.*?)id="(.*?)"(.*?)>(.*?)<\/script>/g, '<template$1$3>$4</template>');
                    }
                });
                data.templates = templates;
            }
            // render final layout string
            var app_layout = swig.render( layout, {
                locals: data
            });
            
            res.json({
                app_name: app.app_name,
                app_id: app_id,
                layout: app_layout,
                js_layout: js_layout,
                app_js: app_js,
                app_css: app_css,
                app_params: parameters_data,
                app_data: data,
                params_url: req.query
            });
        };
        var error = (reason) =>{
            console.log("read app data error", JSON.stringify( reason ));
            return next(new TypeError("manage_app.load_app_fail"));
        };
        
        var getManifest = new Promise( (resolve, reject) =>{
                var manifest = path.join(app_path, 'manifest.json');

                delete require.cache[ manifest ];// remove cache
                fs_extra.readJson( manifest , (err, manifestObj) =>{
                    if(err){
                        console.error(err);
                        return reject();
                    }
                    resolve(manifestObj);
                });
            }),
            getAppJs = new Promise( ( resolve, reject ) =>{
                fs_extra.readFile(app_path + 'app.js', 'utf8', (error, data) =>{
                    if (error) {
                        console.error(error);
                        return reject();
                    }
                    
                    resolve( data );
                });
            }),
            getAppCss = new Promise( ( resolve, reject ) =>{
                fs_extra.readFile(app_path + 'app.css', 'utf8', (error, data) =>{
                    if (error) {
                        console.error( error );
                        return reject();
                    }
                    
                    data = data.replace(/(\r\n|\n|\r)/gm, "");
                    var matches = data.match(/(.*?){(.*?)}/gm);
                    
                    if ( !matches || !Array.isArray(matches)) {
                        return resolve();
                    }
                    
                    // append #{app_name to first css selector}
                    var formatted_css = matches.reduce(function (previousValue, currentValue, index, array) {
                        if (index == 1) {
                            previousValue = `#iziApp${app_id} ${previousValue}`;
                        }
                        return `${previousValue}\n#iziApp${app_id} ${currentValue}`;
                    });
                    
                    resolve( formatted_css );
                });
            }),
            getLanguage = new Promise( ( resolve, reject ) =>{
                var language = path.join( app_path , 'language.json');
                
                delete require.cache[ language ];// remove cache
                fs_extra.readJson( language , (err, languageObj) =>{
                    if(err){
                        console.error(err);
                        return reject();
                    }
                    
                    resolve(languageObj);
                });
            }),
            getLayout = new Promise( ( resolve, reject ) =>{
                var layout = path.join( app_path , 'templates/layout.html');
                
                fs_extra.readFile(layout, 'utf8', (err, data) =>{
                    if(err){
                        console.error( err );
                        return reject();
                    }
                    
                    resolve( data );
                });
            }),
            getJsLayout = new Promise( ( resolve, reject ) =>{
//                var jslayout = path.join( app_path , 'templates/js_layout.html');
                var tmplPath = path.join( app_path , 'templates/');
                var template = '';
                var read_files = [];
                fs_extra.walk(tmplPath)
                    .on('data', function (item) {
                    if(item.stats.isFile() && item.path.indexOf('templates/layout.html') == -1){
                        read_files.push(new Promise((resolve)=>{
                            fs.readFile(item.path, 'utf8', function (err, data) {
                                template  += data;
                                resolve();
                            })
                        }));
                    }
                }).on('end', ()=> {
                    Promise.all(read_files).then(result=>{
                        return resolve( template );
                    }).catch(ex=>{
                        return resolve( template );
                    });
                });
            });
        
        Promise.all([
            getManifest,
            getAppJs,
            getAppCss,
            getLanguage,
            getLayout,
            getJsLayout
        ]).then( success )
        .catch( error );
    }
];

/*
 * @author: dientn Allow remote ajax from apps to avoid CORS
 */
exports.load_ajax_content = (req, res, next) =>{
    // get data
    var post_data = req.body.post_data || {};
    var request_opts = req.body.request_opts || {};
    var is_https = (req.body.is_https == "true") ? true : false;
    if (!request_opts) {
        return next(new TypeError("manage_app.ajax_opts_required"));
    }

    var app_name = req.params.app_id;
    var parent_id = utils.getParentUserId(req.user);
    var app_path = `assets/uploads/${parent_id}/apps/${app_name}/`;
    var manifest= `${app_path}/manifest.json`;
    fs_extra.readJson( manifest ,(err, manifestObj) =>{
        if(err){
            return next(err);
        }
        
        request_opts.data = post_data;
        request_opts.is_https = is_https;
        
        if(manifestObj.parameters && _.isArray(manifestObj.parameters) && !_.isEmpty(manifestObj.parameters)){
            parsePlaceHolders(request_opts, manifestObj.parameters, manifestObj.templateData);
            parsePlaceHolders(request_opts.headers, manifestObj.parameters, manifestObj.templateData);
            parsePlaceHolders(post_data, manifestObj.parameters, manifestObj.templateData);
        }
        
        // get remote data
        http(request_opts, (error, result) =>{
            res.json( result );
        });
    });
};

/*
 * @author: dientn load assets like images or files from apps
 */
exports.load_assets = (req, res, next) =>{
    var app_id = req.params.app_id;
    var file_name = req.params.file_name;
    var type = req.params.type;
    var parent_id = utils.getParentUserId(req.user);
    var file = `assets/marketplace/${app_id}/assets/${file_name}`;
    
// if(!enums.assetsType[type]){
// return res.sendFile('assets/img/no-img.jpg');
// }
    if(enums.assetsType[type] === 2){
        file = `assets/uploads/${parent_id}/apps/${app_id}/assets/${file_name}`;
    }
    
    res.header('Cache-Control', 'public max-age=' + maxAge);
    res.header('Expires', (new Date(new Date().getTime() + maxAge * 1000)).toUTCString());

    if (fs.existsSync(file)) {
        res.sendFile( path.resolve(file) );
    } else {
        res.sendFile( path.resolve('assets/img/no-img.jpg') );
    }
};

/*
 * @author: dientn load marketplace screenshots images from apps
 */
exports.load_market_screenshots = (req, res, next) =>{
    var app_name = req.params.app_name;
    var file_name = req.params.file_name;
    var file = `assets/marketplace/${app_name}/screenshots/${file_name}`;

    res.header('Cache-Control', 'public max-age=' + maxAge);
    res.header('Expires', (new Date(new Date().getTime() + maxAge * 1000)).toUTCString());

    if (fs.existsSync(file)) {
        res.sendFile( path.resolve(file) );
    } else {
        res.sendFile( path.resolve('assets/img/no-img.jpg') );
    }
};

/*
 * @author: dientn get available apps
 */
exports.getAvailableApps = [
    (req, res, next)=>{
        var location = req.params.location;
        if(!location || !enums.locations[location]){
            return next(new TypeError("manage_app.app_location_notfound"));
        }
        next();
    },
    ( req, res, next ) =>{
        
        var idOwner = utils.getParentUserId(req.user);
        var location = enums.locations[req.params.location];
        
        var query = {
            ed_user_id: idOwner,
            is_enabled: true,
        };
        
        if(location){
            query.locations = { $elemMatch: { $eq: location} };
        }
        var sort = { 
            is_enabled: "desc",
            upd_time: "desc"
        };

        Application.find(query).sort(sort).exec( (err, apps) =>{
            if ( err ) {
                return next( err );
            }
//            if(req.user.roles[0] != 'owner'){
                apps = _.filter(apps, (app)=>{
                    if(_.isEmpty(app.permissions) || ( _.isArray(app.permissions) && app.permissions.length > 0 &&  _.indexOf(app.permissions, req.user.roles[0]) != -1 )){
                        return app;
                    }
                });
//            }
            res.json(apps);
        });
    }
]
