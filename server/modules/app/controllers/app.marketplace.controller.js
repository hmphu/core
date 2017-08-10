'use strict';
//
// app.marketplace.controller.js
// handle marketplace app data
//
// Created by dientn on 2016-02-02.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    enums = require('../resources/enums.res'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    utils = require(path.resolve('./modules/core/resources/utils')),
    fs = require( "fs" ),
    fs_extra = require('fs-extra'),
    util = require( "util" ),
    moment = require( "moment" ),
    marked = require('marked'),
    _ = require("lodash"),
    validate = require('../validator/app.marketplace.validator'),
    MarketCate = mongoose.model("AppMarketCate"),
    AppMarket = mongoose.model("AppMarket"),
    AppUser = mongoose.model("AppUser");

/*
 * @author: dientn get all category
 */
exports.getCategories = ( req, res, next ) => {
    var getApp = new Promise((resolve, reject)=>{
        AppMarket.find({market_cate_id: {$exists: true}}).exec((err, results)=>{
            if(err){
                console.error(err);
                return reject("manage_app.app_market_notfound");
            }
            resolve(results);
        });
    });
    
    var getCate = new Promise((resolve, reject)=>{
        MarketCate.find().exec((err, results) =>{
            if( err ){
                console.error(err);
                return reject("manage_app.category_notfound");
            }
            resolve(results);
        });
    });
    
    var success = ( results )=>{
        var apps = results[0];
        var cates = results[1];
        
        var categories = cates.map((item) =>{
            for (var i in item.info) {
                if (item.info[i].lang == req.user.language) {
                    var category_id = item._id;
                    var init = 0;
                    var count = _.reduce(apps, (init, app) =>{
                        if(_.isEqual(app.market_cate_id, category_id)){
                            init++;
                        }
                        return init;
                    }, 0);
                    
                    return {
                        id: category_id,
                        name: item.info[i].name ? item.info[i].name : "",
                        desc: item.info[i].desc || "",
                        total_app: count
                    };
                }
            }
        })
        res.json( categories );
    };
    var error = ( reason )=>{
        return next(new TypeError(reason));  
    };
    
    Promise.all([
        getApp,
        getCate
    ]).then(success).catch(error);
};

/*
 * @author: dientn get featured market app
 */
exports.getFeaturedApp = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    
    var params = {
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit,
        query: {
            is_featured: true
        }
    };
    
    utils.findByQuery(AppMarket, params).populate({path: "market_cate_id"}).exec(function (err, apps) {
        if (err) {
            return next(err);
        }
        var result = apps.map(app=>{
            var info  = _.filter(app.info, o=>{
                return  o.lang == req.user.lang;
            })[0];
            info = info || app.info[0];
            var a = Object.assign({},app._doc);
            
            a.title = info.title;
            a.desc = info.desc;
            a.price = info.price;
            a.category = a.market_cate_id;
            delete a.info;
            delete a.market_cate_id;
            return a;
        });
        res.json(result);
    });
};

/*
 * @author: dientn get all market app
 */
exports.getAllApp = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    
    var params = {
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit
    };
    
    utils.findByQuery(AppMarket, params).populate({path: "market_cate_id"}).exec(function (err, apps) {
        if (err) {
            return next(err);
        }
        var result = apps.map(app=>{
            var info  = _.filter(app.info, o=>{
                return  o.lang == req.user.lang;
            })[0];
            info = info || app.info[0];
            var a = Object.assign({},app._doc);
            
            a.title = info.title;
            a.desc = info.desc;
            a.price = info.price;
            a.category = a.market_cate_id;
            delete a.info;
            delete a.market_cate_id;
            return a;
        });
        res.json(result);
    });
};

/*
 * @author: dientn get all market app
 */
exports.getRecommendApp = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    
    var params = {
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit,
        query: {
            is_recommend: true
        }
    };
    
    utils.findByQuery(AppMarket, params).populate({path: "market_cate_id"}).exec(function (err, apps) {
        if (err) {
            return next(err);
        }
        var result = apps.map(app=>{
            var info  = _.filter(app.info, o=>{
                return  o.lang == req.user.lang;
            })[0];
            info = info || app.info[0];
            var a = Object.assign({},app._doc);
            
            a.title = info.title;
            a.desc = info.desc;
            a.price = info.price;
            a.category = a.market_cate_id;
            delete a.info;
            delete a.market_cate_id;
            return a;
        });
        res.json(result);
    });
};

/*
 * @author: dientn get detail market app
 */
