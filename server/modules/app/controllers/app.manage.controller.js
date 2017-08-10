'use strict';
//
// app.manage.controller.js
// handle manage app data
//
// Created by dientn on 2016-02-02.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    _ = require("lodash"),
    enums = require('../resources/enums.res'),
    path = require('path'),
    StreamZip = require('node-stream-zip'),
    utils = require(path.resolve('./modules/core/resources/utils')),
    app_utils = require('../resources/utils'),
    config = require(path.resolve('./config/config')),
    AppUser = mongoose.model("AppUser"),
    AppMarket = mongoose.model("AppMarket"),
    fs_extra = require('fs-extra'),
    fs = require("fs"),
    archiver = require('archiver'),
    marked = require('marked'),
    validate = require('../validator/app.manage.validator'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

/*
 * @author: dientn delete app
 */
exports.delete = ( req, res, next ) =>{
    var idOwner = utils.getParentUserId(req.user),
        app = req.app;

    // remove app
    var removeApp = new Promise( ( resolve, reject )=>{
        app.remove((err, result) =>{
            if ( err ) {
                return reject(err);
            }

            if (result.length > 0){
                return reject(new TypeError("manage_app.app_name_exist"));
            }
            delete req.app;
            resolve( result );
        });
    });

    // remove app folder
    var removeAppFolder = new Promise( ( resolve, reject )=>{
        var app_id = app.id;
        var path_app = `assets/uploads/${idOwner}/apps/${app_id}`;
        fs_extra.remove(path_app, (err) =>{
            if (err) {
                return reject( err );
            }
            resolve();
        });
    });
    
    removeApp.then( ()=>{
        return removeAppFolder;
    }).then( () =>{
        res.json({
            success: true,
            message:"app.manage.remove_success"
        });
    }).catch( (reason)=>{
        return next(reason);
    });
};

/*
 * @author: dientn enable or disable app
 */
exports.toggle = ( req, res, next ) =>{
    if( !_.isBoolean(req.body.toggle) ){
        return next(new TypeError("manage_app.invalid_toggle"));
    }
    var app = req.app,
        data = { is_enabled: req.body.toggle };
    app = _.assign(app, data);
    app.save( (err, result) =>{
        if ( err ) {
            return next( err );
        }
        res.json( app._doc );
    });
};

/*
 * @author: dientn get all app
 */
exports.list = ( req, res, next ) =>{
    
    var idOwner = utils.getParentUserId(req.user);
    var location = req.body.location;
    var is_active = req.query.is_active;
    
    var params = {
        query: {
            ed_user_id: idOwner,
            is_enabled: is_active
        },
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit,
        populate: {
            include: 'market_id',
            fields: 'name'
        }
    };
    
    if( location ){
        params.query.location = {$in: [location]};
    }
    
    utils.findByQuery(AppUser, params).exec(function (err, apps) {
        if (err) {
            return next(err);
        }
        
        if(is_active == "1"){
            var app_tasks = {},
                market_path = `assets/marketplace`,
                app_path = `assets/uploads/${idOwner}/apps`,
                app_tasks = [];
            apps.forEach((app) =>{
                app = app._doc;
                if(app.market_id){
                    app_tasks.push(new Promise((resolve)=>{
                            var market_manifest_path = `${market_path}/${app.market_id.name}/manifest.json`;
                            var app_manifest_path = `${app_path}/${app._id}/manifest.json`;
                            if(!fs.existsSync(market_manifest_path) || !fs.existsSync(app_manifest_path)){
                                app.is_old_version= false;
                                return resolve();
                            }
                            var market_manifest_obj = fs_extra.readJsonSync(market_manifest_path);
                            var app_manifest_obj = fs_extra.readJsonSync(app_manifest_path);

                            if(!market_manifest_obj && !app_manifest_obj){
                                app.is_old_version = false;
                                return resolve();
                            }
                            app.is_old_version = market_manifest_obj.version != app_manifest_obj.version;
                            resolve();
                        })
                    );
                }
            });

            Promise.all(app_tasks).then((result) =>{
                res.json(apps);
            }, (error)=>{
                console.log(error);
                res.json(apps);
            });
        }else{
            res.json(apps);
        }
    });
};

/*
 * author: dientn get setting app
 */
exports.getAppSetting = [
    ( req, res, next) =>{
        var app = req.app,
        idOwner = utils.getParentUserId(req.user),
        path_app = `assets/uploads/${idOwner}/apps/${app.id}`;
        
        if(!fs.existsSync( path_app )){
            return next(new TypeError("manage_app.app_not_found"));
        }

        next();
    },
    ( req, res, next ) =>{
        var idOwner = utils.getParentUserId(req.user),
            app = req.app,
            path_app = `assets/uploads/${idOwner}/apps/${app.id}`,
            path_file_readme = `${path_app}/README.md`,
            path_file_lang = `${path_app}/language.json`,
            path_file_manifest = `${path_app}/manifest.json`;
        // async function
        var getManifest = new Promise((resolve, reject)=>{
            fs_extra.readJson(path_file_manifest, function(err, packageObj) {
                if ( err ) {
                    console.error( err );
                    return reject();
                }

                resolve( packageObj );
            });
        });
        var getLang = new Promise((resolve, reject)=>{
            fs_extra.readJson(path_file_lang, function(err, languageObj) {
                if ( err ) {
                    console.error( err );
                    return reject();
                }

                resolve( languageObj );
            });
        });
        var getReadMeContentHtml = new Promise( ( resolve, reject )=>{
            fs_extra.readFile(path_file_readme, 'utf8', function (err, data) {
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

        // callback function
        var success = ( results )=>{
            var manifest = results[0],
                languages = results[1],
                content_html = results[2];

            var default_locale = req.user.language || manifest.defaultLocale || 'en';
            var parameters_meta = languages[default_locale].parameters || {};
            var parameters = {};
            manifest.parameters.forEach((parameter)=>{
                parameters[parameter.name] = parameter.value;
                delete parameter.value;
                parameters_meta[parameter.name] = _.assign(parameters_meta[parameter.name], parameter);
            });
            app.populate({path:"market_id", select: "name"}, (err, result)=>{
                if(error){
                    console.log(err);
                }

                res.json({
                    info_app: result || app,
                    parameters: parameters,
                    parameters_meta: parameters_meta ,
                    instruction_install: content_html || '',
                    setting_url: manifest.settingUrl
                });
            });

        };

        var error = ( reason ) => {
            return next(new TypeError("manage_app.app_not_found"));
        };

        Promise.all([
            getManifest,
            getLang,
            getReadMeContentHtml
        ]).then( success ).catch( error );
    }
];

/*
 * @author: dientn update or upgrade app
 */
exports.update = [ 
    (req, res, next)=>{
        var app = req.app,
            idOwner = utils.getParentUserId(req.user),
            path_app = `assets/uploads/${idOwner}/apps/${app.id}`;
            
        if(!app.market_id){
            return next(new TypeError("manage_app.market.not_found"));
        }
        // check exit folder app on market place
        var checkFolder = new Promise((resolve, reject)=>{
            fs.stat(path_app, (err, stat) =>{
                if (err) {
                    return reject(err);
                }
                if ( !(stat && stat.isDirectory()) ) {
                    return reject(new TypeError("manage_app.app_location_notfound"));
                } 
                resolve();
            })
        });
        var checkVersion = new Promise((resolve, reject)=>{
            AppMarket.findById(app.market_id).exec((err, appMarket)=>{
                if(err || !appMarket){
                    return reject(err || new TypeError('manage_app.market.not_found'));
                }
                var path_app_market =`assets/marketplace/${appMarket.name}`;
                var manifest_app = fs_extra.readJsonSync(`${path_app}/manifest.json`);
                var manifest_app_market = fs_extra.readJsonSync(`${path_app_market}/manifest.json`);
                
                if(Number(manifest_app.version) >= Number(manifest_app_market.version)){
                    return reject(TypeError('manage_app.update.version_less_than'));
                }
                req.appMarket = appMarket;
                resolve();
            });
        });
        // begin check
        Promise.all([
            checkFolder,
            checkVersion
        ]).then(result=>{
            next();
        },reason=>{
           return next(reason);
        });
    },
    // validate parameters
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user),
            app = req.app,
            appMarket = req.appMarket,
            manifest = null,
            manifest_app_old = null,
            path_app = `assets/uploads/${idOwner}/apps/${app.id}`,
            path_app_market = `assets/marketplace/${appMarket.name}`,
            manifest_app_old = fs_extra.readJsonSync(`${path_app}/manifest.json`);
        
        // copy from marketplace to app folder
        fs_extra.copy(path_app_market, path_app, (err)=> {
            if (err) {
                return next(err);
            }

            // remove files intro install
            var langs = ['en', 'vi'];
            for (var i in langs) {
                fs_extra.remove(path_app + '/intro_' + langs[i] + '.md', (err)=> {
                    // @ignore
                });
            }

            // screenshots
            fs_extra.remove(path_app + '/screenshots', function(err) {
                // @ignore
            });
            
            fs_extra.readJson(path_app + "/manifest.json", function(err, manifest_obj) {
                if (err || !manifest_obj) {
                    return next(err || new TypeError('manage_app.updat.manifest_not_valid'));
                }
                
                manifest = manifest_obj;
                var keys = Object.keys(manifest_app_old);
                _.forEach(manifest_app_old, (value, key)=>{
                    if(key != "version"){
                        manifest[key] = manifest_app_old[key];
                    }
                })
                fs_extra.outputJson(`${path_app}/manifest.json`, manifest, function(err) {
                    if (err) {
                        return callback(err, null);
                    }

                    // clear cache manifest.json
                    delete require.cache[path_app+'/manifest.json'];
                    
                    // response 
                    res.json({success: true});
                });
            });
        });
    }
];/*
 * @author: dientn edit app
 */
exports.edit = [ 
    (req, res, next)=>{
        var app = req.app,
            idOwner = utils.getParentUserId(req.user),
            path_app = `assets/uploads/${idOwner}/apps/${app.id}`;
        
        if(!req.body || _.isEmpty(_.keys(req.body)) ) 
            return next(new TypeError("manage_app.edit_empty_app"));
        
        // check exit folder app on market place
        fs.stat(path_app, (err, stat) =>{
            if (err) {
                return next(err);
            }

            if ( !(stat && stat.isDirectory()) ) {
                return next(new TypeError("manage_app.app_location_notfound"));
            } 
            next();
        });
    },
    // validate parameters
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user),
            app = req.app,
            parameters = req.body.parameters ,
            path_manifest = `assets/uploads/${idOwner}/apps/${app.id}/manifest.json`;
        
        var data = {
            path_manifest: path_manifest,
            parameters: parameters,
            title: req.body.title,
            role_restrictions: req.body.role_restrictions,
            role_check: req.body.role_check
        };
        validate.validateEdit( data, next);
    },
    ( req, res, next ) =>{
        var idOwner = utils.getParentUserId(req.user),
            app = req.app,
            app_name = req.body.title,
            parameters = req.body.parameters ,
            permissions = typeof req.body.role_restrictions == "undefined" ? [] : req.body.role_restrictions,
            role_check = req.body.role_check,
            path_manifest = `assets/uploads/${idOwner}/${app.id}/manifest.json`;
        
        //console.log("req.body", parameters);
        // update data to db
        var updateAppToDb = new Promise( (resolve, reject) =>{
            app.app_name = app_name;
            if(_.isBoolean(role_check)){
                app.permissions = role_check ? permissions : [];
            }

            app.save(( err ) =>{
                if ( err ) {
                    return reject();
                }
                resolve( app );
            });
        });
        
        // update paramater to manifest file
        var updateParamater = new Promise( (resolve, reject) =>{
            var params = [];
            app_utils.updatePrameters(idOwner, app.id, parameters, (err, result)=>{
                if(err){
                    console.error( err );
                    reject();
                }
                resolve(result);
            });
        });
        
        // callback function
        var success = ( results )=>{
            var manifest = results[1];
            res.json({
                app_info: app._doc,
                parameters: manifest.parameters,
            });
        };

        var error = ( reason ) => {
            return next(new TypeError("manage_app.edit_error"));
        };
        
        return Promise.all([
            updateAppToDb,
            updateParamater
        ]).then( success ).catch(error);
    }
];

/*
 * @author: dientn download app
 */
exports.download = [
    (req, res, next) =>{
        var app = req.app;
        if(!app.submitter_id || !mongoose.Types.ObjectId.isValid(app.submitter_id)){
            return next(new TypeError("manage_app.app_not_granted"));
        }
        next();
    },
    ( req, res, next ) =>{
        var app = req.app,
            idOwner = utils.getParentUserId(req.user),
            path_app  = `assets/uploads/${idOwner}/apps/${app.id}`,
            path_manifest = `${path_app}/manifest.json`;
        
        fs.exists(path_app, (exists) => {
            if(!exists){
                return next(new TypeError("manage_app.app_id_notfound"));
            }
            
            var obj = fs_extra.readJsonSync(path_manifest, {throws: false});
            
            if(!obj){
                return next(new TypeError("manage_app.app_manifest_notfound"));
            }
            
            var archive = archiver('zip');
            res.writeHead(200, {
              'Content-Type'        : 'application/octet-stream',
              'Content-Disposition' : `attachment; filename=${obj.name}.zip`,
            });

            archive.on('error', function(err) {
                return next(err);
            });

            archive.pipe(res);
            archive.directory( path_app , obj.name );
            archive.finalize( (err, written) =>{
                if (err) {
                    return next( err );
                }
            });
        });
    }
];

/*
 * @author: dientn upload app
 */
exports.upload = [
    (req, res, next) => {
        var data = {
            parrent_id:utils.getParentUserId(req.user),
            upload_file : req.file,
            app_name: req.body.app_name
        };
        
        validate.uploadIsValid(data, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var app_upload = req.file;
        var title = req.body.app_name;
        var app_name = app_upload.originalname.replace(new RegExp('.zip$'), '');
        var zipPath = app_upload.path;
        var unzipPath = `assets/uploads/${idOwner}/apps/`;
        
        var require_entries = [
            `${app_name}/manifest.json`,
            `${app_name}/app.js`,
            `${app_name}/assets/`,
            `${app_name}/templates/`,
            `${app_name}/templates/layout.html`,
            `${app_name}/templates/js_layout.html`
        ];
        
        var accept_entries = [
            `${app_name}/app.css`,
            `${app_name}/LICENSE`,
            `${app_name}/README.md`,
            `${app_name}/language.json`,
            `${app_name}/lib/`
        ];
        
        var app = new AppUser({
            app_name : title,
            ed_user_id : idOwner,
            submitter_id : req.user._id,
            permissions : [],
            is_enabled : true
        });
        
        unzipPath = `${unzipPath}${app.id}`;
        
        var zip = new StreamZip({  
            file : zipPath,  
            storeEntries : true    
        });
        
        var validateData = {
            require_entries : require_entries,
            accept_entries : accept_entries,
            app_name : app_name,
            unzip_path : unzipPath
        };
        
        // add app to db
        var addAppToDb = (data) => {
            return new Promise((resolve, reject) => {
                var enum_locations = enums.locations;
                var locations = [];
                var manifest = data.manifest;
                var manifestLocation = manifest.location;
                
                if (_.isString(manifestLocation)) {
                    manifestLocation = [ manifestLocation ];
                }
                
                _.forEach(manifestLocation, (key) => {
                   if (enum_locations[key]) {
                       locations.push(enum_locations[key]);
                   } 
                });
                
                app.locations = locations;
                app.version = manifest.version;
                
                app.save((err) => {
                    if (err) {
                        console.error(err);
                        return reject(err);
                    }
                    
                    fs_extra.ensureDir(unzipPath, (errDir) => {
                        if (errDir) {
                            console.error(errDir);
                            return reject(errDir);
                        }
                        
                        data.app = app;
                        console.log("Upload app: complete add app to db");
                        resolve(data);
                    });
                });
            });
        };
        
        // extract zip file
        var extractZip = (data) => {
            return new Promise((resolve, reject) => {
                var tasks = [];
                var entries = data.entries
                var require_entries = data.require_entries;
                accept_entries = data.accept_entries;
                
                _.forEach(require_entries, (value) => {
                    var task = new Promise((resolve, reject) => {
                        var pathExtra = value.replace(new RegExp(`^${app_name}`), unzipPath);
                        if (entries[value].isDirectory) {
                            fs_extra.ensureDirSync(pathExtra.replace(new RegExp(`/$`),''));
                        }
                        
                        zip.extract(value, pathExtra, (err) => {
                            if (err) {
                                console.error( err );
                                reject();
                            }
                            
                            resolve();
                        });
                    });
                    
                    tasks.push(task);
                });
                
                _.forEach(accept_entries, (value) => {
                    if(entries[value]) {
                        var task = new Promise((resolve, reject) => {
                            var pathExtra = value.replace(new RegExp(`^${app_name}`), unzipPath);
                            
                            if (entries[value].isDirectory) {
                                fs_extra.ensureDirSync(pathExtra.replace(new RegExp(`/$`),''));
                            }
                            
                            zip.extract(value, pathExtra, (err) => {
                                if (err) {
                                    console.error(err);
                                    reject();
                                }
                                
                                resolve();
                            });
                        });
                        
                        tasks.push(task);
                    }
                });
                
                // extract all file accept
                Promise.all(tasks).then(() => {
                    console.log("Upload app: complete extract zip file");
                    resolve( data );
                }).catch((reason) => {
                    reject();
                });
            });
        };
        
        // unzip process error handler
        zip.on('error', (err) => { 
            fs_extra.removeSync(zipPath); // remove upload file
            
            app.remove((errRemove) => {
                if (errRemove) {
                    console.error(errRemove);
                }
                
                return next(err);
            });
        });
        
        var success = (result) => {
            fs_extra.removeSync(zipPath); // remove upload file
            res.json(result.app._doc);
        };
        
        var error = (reason) => {
            fs_extra.removeSync(zipPath); // remove upload file
            
            if ( _.endsWith(unzipPath, `${app.id}`) && fs.existsSync(unzipPath)) {
                fs_extra.removeSync(unzipPath); // remove user app folder
            }

            app.remove((errRemove) => {
                console.log("Upload app error : removed app record");
                return next( errRemove );
            });
            
            var errors = reason;
            
            try {
                errors = JSON.parse(reason);
                errors = errorHandler.validationError(errors);
            } catch(ex) {
                errors = new TypeError(reason);
            }
            
            errors = _.isObject(errors) ? errors : new TypeError("manage_app.app_upload_fail");
            return next( errors );
        };
        
        zip.on('ready', () => {
            validateData.entries = zip.entries();
            
            validate.zipFileIsValid(validateData)
                .then(extractZip)
                .then(validate.isValidFiles)
                .then(validate.isValidAssets)
                .then(validate.isValidManifest)
                .then(addAppToDb)
                .then(success)
                .catch(error);
        });
    }
];

/**
 * Middleware
 */
exports.getAppById = (req, res, next, id) =>{
    // check the validity of app id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("app.manage.app_id.objectId"));
    }
    var idOwner = utils.getParentUserId(req.user);
    // find app by id
    AppUser.findById(id).exec((err, application) => {
        if (err || !application) {
            return next(err || new TypeError("manage_app.app_id_notfound"));
        }
        
        if( !_.isEqual(application.ed_user_id,idOwner) ){
           return next(new TypeError('manage_app.app_id_notfound')); 
        }
        
        req.app = application;
        next();
    });
};