exports.detail = (req, res, next) =>{

    var idOwner = utils.getParentUserId(req.user),
        locale = req.user.language || "en",
        app = req.marketApp,
        app_name = app.name,
        path_app_global = `assets/marketplace/${app_name}`,
        path_file_readme = `${path_app_global}/intro_${locale}.md`,
        path_file_manifest = path_app_global + '/manifest.json';
    
    // async function
    var getManifest = new Promise((resolve, reject)=>{
        fs_extra.readJson(path_file_manifest, (err, packageObj) =>{
            if ( err ) {
                console.error( err );
                return reject();
            }

            resolve( packageObj );
        });
    });
    var getContentHtml = new Promise( ( resolve, reject )=>{
        fs_extra.readFile(path_file_readme, 'utf8', (err, data) =>{
            if (err) {
                console.error(err);
                return reject();
            } 

            marked.setOptions({
                renderer: new marked.Renderer(),
                gfm: true,
                tables: true,
                breaks: false,
                smartLists: true,
                smartypants: false,
                xhtml: true
            });

            marked(data, (err, content) =>{
                if (err) {
                    console.error(err);
                    return reject();
                }

                resolve( content );
            });

        });
    });
    var isInstalled = new Promise( ( resolve, reject ) =>{
        AppUser.findOne({ed_user_id: idOwner, market_id: app._id}, (err, result) =>{
            if ( err ) {
                console.error( err);
                return reject();
            }

            resolve( result);
        });
    });
    
    // callback function
    var success = ( results )=>{
        var manifest = results[0],
            content_html = results[1],
            app_installed = results[2],
            app_detail = {};
        
       
        var info = (app.info.filter((lang)=>{
            return lang.lang == locale;
        })[0] || app.info[0]);

        app_detail = {
            id: app._id,
            name: app.name,
            title: info.title,
            desc: info.desc,
            price: info.price
        };
        delete manifest.prameters;
// var price_info = null, vn_price_info = null;
// if (manifest && manifest.is_paid == true && Array(manifest.prices)) {
// for (var i in app_info.manifest.prices) {
// if (locale == manifest.prices[i].locale) {
// price_info = manifest.prices[i];
// }
//
// if (manifest.prices[i].locale == "vi") {
// vn_price_info = manifest.prices[i];
// }
// }
// }
        res.json({
            content_html: content_html,
            app_detail: app_detail,
            app_installed: app_installed,
            is_installed: app_installed? true: false,
            manifest: manifest
// total_commission: result.total_commission,
        });
    };
    
    var error = ( reason ) => {
        console.log(reason);
        return next(new TypeError("manage_app.app_detail.notfound"));
    };
        
    Promise.all([
        getManifest,
        getContentHtml,
        isInstalled
    ]).then( success ).catch( error );
        
};

/*
 * @author: dientn install app from marketplace
 */
exports.install = [
    ( req, res, next )=>{
        var appMarket = req.marketApp;
        var data = {
            app_name : appMarket.name,
            app_id: appMarket._id,
            app_title : appMarket.info.title,
            parrent_id : utils.getParentUserId(req.user)
        }
        
        validate.install( data, next );
    },
    ( req, res, next ) =>{
        var idOwner = utils.getParentUserId(req.user),
            appMarket = req.marketApp,
            app_name = appMarket.name,
            path_app_market = `assets/marketplace/${app_name}`,
            path_app = `assets/uploads/${idOwner}/apps`,
            app = {};
        
        var readManifest = ()=>{
            return new Promise( ( resolve, reject )=>{
                var path_manifest = `${path_app_market}/manifest.json`;
                fs_extra.readJson(path_manifest, (err, manifest_obj) =>{
                    if(err){
                        return reject(err);
                    }
                    console.log("Install app: read manifest success");
                    resolve(manifest_obj);
                });
            })
        };
        
        // store data to db
        var addAppToDb = ( manifest ) =>{
            return new Promise( (resolve, reject) =>{
                var data = {
                    ed_user_id: idOwner,
                    market_id: appMarket.id,
                    app_name: app_name,
                    permissions: [],
                    is_enabled: true,
                    is_maximize: manifest.is_maximize == true,
                    version: manifest.version
                };

                var enum_locations = enums.locations,
                    locations = [],
                    manifestLocation = manifest.location;

                if ( _.isString(manifestLocation) ) {
                    manifestLocation = [ manifestLocation ];
                } 
                _.forEach(manifestLocation, (key)=>{
                   if(enum_locations[key]){
                       locations.push(enum_locations[key]);
                   } 
                });

                data.locations = locations;
                app = new AppUser(data);
                app.save(data, function( err ) {
                    if ( err ) {
                        return reject(JSON.stringify( err ) );
                    }
                    console.log("Install app: add app to db success");
                    resolve( app );
                });
            })
        };
        
        // move_app_upload to folder apps
        var moveApp = ( app ) =>{
            new Promise( (resolve, reject) =>{
                path_app = `${path_app}/${app.id}`;
                
                fs_extra.copy(path_app_market, path_app, (err) =>{
                    if (err) {
                        console.error(err);
                        return reject("app.market.copy_failured");
                    }

                    // remove files intro install
                    var langs = ['en', 'vi'];
                    for (var i in langs) {
                        fs_extra.remove(`${path_app}/intro_${langs[i]}.md`, (err) =>{
                            if(err){
                                console.error(err,`Install app remove intro_${langs[i]}.md`);
                            }
                        });
                    }

                    // remove screenshots
                    fs_extra.remove(path_app + '/screenshots', (err) =>{
                        if(err){
                            console.error(err, "Install app remove screenshots dicrectory");
                        }
                    });
                    
                    console.log("Install app: move app success");
                    resolve(app);
                });
            });
        };
        
        var success = (result)=>{
             res.json( app );
        };
        var error = (reason) =>{
            app.remove(app.id,(err)=>{
                if(err){
                    console.error(err,"Install app error");
                }
            });
            fs_extra.remove(path_app , (err) =>{
                if(err){
                    console.log(err,"Install app error");
                }
            });
            return next(reason);
        };
        
        readManifest()
            .then( addAppToDb )
            .then( moveApp )
            .then( success )
            .catch( error );
    }
];

/*
 * @author: dientn buy app
 */
exports.buy =[
    ( req, res, next ) =>{
        res.json({});
    }
];

/**
 * Middleware
 */

exports.getAppGlobalById = (req, res, next, id) =>{
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("manage_app.app_id_notfound"));
    }
    var idOwner = utils.getParentUserId(req.user);
    
    // find payment hist by id
    AppMarket.findById(id).exec((err, application) => {
        if (err) {
            return next(err);
        }  
        
        if( !application ){
            return next(new TypeError("manage_app.app_id_notfound"));
        }
        req.marketApp = application;
        next();
    });
};
