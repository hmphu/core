'use strict';
//
//  people.user.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2016-01-06.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _            = require('lodash'),
    mongoose     = require('mongoose'),
    moment       = require('moment'),
    sendmail     = require('../../core/resources/sendmail'),
    Utils        = require('../../core/resources/utils'),
    Utils_people = require('../resources/utils'),
    Utils_elastics = require('../../elastics/resources/utils'),
    enums        = require('../../core/resources/enums.res'),
    peolpe_enums = require('../resources/enums.res'),
    path         = require('path'),
    config       = require(path.resolve('./config/config')),
    validate     = require('../validator/user.validator'),
    translation  = require('../resources/translate.res'),
    emitter      = require(path.resolve('./config/lib/emitters/event.emitter')),
    cache        = require(path.resolve('./config/lib/redis.cache')),
    User         = mongoose.model('User'),
    Ticket       = mongoose.model('Ticket'),
    UserContact  = mongoose.model('UserContact');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

function filter_requester(user){
    if(user && user.is_requester){
        emitter.emit('evt.user.requester_filter', {
            user: user
        });
    }
};

function add_user(options, next){
    var body = options.body,
        is_internal = options.is_internal || false,
        req_user = options.req_user,
        user = body,
        idOwner = Utils.getParentUserId(options.req_user);

    body.language = options.req_user.language;
    user.ed_parent_id = idOwner;

    new Promise(function(resolve, reject) {
        if(body.password){
            resolve(body.password);
        }else{
            User.generateRandomPassphrase().then((new_password) => {
                resolve(new_password);
            }).catch((reason) => {
                return reject(reason);
            });
        }
    }).then(function(new_password) {
        return new Promise(function(resolve, reject) {
            user.password = new_password;
            user.confirmed_password = new_password;
            user.is_requester = body.roles[0] === enums.UserRoles.requester;
            user.roles = [body.roles];
            user.sub_domain = req_user.sub_domain;
            if(user.is_requester && !body.email){
                //check contact is email or phone. if contact is phone, create email.
                if(body.phone){
                    //create email for user.
                    //user.email = (body.code || '') + body.phone + config.mailer.from;
                    var tmp_email = (body.code || '') + body.phone;
                    user.email = `requester_${tmp_email}@auto-gen.izihelp.com`;

                }else if(body.facebook){
                    user.email = `requester_${body.facebook}@auto-gen.izihelp.com`;
                }
            }

            var afterSave = function(err, user, raw){
                if (err) {
                    return next(err);
                }

                var value_contact = {
                    idOwner: idOwner,
                    is_requester: user.is_requester,
                    user_id: user._id,
                    email: body.email,
                    phone: body.phone,
                    facebook: body.facebook,
                    is_primary: true,
                    code: body.code || undefined
                };

                if(raw && raw.lastErrorObject.updatedExisting){
                    user.is_existed = true;
                    emitter.emit('evt.user.contact.find_or_add_contact_user', value_contact);
                    return next(null, user);
                }

                //add contact to user_contact
                emitter.emit('evt.user.contact.add_contact_user', value_contact , function(err, result){
                    if(err){
                        //console.error(body, "===DEBUG USER ===");
                        console.error(err, "save contact user fail");
                    }
                });

                //add user to Group Support
                //find group default of owner, after add this user into group
                if(!user.is_requester){
                    emitter.emit('evt.group.add_group_user_default', {
                        idOwner: idOwner,
                        user_id: user._id
                    });

                    //Send mai with user's role is admin or agent
                    //update current_agent_no
                    emitter.emit('evt.user.setting.update.max_agent', {
                        idOwner: idOwner,
                        agent_no: 1,
                        callback: function(err, result){
                            if(err){
                                console.error(err, "update.max_agent fail");
                            }else{
                                req_user.settings.current_agent_no += 1;
                            }
                        }
                    });

                    //send mail
                    var data = {
                        name: user.name,
                        email: user.email,
                        new_password: new_password,
                        sub_domain: req_user.sub_domain,
                        url: Utils.getFullUrl(req_user)
                    };
                    var options = {
                        template: `modules/people/templates/${req_user.language || "en"}/add-user.html`,
                        from :  `IZIHelp System <${config.mailer.from}>`,
                        to: user.email,
                        subject: translation[req_user.language || "en"].mail.subject
                    };
                    sendmail(data, options);
                    return next(null, user);
                //add org into requester with domain from email
                }else{
                    if(body.email){
                        emitter.emit('evt.people.org.add_org_requester', {
                            requester: user,
                            idOwner: idOwner,
                            domain: body.email.replace(/.*@/, "")
                        }, function(err, org){
                            if(err){
                                console.error(err, "save add_org_requester fail");
                                //return next(err);
                            }
                            if(org && is_internal){
                                user.org_id = org._id;
                            }
                            return next(null, user);
                        });
                    }else{
                        return next(null, user);
                    }
                }
            };

            //save user
            delete user._id;
            user.is_requester = user.hasOwnProperty('is_requester') ? user.is_requester : false;
            user.profile_image = user.hasOwnProperty('profile_image') ? user.profile_image : 'default.png';
            user.time_zone = user.hasOwnProperty('time_zone') ? user.time_zone : { id: config.timezone.id, value: config.timezone.value};
            user.time_format = user.hasOwnProperty('time_format') ? user.time_format : config.timeFormat.h24,
            user.is_verified = user.hasOwnProperty('is_verified') ? user.is_verified : false,
            user.is_suspended = user.hasOwnProperty('is_suspended') ? user.is_suspended : false,

            user.upd_time = +moment.utc();
            user.add_time = +moment.utc();
            User.findOneAndUpdate(
                {
                    $or:[
                        {
                            ed_parent_id: idOwner
                        },
                        {
                            _id: idOwner
                        }
                    ],
                    email: user.email
                },{
                    $setOnInsert: user
                },
                {
                    passRawResult: true,
                    upsert: true,
                    new: true
            }, afterSave);
            /*
            if(user.is_requester){
                user.save(afterSave);
            }else{
                cache.saveAndUpdateCache(idOwner, user._id, user, afterSave);
            }*/
        });

    }, function(reason) {
        next(reason);
    });
};

//function generatePwd(options ){
//    return ((resolve, reject) => {
//        if(options.password){
//            resolve(options.password);
//        }else{
//            User.generateRandomPassphrase().then((new_password) => {
//                options.password = new_password;
//                resolve(options);
//            }).catch((reason) => {
//                return reject(reason);
//            });
//        }
//    });
//};
//
//function processUserData(user_data){
//    return new Promise((resolve, reject) => {
//        if(user_data.is_requester && !user_data.email){
//            //check contact is email or phone. if contact is phone, create email.
//            if(user_data.phone){
//                //create email for user.
//                var tmp_email = (user_data.code || '') + user_data.phone;
//                user_data.email = `requester_${tmp_email}@auto-gen.izihelp.com`;
//                
//                delete user_data.facebook;
//                
//            }else if(user_data.facebook){
//                
//                user_data.email = `requester_${user_data.facebook}@auto-gen.izihelp.com`;
//                
//                delete user_data.phone;
//                delete user_data.code;
//            }
//        }
//
//        //save user
//        delete user_data._id;
//        user_data.is_requester  = user_data.hasOwnProperty('is_requester') ? user_data.is_requester : false;
//        user_data.profile_image = user_data.hasOwnProperty('profile_image') ? user_data.profile_image : 'default.png';
//        user_data.time_zone     = user_data.hasOwnProperty('time_zone') ? user_data.time_zone : { id: config.timezone.id, value: config.timezone.value};
//        user_data.time_format   = user_data.hasOwnProperty('time_format') ? user_data.time_format : config.timeFormat.h24,
//        user_data.is_verified   = user_data.hasOwnProperty('is_verified') ? user_data.is_verified : false,
//        user_data.is_suspended  = user_data.hasOwnProperty('is_suspended') ? user_data.is_suspended : false,
//
//        user_data.upd_time = +moment.utc();
//        user_data.add_time = +moment.utc();
//        
//        User.findOneAndUpdate(
//            {
//                $or:[
//                    {
//                        ed_parent_id: user_data.ed_parent_id
//                    },
//                    {
//                        _id: user_data.ed_parent_id
//                    }
//                ],
//                email: user_data.email
//            },{
//                $setOnInsert: user_data
//            }, 
//            {
//                passRawResult: true,
//                upsert: true,
//                new: true
//        }, (err, user, raw) => {
//            resolve({
//                err: err,
//                user: user,
//                raw: raw,
//                user_data: user_data
//            });
//        });
//    });
//};
//
//function processAfterSaveUser(options){
//    return new Promise((resolve, reject) => {
//        var user = options.user,
//            raw = options.raw,
//            user_data = options.user_data,
//            req_user = options.user_data.req_user,
//            idOwner = user_data.ed_parent_id;
//           
//        var value_contact = {
//            idOwner: idOwner,
//            is_requester: user.is_requester,
//            user_id: user._id,
//            email: user_data.email,
//            phone: user_data.phone,
//            facebook: user_data.facebook,
//            is_primary: true,
//            code: user_data.code || undefined
//        };
//
//        if(raw && raw.lastErrorObject.updatedExisting){
//            user.is_existed = true;
//            emitter.emit('evt.user.contact.find_or_add_contact_user', value_contact);
//            return resolve(user);
//        }
//
//        //add contact to user_contact
//        emitter.emit('evt.user.contact.add_contact_user', value_contact , function(err, result){
//            if(err){
//                //console.error(body, "===DEBUG USER ===");
//                console.error(err, "save contact user fail");
//                return;
//            }
//        });
//
//        //add user to Group Support
//        //find group default of owner, after add this user into group
//        if(!user.is_requester){
//            emitter.emit('evt.group.add_group_user_default', {
//                idOwner: idOwner,
//                user_id: user._id
//            });
//
//            //Send mai with user's role is admin or agent
//            //update current_agent_no
//            emitter.emit('evt.user.setting.update.max_agent', {
//                idOwner: idOwner,
//                agent_no: 1,
//                callback: function(err, result){
//                    if(err){
//                        console.error(err, "update.max_agent fail"); 
//                    }else{
//                        req_user.settings.current_agent_no += 1;
//                    }
//                }
//            });
//
//            //send mail
//            var data = {
//                name: user.name,
//                email: user.email,
//                new_password: user_data.new_password,
//                sub_domain: req_user.sub_domain,
//                url: Utils.getFullUrl(req_user)
//            };
//
//            var options_mail = {
//                template: `modules/people/templates/${req_user.language || "en"}/add-user.html`,
//                from :  `IZIHelp System <${config.mailer.from}>`,
//                to: user.email,
//                subject: translation[req_user.language || "en"].mail.subject
//            };
//            sendmail(data, options_mail);
//            return resolve(user);
//        //add org into requester with domain from email
//        }else{
//            if(user_data.email){
//                emitter.emit('evt.people.org.add_org_requester', {
//                    requester: user,
//                    idOwner: idOwner,
//                    domain: user_data.email.replace(/.*@/, "")
//                }, function(err, org){
//                    if(err){
//                        console.error(err, "save add_org_requester fail");
//                        //return next(err);
//                    }
//                    if(org && user_data.is_internal){
//                        user.org_id = org._id;
//                    }
//                    return resolve(user);
//                });
//            }else{
//                return resolve(user);
//            }
//        }
//    });
//};
//
//
//function add_user(options, next){
//    var user_data = options.body;
//    
//    user_data.is_internal = options.is_internal || false;
//    user_data.language = options.req_user.language;
//    user_data.ed_parent_id = Utils.getParentUserId(options.req_user);
//    user_data.sub_domain = options.req_user.sub_domain;
//    user_data.req_user = options.req_user;
//    user_data.roles = [options.body.roles];
//    user_data.is_requester = options.body.roles[0] === enums.UserRoles.requester;
//
//    new Promise(generatePwd(user_data))
//        .then(processUserData)
//        .then(processAfterSaveUser)
//        .then((user) => {
//            return next(null, user);
//        }).catch(error => {
//            console.error(error);
//            return next(error);
//        });
//};

function findOrAdd(options, next){
    if(!options.value){
        return next(new TypeError('people.user.contact.value.invalid'));
    }
    
    var idOwner = options.idOwner,
        query = {
            value: options.value || '',
            ed_user_id: idOwner
        };

    if(options.code){
        query.value = `(+${options.code})` + options.value.replace(/^0/g, '');
    }else{
        if(options.type == peolpe_enums.UserContactType.phone){
            options.name = options.name != undefined ? options.name : options.value;
            options.value = `(+84)` + options.value.replace(/^0/g, '');
            query.value = options.value;
        }
    }
    
    UserContact.findOne(query)
        .select('')
        .populate({
            path: "user_id",
            select: '-salt -password'
        })
    .exec((err, result) => {
        if (err) {
            return next(err);
        }
        if(result){
            return next(null, result.user_id);
        }else{
            var body = {
                roles: [enums.UserRoles.requester],
                code: options.code || '',
                name: options.name != undefined ? options.name : options.value.replace(/[_\W]+/g, "_"),
                provider: options.provider || 'local',
                provider_data: {}
            };

            if(options.type == 'email'){
                //body.email = options.value.indexOf('@') != -1 ? options.value : (options.value + config.mailer.from);
                body.email = options.value.indexOf('@') != -1 ? options.value : `requester_${options.value}@auto-gen.izihelp.com`;
            }else{
                body[options.type || 'email'] = options.value;
            }
            
            add_user({ body: body, req_user: options.req_user}, function(err, result){
                if (err) {
                    return next(err);
                }
                result.salt = undefined;
                result.password = undefined;
                result.is_new = true;

                filter_requester(result);

                return next(null, result);
            });
        }
    });
};

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
/**
 * add a new user from internal
 * author : khanhpq
 * params:
        1. req.user
        2. {
             name: "",
             email: "",
             roles: ["requester"],
             phone: 1234557889// if create a requester from a phone number
        }
 */
exports.add_internal = (user, body, next) => {
    add_user({ body: body, req_user: user, is_internal: true}, function(err, result){
        filter_requester(result)
        next(err, result);
    });
};

/**
 * find a user by id from internal
 * author : lamtv
 * id : user's id
 * options : {
 *      select : string,
 *      populate : {
 *          path : string,
 *          select : string
 *      }
 * }
 */
exports.findById_internal = (id, options, next) => {
    options = options || {};

    var populate = options.populate || {path:""};
    var select = options.select;

    User.findById(id)
        .select(select)
        .populate(populate)
    .exec(next);
};

/**
 * add a new user
 * author : khanhpq
 */
exports.add = [
    (req, res, next) => {
        req.body.ed_parent_id = Utils.getParentUserId(req.user);

        if(req.body.roles[0] === enums.UserRoles.requester && req.body.phone){

            if(!req.body.code){
                return next(new TypeError('people.user.contact.value.code.required'));
            }

            if(!_.isNumber(req.body.code)){
                return next(new TypeError('people.user.contact.value.code.must_number'));
            }

            mongoose.model('Country').count({
                code: req.body.code
            }, function (err, count) {
                if (err) {
                    return next(err);
                }

                if (!count) {
                    return next(new TypeError('people.user.contact.value.code.invalid'));
                }

                validate(req.body, next);
            });
        }else if(req.body.facebook){
            if(req.body.roles[0] != enums.UserRoles.requester){
                return next(new TypeError('people.user.roles.invalid'));
            }
            var body = {
                name: req.body.name,
                facebook: req.body.facebook,
                is_requester: req.body.is_requester != undefined ? req.body.is_requester : true,
                roles: req.body.roles
            };
            validate(body, next);
            
        }else{
            validate(req.body, next);
        }
    },
    (req, res, next) =>{
            //set provider for user
        var body = {
            roles: req.body.roles,
            code: req.body.code || undefined,
            phone: req.body.phone || undefined,
            facebook: req.body.facebook || undefined,
            email: req.body.email || undefined,
            name: req.body.name || '',
            provider: 'local',
            provider_data: {}
        };

        add_user({ body: body, req_user: req.user}, function(err, result){
            if (err) {
                if(err.code == 11000 || err.code == 11001){
                    User.findOne({email: body.email}, (err_, result) => {
                        err.op = result;
                        return next(err);
                    });
                }else{
                    return next(err);
                }
            }else{
                filter_requester(result);
                res.json({
                    _id: result._id,
                    is_existed: result.is_existed,
                    name: result.name,
                    roles: result.roles,
                    add_time: result.add_time,
                    is_requester: result.is_requester
                });
            }
        });
    }
];

/**
 * show current user
 * author : khanhpq
 */
exports.read = (req, res) => {
    var user = req.profile.toObject();

    delete user.ed_parent_id;
//    delete user.sub_domain;
    delete user.password;
    delete user.confirmed_password;
    delete user.salt;
//    delete user.is_requester;
    delete user.provider;
    delete user.provider_data;
    delete user.additional_provider_data;
//    delete user.is_suspended;
//    delete user.is_verified;
    delete user.provider;
    delete user.provider_data;
//    delete user.email;

    res.json(user);
};

/**
 * update the current user
 * author : khanhpq
 */
exports.update = [
    (req, res, next) => {
        // remove sensitive data
        delete req.body.sub_domain;
        delete req.body.ed_parent_id;
        delete req.body.password;
        delete req.body.confirmed_password;
        delete req.body.salt;
        delete req.body.is_requester;
        delete req.body.provider;
        delete req.body.provider_data;
        delete req.body.email;
        delete req.body.__v;

        //check role of this user
        if(req.profile.is_requester || req.profile.roles[0] === enums.UserRoles.requester ){
            delete req.body.roles;
        }

        if(req.body.roles){
            req.body.roles = [req.body.roles[0]];

            if(req.profile.roles[0] === enums.UserRoles.owner ){
                return next(new TypeError('people.user.roles.do_not_change_role_owner'));
            }

            if(!Array.isArray(req.body.roles)){
                return next(new TypeError('people.user.roles.is_array'));
            }

            if(_.indexOf([enums.UserRoles.admin, enums.UserRoles.owner, enums.UserRoles.agent], req.profile.roles[0]) != -1 &&  req.body.roles[0] == enums.UserRoles.requester){
                return next(new TypeError('people.user.roles.invalid'));
            }
            
            if(Utils_people.checkRoleEditUser(req.user, req.profile) === false){
                return next(new TypeError('people.user.roles.invalid'));
            }
        }

        //check is_verified
        if(req.profile.is_verified){
            delete req.body.is_verified;
        }
        // Merge existing user
        req.profile = _.assign(req.profile, req.body);

        //check body has org_id
        //if org_id = "", set org_is = null
        if(req.body.org_id == ""){
           req.profile.org_id = null;
        }
        var profile = req.profile.toObject();
        
        profile.user_id = req.user._id;
        profile.ed_parent_id = Utils.getParentUserId(req.user);

        validate(profile, next);
    },
    (req, res, next) => {
        var afterUpdate = function(err){
            if(err){
                console.error(err, `cache user fail`);
            }
            
            filter_requester(req.profile);

            req.profile.ed_parent_id = undefined;
            req.profile.sub_domain = undefined;
            req.profile.password = undefined;
            req.profile.confirmed_password = undefined;
            req.profile.salt = undefined;
            req.profile.provider = undefined;
            req.profile.provider_data = undefined;
            req.profile.additional_provider_data = undefined;
            req.profile.is_suspended = undefined;
            req.profile.is_verified = undefined;
            req.profile.provider = undefined;
            req.profile.provider_data = undefined;
            res.json(req.profile);
        };

        if(req.profile.is_requester){
            req.profile.save(afterUpdate);
        }else{
            cache.saveAndUpdateCache(Utils.getParentUserId(req.user), req.profile._id, req.profile, afterUpdate);
        }
    }
];

/**
 * suspend a user
 * author : khanhpq
 */
exports.toggle_suspended = (req, res, next) =>{
    
    if(Utils_people.checkRoleEditUser(req.user, req.profile) === false){
        return next(new TypeError('people.user.roles.invalid'));
    }
    
    var user = req.profile,
    idOwner = Utils.getParentUserId(req.user);

    user.is_suspended = !user.is_suspended;

    var afterSuspended = function(err){
        if (err) {
            return next(err);
        }

        if(!user.is_requester){
            //update group_user
            emitter.emit('evt.user.group_user_toggle_suspended', {
                idOwner: idOwner,
                user: user
            });
        }
        filter_requester(user);
        res.json({
            _id: user._id,
            name: user.name,
            roles: user.roles
        });
    };

    if(user.is_requester){
        user.save(afterSuspended);
    }else{
        cache.saveAndUpdateCache(idOwner, user._id, user, afterSuspended);
    }
};


/*
    Get all user
    @author: khanhpq
 */
exports.list = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user),
        roles = null,
        params = {
            query: {
                is_suspended: false,
                $or: [
                    {
                        ed_parent_id: idOwner
                    },{
                        _id: idOwner
                    }
                ]
            },
            select: 'name roles add_time _id org_id email is_suspended',
            populate: {
                include: 'org_id',
                fields: '-ed_parent_id'
            },
            skip: req.query.skip,
            sort_order: req.query.sort_order,
            limit: req.query.limit
        };
    //suspended: 2 get all
    if(req.query.suspended === '2'){
        delete params.query.is_suspended;
    }else if(req.query.suspended === '1'){
        params.query.is_suspended = true;
    }
    
    if(req.query.role && req.query.role != ""){
        roles = _.split(req.query.role, '-');
    }
    
    if(roles){
        params.query.roles = {
            $in: roles
        };
    }
    /*
    if([enums.UserRoles.admin, enums.UserRoles.owner].indexOf(req.user.roles[0]) != -1){
        if(roles){
            params.query.roles = {
                $in: roles
            };
        }
    }else{ // role is agent, get requesters or agents
        roles = _.pull(roles, enums.UserRoles.admin, enums.UserRoles.owner);
        params.query.roles = roles;
        //params.query.roles = enums.UserRoles.requester;
    }
    */
    if(req.query.name){
        if (Utils.isValidObjectId(req.query.name)) {
            params.query._id = req.query.name;
        }else{
            req.query.name = req.query.name.replace(/(\W|\D])/g, "\\$1");
            params.query.name = new RegExp(decodeURI(req.query.name), "i");
        }
    }

    Utils.findByQuery(User, params).exec(function (err, users) {
        if (err) {
            return next(err);
        }

        res.json(users);
    });
};

/*
    Count all user
    @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user),
        query   = {
            is_suspended: false,
        },
        roles = [];

    //suspended: 2 get all
    if(req.query.suspended === '2'){
        delete query.is_suspended;
    }else if(req.query.suspended === '1'){
        query.is_suspended = true;
    }
    
    if(req.query.roles && req.query.roles != ""){
        roles = _.split(req.query.roles, '-');
    }else{
        return next(new TypeError('people.user.count.not_roles'));
    }

    var tasks = [];
    roles.forEach((role) => {
        var promise = new Promise((resolve, reject) => {

            if(role == enums.UserRoles.owner) {
                query['$or'] = [{
                    _id: idOwner
                }];
            }else{
               query['$or'] = [{
                    ed_parent_id: idOwner
                },{
                    _id: idOwner
                }];
            }

            query.roles = {
                $in: [role]
            };

            User.count(query, function(err, count) {
                if (err) {
                    return reject(err);
                }
                return resolve({
                    role: role,
                    count: count
                });
            });
        });
        tasks.push(promise);
    });

    Promise.all(tasks).then(function(count) {
        var data = {};
        if(count.length > 0){
            count.forEach((item) => {
                data[item.role] = item.count;
            });
        }
        res.json(data);

    }, function(reason) {
        return next(reason);
    });
};

/*
    Find or Add internal
    @author: khanhpq
    options: {
        idOwner: "",
        value: "",
        name: '',
        code: "",
        provider: "local",
        type: 'email'
        req_user: req.user
    }
 */
exports.findOrAdd_internal = (options, next) => {
    findOrAdd(options, next);
};

/*
    @author: khanhpq
 */
exports.deleteOrSuspendRequester = function (req, res, next) {
    var ids = req.query.ids,
        is_delete = req.query.is_delete,
        is_suspend = req.query.is_suspend,
        idOwner = Utils.getParentUserId(req.user);
    if(!Array.isArray(ids)){
        return next(new TypeError('people.user.ids.invalid'));
    }

    var tasks = [],
        listRequesters = [];
    ids.forEach((id) => {
        var promise = new Promise((resolve, reject) => {

            User.findOne({
                ed_parent_id: idOwner,
                _id: id,
                roles: [enums.UserRoles.requester]
            }).exec((err, requester)=>{
                if(err){
                    return reject(err);
                }

                if(!requester){
                    return resolve(null);
                }

                if(is_delete === "1"){
                    var requester_id = requester._id,
                        requesterElastic = requester.toObject();
                    requester.remove(function (err) {
                        if (err) {
                            return reject(err);
                        }
                        listRequesters.push({
                            delete: {
                                _index: `profile-${idOwner}`,
                                _type: 'requester',
                                _id: requesterElastic._id
                            }
                        });
                        console.log(listRequesters);
                        emitter.emit('evt.user.remove_user_filter', {user_id: requester_id});

                        UserContact.remove({user_id: requester_id}, (err, result) =>{
                            if(err){
                                return reject(err);
                            }
                            return resolve(requester);
                        });
                    });

                }else{
                    if(is_suspend){
                        requester.is_suspended = is_suspend == "1";
                    }else{
                        requester.is_suspended = !requester.is_suspended;
                    }

                    requester.save((err) => {
                        if (err) {
                            return reject(err);
                        }
                        filter_requester(requester);
                        resolve(requester);
                    });
                }
            });
        });
        tasks.push(promise);
    });

    Promise.all(tasks).then(function(results) {
        if(listRequesters.length > 0){
            Utils_elastics.sendElastics(listRequesters);
        }
        res.json({is_success: true});
    }, function(reason) {
        return reject(reason);
    });
}

/*
    Delete or Suspend Users, and transfer ticket after delete
    @author: khanhpq
 */
exports.deleteUser = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user),
        agent_delete_id = req.params.agent_delete,
        agent_assign_id = req.params.agent_assign  === "0" ? idOwner : req.params.agent_assign;

    if (!mongoose.Types.ObjectId.isValid(agent_delete_id) || !mongoose.Types.ObjectId.isValid(agent_assign_id)) {
        return next(new TypeError('people.user.id.objectId'));
    }

    if(agent_delete_id == agent_assign_id){
        return next(new TypeError('people.user.id.same'));
    }

    new Promise(function(resolve, reject) {
        var query = {_id: agent_assign_id};

        if(agent_assign_id != idOwner){
            query['ed_parent_id'] = idOwner;
        }

        User.findOne(query).exec((err, result) =>{
            if (err) {
                return reject(err);
            }

            if (!result) {
                return reject(new TypeError('people.user.agent_assign_id.not_found'));
            }
            resolve({agent_assign: result});
        });
    }).then(function(data) {
        return new Promise(function(resolve, reject) {
           User.findOne({
                ed_parent_id: idOwner,
                _id: agent_delete_id
            })
            .exec((err, result) =>{
                if (err) {
                    return reject(err);
                }

                if (!result) {
                    return reject(new TypeError('people.user.agent_delete_id.not_found'));
                }
                data.agent_delete = result;
                resolve(data);
            });
        });

    }).then(function(data) {
        return new Promise(function(resolve, reject) {
            if(Utils_people.checkRoleEditUser(req.user, data.agent_delete) === false){
                return next(new TypeError('people.user.roles.invalid'));
            }

            /*if(data.agent_delete.is_suspended == false){
                return next(new TypeError('people.user.is_suspended.invalid'));
            }*/
            res.json({is_success: true});
            emitter.emit('evt.user.assign_ticket', {
                req_user: req.user,
                agent_delete: data.agent_delete,
                agent_assign: data.agent_assign,
                idOwner: idOwner,
                user_id: data.agent_delete._id
            }, function(err, result){
                if(err){
                    console.error(err, "assign_ticket user fail");
                }
                if(result === true){
                    emitter.emit('evt.user.setting.update.max_agent', {
                        idOwner: idOwner,
                        agent_no: -1,
                        callback: function(err, result){
                            if(err){
                                console.error(err, "update.max_agent fail"); 
                            }else{
                                req.user.settings.current_agent_no -= 1;
                            }
                        }
                    });
                }
                return;

            });
        });

    }, function(reason) {
        next(reason);
    });
};

/*
    Find or Add internal
    Find or Update contact, and add a new user
    @author: khanhpq
    options: {
        ed_user_id: "",
        org_id: ''
        phones: [],
        code: "", if exists phone
        name: '',
        emails: []
        provider: "local",
        type: 'email'
        user: req.user
    }
 */
exports.findAndUpdateOrAdd_internal = (options, next) => {
    if(!options.name || (!options.phones && !options.emails)){
        return next(new TypeError('people.user.contact.value.required'));
    }
    
    var idOwner = options.ed_user_id,
        query = {
            ed_user_id: idOwner
        };
        
    var phones = options.phones;
    if(options.code){
        phones = _.map(phones, phone=>{
            return phone = `(+${options.code})` + phone.replace(/^0/g, '');
        });
    }
    var values = _.concat([], phones, options.emails);
    query.value = {$in: values};
    
    UserContact.find(query).select('').populate({ path: "user_id", select: ''})
    .exec((err, results) => {
        if (err) {
            return next(err);
        }
        var tasks = [];
        var phone_primary = false;
        var email_primary = false;
        var addContact =(user)=>{
            // check contact exists
            _.forEach(phones, phone=>{
                var contact = {
                    value: phone,
                    type : peolpe_enums.UserContactType.phone,
                    ed_user_id: idOwner,
                    user_id: user._id,
                    is_requester: options.is_requester || false,
                    is_primary: !phone_primary
                };
                phone_primary = true;
                tasks.push(addUserContact(contact));
            });

            _.forEach(options.emails, email=>{
                var contact = {
                    value: email,
                    type : peolpe_enums.UserContactType.email,
                    ed_user_id: idOwner,
                    user_id: user._id,
                    is_requester: options.is_requester || false,
                    is_primary: !email_primary
                };
                email_primary = true;
                tasks.push(addUserContact(contact));
            });
            return Promise.all(tasks);
        };
        if(!_.isEmpty(results)){
            var first = results[0];
            // check contact exists
            UserContact.find({ed_user_id: idOwner, is_primary: true, user_id: first.user_id._id}).exec((errPrimary, contacts)=>{
                if(errPrimary){
                    console.error('Find primary contact failued', err);
                }
                if(_.find(contacts,(o)=> { return o.type = peolpe_enums.UserContactType.phone})){
                    phone_primary = true;
                }

                if(_.find(contacts,(o)=> { return o.type = peolpe_enums.UserContactType.email})){
                    email_primary = true;
                }

                // add contact
                addContact(first.user_id).then(result=>{
                    filter_requester(first.user_id);
                    return next(null, first.user_id);
                }).catch(ex=>{
                    return next(null, first.user_id);
                });
            });
            
            
        }else{
            var body = {
                roles: [enums.UserRoles.requester],
                code: options.code || '',
                org_id: options.org_id,
                name: options.name != undefined ? options.name : options.value.replace(/[_\W]+/g, "_"),
                provider: options.provider || 'local',
                provider_data: {}
            };

            if(!_.isEmpty(options.emails)){
                body.email = options.emails.pop();
                email_primary = true;
            }else{
                body.phone = options.phones.pop();
                body.code = options.code,
                phone_primary = true;
            }
            
            add_user({ body: body, req_user: options.user}, (err, user_add)=>{
                if(err){
                    var result = err.toJSON();
                    if(result.code == 11000){
                        User.findOne({email:result.op.email}).exec((errFind, user)=>{
                            if(errFind){
                                return next(errFind);
                            }
                            addContact(user).then(result=>{
                                return next(null, user);
                            }).catch(ex=>{
                                return next(null, user);
                            });
                        });
                    }else{
                        return next(err);
                    }
                }else{
                    addContact(user_add).then(result=>{
                        filter_requester(user_add);
                        return next(null, user_add);
                    }).catch(ex=>{
                        return next(null, user_add);
                    });
                }
            });
        }
    });
};


var addUserContact = (data)=>{
    var tmp_data = require('../../core/controllers/tmp.data.controller');
    return new Promise((resolve, reject)=>{
        var userContact = new UserContact(data),
            valid_contact= require('../validator/user.contact.validator');
        valid_contact.validate_add(userContact, function(err, result){
            if(err){
                return reject();
            }
            
            tmp_data.save('add_contact_user', data.ed_user_id, userContact, userContact, (err, result) =>{
                if(err && err.code != 11000){
                    console.error(err, "save contact user failed");
                }
                return resolve(result);
            });
        });
    });
};

/*
    Find or Add
    @author: khanhpq
 */
exports.findOrAdd = function (req, res, next) {
    req.query.idOwner = Utils.getParentUserId(req.user);
    req.query.req_user = req.user;
    findOrAdd(req.query, function(err, result){
        if(err){
            return next(err);
        }
        res.json(result);
    });
};

/*
    Find or Add
    @author: khanhpq
 */
exports.countTicketsAgent = function (req, res, next) {
    Ticket.count({
        ed_user_id: Utils.getParentUserId(req.user),
        agent_id: req.profile._id
    }, function(err, count) {
        if (err) {
            return next(err);
        }

        res.json({
            tickets: count
        });
    });
};

/**
 * userByID middleware
 * author: khanhpq
 */
exports.userByID = (req, res, next, id) => {
    // check the validity of user id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('people.user.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find user by its id
    User.findById(id).exec((err, user) => {
        if (err){
            return next(err);
        }

        //Check is owner
        if (!user || !_.isEqual(Utils.getParentUserId(user), idOwner)) {
            return next(new TypeError('people.user.id.notFound'));
        }

        if(req.method.toLowerCase() != 'get'){
            if(req.user.roles[0] == enums.UserRoles.agent && req.user._id != id){
                return next(new TypeError('people.user.role.invalid'));
            }
        }

        req.profile = user;
        next();
    });
};
















//'use strict';
////
////  people.user.controller.js
////  handle core system routes
////
////  Created by khanhpq on 2016-01-06.
////  Copyright 2015 Fireflyinnov. All rights reserved.
////
//
///**
// * Module dependencies.
// */
//var _            = require('lodash'),
//    mongoose     = require('mongoose'),
//    moment       = require('moment'),
//    sendmail     = require('../../core/resources/sendmail'),
//    Utils        = require('../../core/resources/utils'),
//    Utils_people = require('../resources/utils'),
//    Utils_elastics = require('../../elastics/resources/utils'),
//    enums        = require('../../core/resources/enums.res'),
//    peolpe_enums = require('../resources/enums.res'),
//    path         = require('path'),
//    config       = require(path.resolve('./config/config')),
//    validate     = require('../validator/user.validator'),
//    translation  = require('../resources/translate.res'),
//    emitter      = require(path.resolve('./config/lib/emitters/event.emitter')),
//    cache        = require(path.resolve('./config/lib/redis.cache')),
//    User         = mongoose.model('User'),
//    Ticket       = mongoose.model('Ticket'),
//    UserContact  = mongoose.model('UserContact');
//
////  ==========
////  = PRIVATE FUNCTIONS AREA =
////  ==========
//
//function filter_requester(user){
//    if(user && user.is_requester){
//        emitter.emit('evt.user.requester_filter', {
//            user: user
//        });
//    }
//};
//
//function add_user(options, next){
//    var body = options.body,
//        is_internal = options.is_internal || false,
//        req_user = options.req_user,
//        user = body,
//        idOwner = Utils.getParentUserId(options.req_user);
//        
//        body.language = options.req_user.language;
//
//    user.ed_parent_id = idOwner;
//    
//    new Promise(function(resolve, reject) {
//        if(body.password){
//            resolve(body.password);
//        }else{
//            User.generateRandomPassphrase().then((new_password) => {
//                resolve(new_password);
//            }).catch((reason) => {
//                return reject(reason);
//            });
//        }
//    }).then(function(new_password) {
//        return new Promise(function(resolve, reject) {
//            user.password = new_password;
//            user.confirmed_password = new_password;
//            user.is_requester = body.roles[0] === enums.UserRoles.requester;
//            user.roles = [body.roles];
//            user.sub_domain = req_user.sub_domain;
//            if(user.is_requester && !body.email){
//                //check contact is email or phone. if contact is phone, create email.
//                if(body.phone){
//                    //create email for user.
//                    //user.email = (body.code || '') + body.phone + config.mailer.from;
//                    var tmp_email = (body.code || '') + body.phone;
//                    user.email = `requester_${tmp_email}@auto-gen.izihelp.com`;
//
//                }else if(body.facebook){
//                    user.email = `requester_${body.facebook}@auto-gen.izihelp.com`;
//                }
//            }
//            
//            var afterSave = function(err, user, raw){
//                if (err) {
//                    return next(err);
//                }
//
//                var value_contact = {
//                    idOwner: idOwner,
//                    is_requester: user.is_requester,
//                    user_id: user._id,
//                    email: body.email,
//                    phone: body.phone,
//                    facebook: body.facebook,
//                    is_primary: true,
//                    code: body.code || undefined
//                };
//                
//                if(raw && raw.lastErrorObject.updatedExisting){
//                    user.is_existed = true;
//                    emitter.emit('evt.user.contact.find_or_add_contact_user', value_contact);
//                    return next(null, user);
//                }
//
//                //add contact to user_contact
//                emitter.emit('evt.user.contact.add_contact_user', value_contact , function(err, result){
//                    if(err){
//                        //console.error(body, "===DEBUG USER ===");
//                        console.error(err, "save contact user fail");
//                    }
//                });
//
//                //add user to Group Support
//                //find group default of owner, after add this user into group
//                if(!user.is_requester){
//                    emitter.emit('evt.group.add_group_user_default', {
//                        idOwner: idOwner,
//                        user_id: user._id
//                    });
//
//                    //Send mai with user's role is admin or agent
//                    //update current_agent_no
//                    emitter.emit('evt.user.setting.update.max_agent', {
//                        idOwner: idOwner,
//                        agent_no: 1,
//                        callback: function(err, result){
//                            if(err){
//                                console.error(err, "update.max_agent fail"); 
//                            }else{
//                                req_user.settings.current_agent_no += 1;
//                            }
//                        }
//                    });
//
//                    //send mail
//                    var data = {
//                        name: user.name,
//                        email: user.email,
//                        new_password: new_password,
//                        sub_domain: req_user.sub_domain,
//                        url: Utils.getFullUrl(req_user)
//                    };
//                    var options = {
//                        template: `modules/people/templates/${req_user.language || "en"}/add-user.html`,
//                        from :  `IZIHelp System <${config.mailer.from}>`,
//                        to: user.email,
//                        subject: translation[req_user.language || "en"].mail.subject
//                    };
//                    sendmail(data, options);
//                    return next(null, user);
//                //add org into requester with domain from email
//                }else{
//                    if(body.email){
//                        emitter.emit('evt.people.org.add_org_requester', {
//                            requester: user,
//                            idOwner: idOwner,
//                            domain: body.email.replace(/.*@/, "")
//                        }, function(err, org){
//                            if(err){
//                                console.error(err, "save add_org_requester fail");
//                                //return next(err);
//                            }
//                            if(org && is_internal){
//                                user.org_id = org._id;
//                            }
//                            return next(null, user);
//                        });
//                    }else{
//                        return next(null, user);
//                    }
//                }
//            };
//
//            //save user
//            delete user._id;
//            user.is_requester = user.hasOwnProperty('is_requester') ? user.is_requester : false;
//            user.profile_image = user.hasOwnProperty('profile_image') ? user.profile_image : 'default.png';
//            user.time_zone = user.hasOwnProperty('time_zone') ? user.time_zone : { id: config.timezone.id, value: config.timezone.value};
//            user.time_format = user.hasOwnProperty('time_format') ? user.time_format : config.timeFormat.h24,
//            user.is_verified = user.hasOwnProperty('is_verified') ? user.is_verified : false,
//            user.is_suspended = user.hasOwnProperty('is_suspended') ? user.is_suspended : false,
//            
//            user.upd_time = +moment.utc();
//            user.add_time = +moment.utc();
//            User.findOneAndUpdate(
//                {
//                    $or:[
//                        {
//                            ed_parent_id: idOwner
//                        },
//                        {
//                            _id: idOwner
//                        }
//                    ],
//                    email: user.email
//                },{
//                    $setOnInsert: user
//                }, 
//                {
//                    passRawResult: true,
//                    upsert: true,
//                    new: true
//            }, afterSave);
//            /*
//            if(user.is_requester){
//                user.save(afterSave);
//            }else{
//                cache.saveAndUpdateCache(idOwner, user._id, user, afterSave);
//            }*/
//        });
//
//    }, function(reason) {
//        next(reason);
//    });
//};
//
//function findOrAdd(options, next){
//    if(!options.value){
//        return next(new TypeError('people.user.contact.value.invalid'));
//    }
//    
//    var idOwner = options.idOwner,
//        query = {
//            value: options.value || '',
//            ed_user_id: idOwner
//        };
//
//    if(options.code){
//        query.value = `(+${options.code})` + options.value.replace(/^0/g, '');
//    }else{
//        if(options.type == peolpe_enums.UserContactType.phone){
//            options.name = options.name != undefined ? options.name : options.value;
//            options.value = `(+84)` + options.value.replace(/^0/g, '');
//            query.value = options.value;
//        }
//    }
//    
//    UserContact.findOne(query)
//        .select('')
//        .populate({
//            path: "user_id",
//            select: '-salt -password'
//        })
//    .exec((err, result) => {
//        if (err) {
//            return next(err);
//        }
//        if(result){
//            return next(null, result.user_id);
//        }else{
//            var body = {
//                roles: [enums.UserRoles.requester],
//                code: options.code || '',
//                name: options.name != undefined ? options.name : options.value.replace(/[_\W]+/g, "_"),
//                provider: options.provider || 'local',
//                provider_data: {}
//            };
//
//            if(options.type == 'email'){
//                //body.email = options.value.indexOf('@') != -1 ? options.value : (options.value + config.mailer.from);
//                body.email = options.value.indexOf('@') != -1 ? options.value : `requester_${options.value}@auto-gen.izihelp.com`;
//            }else{
//                body[options.type || 'email'] = options.value;
//            }
//            
//            add_user({ body: body, req_user: options.req_user}, function(err, result){
//                if (err) {
//                    return next(err);
//                }
//                result.salt = undefined;
//                result.password = undefined;
//                result.is_new = true;
//
//                filter_requester(result);
//
//                return next(null, result);
//            });
//        }
//    });
//};
//
////  ==========
////  = PUBLIC FUNCTIONS AREA =
////  ==========
///**
// * add a new user from internal
// * author : khanhpq
// * params:
//        1. req.user
//        2. {
//             name: "",
//             email: "",
//             roles: ["requester"],
//             phone: 1234557889// if create a requester from a phone number
//        }
// */
//exports.add_internal = (user, body, next) => {
//    add_user({ body: body, req_user: user, is_internal: true}, function(err, result){
//        filter_requester(result)
//        next(err, result);
//    });
//};
//
///**
// * find a user by id from internal
// * author : lamtv
// * id : user's id
// * options : {
// *      select : string,
// *      populate : {
// *          path : string,
// *          select : string
// *      }
// * }
// */
//exports.findById_internal = (id, options, next) => {
//    options = options || {};
//
//    var populate = options.populate || {path:""};
//    var select = options.select;
//
//    User.findById(id)
//        .select(select)
//        .populate(populate)
//    .exec(next);
//};
//
///**
// * add a new user
// * author : khanhpq
// */
//exports.add = [
//    (req, res, next) => {
//        req.body.ed_parent_id = Utils.getParentUserId(req.user);
//
//        if(req.body.roles[0] === enums.UserRoles.requester && req.body.phone){
//
//            if(!req.body.code){
//                return next(new TypeError('people.user.contact.value.code.required'));
//            }
//
//            if(!_.isNumber(req.body.code)){
//                return next(new TypeError('people.user.contact.value.code.must_number'));
//            }
//
//            mongoose.model('Country').count({
//                code: req.body.code
//            }, function (err, count) {
//                if (err) {
//                    return next(err);
//                }
//
//                if (!count) {
//                    return next(new TypeError('people.user.contact.value.code.invalid'));
//                }
//
//                validate(req.body, next);
//            });
//        }else if(req.body.facebook){
//            if(req.body.roles[0] != enums.UserRoles.requester){
//                return next(new TypeError('people.user.roles.invalid'));
//            }
//            var body = {
//                name: req.body.name,
//                facebook: req.body.facebook,
//                is_requester: req.body.is_requester != undefined ? req.body.is_requester : true,
//                roles: req.body.roles
//            };
//            validate(body, next);
//            
//        }else{
//            validate(req.body, next);
//        }
//    },
//    (req, res, next) =>{
//            //set provider for user
//        var body = {
//            roles: req.body.roles,
//            code: req.body.code || undefined,
//            phone: req.body.phone || undefined,
//            facebook: req.body.facebook || undefined,
//            email: req.body.email || undefined,
//            name: req.body.name || '',
//            provider: 'local',
//            provider_data: {}
//        };
//
//        add_user({ body: body, req_user: req.user}, function(err, result){
//            if (err) {
//                if(err.code == 11000 || err.code == 11001){
//                    User.findOne({email: body.email}, (err_, result) => {
//                        err.op = result;
//                        return next(err);
//                    });
//                }else{
//                    return next(err);
//                }
//            }else{
//                filter_requester(result);
//                res.json({
//                    _id: result._id,
//                    is_existed: result.is_existed,
//                    name: result.name,
//                    roles: result.roles,
//                    add_time: result.add_time,
//                    is_requester: result.is_requester
//                });
//            }
//        });
//    }
//];
//
///**
// * show current user
// * author : khanhpq
// */
//exports.read = (req, res) => {
//    var user = req.profile.toObject();
//
//    delete user.ed_parent_id;
////    delete user.sub_domain;
//    delete user.password;
//    delete user.confirmed_password;
//    delete user.salt;
////    delete user.is_requester;
//    delete user.provider;
//    delete user.provider_data;
//    delete user.additional_provider_data;
////    delete user.is_suspended;
////    delete user.is_verified;
//    delete user.provider;
//    delete user.provider_data;
////    delete user.email;
//
//    res.json(user);
//};
//
///**
// * update the current user
// * author : khanhpq
// */
//exports.update = [
//    (req, res, next) => {
//        // remove sensitive data
//        delete req.body.sub_domain;
//        delete req.body.ed_parent_id;
//        delete req.body.password;
//        delete req.body.confirmed_password;
//        delete req.body.salt;
//        delete req.body.is_requester;
//        delete req.body.provider;
//        delete req.body.provider_data;
//        delete req.body.email;
//        delete req.body.__v;
//
//        //check role of this user
//        if(req.profile.is_requester || req.profile.roles[0] === enums.UserRoles.requester ){
//            delete req.body.roles;
//        }
//
//        if(req.body.roles){
//            req.body.roles = [req.body.roles[0]];
//
//            if(req.profile.roles[0] === enums.UserRoles.owner ){
//                return next(new TypeError('people.user.roles.do_not_change_role_owner'));
//            }
//
//            if(!Array.isArray(req.body.roles)){
//                return next(new TypeError('people.user.roles.is_array'));
//            }
//
//            if(_.indexOf([enums.UserRoles.admin, enums.UserRoles.owner, enums.UserRoles.agent], req.profile.roles[0]) != -1 &&  req.body.roles[0] == enums.UserRoles.requester){
//                return next(new TypeError('people.user.roles.invalid'));
//            }
//            
//            if(Utils_people.checkRoleEditUser(req.user, req.profile) === false){
//                return next(new TypeError('people.user.roles.invalid'));
//            }
//        }
//
//        //check is_verified
//        if(req.profile.is_verified){
//            delete req.body.is_verified;
//        }
//        // Merge existing user
//        req.profile = _.assign(req.profile, req.body);
//
//        //check body has org_id
//        //if org_id = "", set org_is = null
//        if(req.body.org_id == ""){
//           req.profile.org_id = null;
//        }
//        var profile = req.profile.toObject();
//        
//        profile.user_id = req.user._id;
//        profile.ed_parent_id = Utils.getParentUserId(req.user);
//
//        validate(profile, next);
//    },
//    (req, res, next) => {
//        var afterUpdate = function(err){
//            if(err){
//                console.error(err, `cache user fail`);
//            }
//            
//            filter_requester(req.profile);
//
//            req.profile.ed_parent_id = undefined;
//            req.profile.sub_domain = undefined;
//            req.profile.password = undefined;
//            req.profile.confirmed_password = undefined;
//            req.profile.salt = undefined;
//            req.profile.provider = undefined;
//            req.profile.provider_data = undefined;
//            req.profile.additional_provider_data = undefined;
//            req.profile.is_suspended = undefined;
//            req.profile.is_verified = undefined;
//            req.profile.provider = undefined;
//            req.profile.provider_data = undefined;
//            res.json(req.profile);
//        };
//
//        if(req.profile.is_requester){
//            req.profile.save(afterUpdate);
//        }else{
//            cache.saveAndUpdateCache(Utils.getParentUserId(req.user), req.profile._id, req.profile, afterUpdate);
//        }
//    }
//];
//
///**
// * suspend a user
// * author : khanhpq
// */
//exports.toggle_suspended = (req, res, next) =>{
//    
//    if(Utils_people.checkRoleEditUser(req.user, req.profile) === false){
//        return next(new TypeError('people.user.roles.invalid'));
//    }
//    
//    var user = req.profile,
//    idOwner = Utils.getParentUserId(req.user);
//
//    user.is_suspended = !user.is_suspended;
//
//    var afterSuspended = function(err){
//        if (err) {
//            return next(err);
//        }
//
//        if(!user.is_requester){
//            //update group_user
//            emitter.emit('evt.user.group_user_toggle_suspended', {
//                idOwner: idOwner,
//                user: user
//            });
//        }
//        filter_requester(user);
//        res.json({
//            _id: user._id,
//            name: user.name,
//            roles: user.roles
//        });
//    };
//
//    if(user.is_requester){
//        user.save(afterSuspended);
//    }else{
//        cache.saveAndUpdateCache(idOwner, user._id, user, afterSuspended);
//    }
//};
//
//
///*
//    Get all user
//    @author: khanhpq
// */
//exports.list = function (req, res, next) {
//    var idOwner = Utils.getParentUserId(req.user),
//        roles = null,
//        params = {
//            query: {
//                is_suspended: false,
//                $or: [
//                    {
//                        ed_parent_id: idOwner
//                    },{
//                        _id: idOwner
//                    }
//                ]
//            },
//            select: 'name roles add_time _id org_id email is_suspended',
//            populate: {
//                include: 'org_id',
//                fields: '-ed_parent_id'
//            },
//            skip: req.query.skip,
//            sort_order: req.query.sort_order,
//            limit: req.query.limit
//        };
//    //suspended: 2 get all
//    if(req.query.suspended === '2'){
//        delete params.query.is_suspended;
//    }else if(req.query.suspended === '1'){
//        params.query.is_suspended = true;
//    }
//    
//    if(req.query.role && req.query.role != ""){
//        roles = _.split(req.query.role, '-');
//    }
//    
//    if(roles){
//        params.query.roles = {
//            $in: roles
//        };
//    }
//    /*
//    if([enums.UserRoles.admin, enums.UserRoles.owner].indexOf(req.user.roles[0]) != -1){
//        if(roles){
//            params.query.roles = {
//                $in: roles
//            };
//        }
//    }else{ // role is agent, get requesters or agents
//        roles = _.pull(roles, enums.UserRoles.admin, enums.UserRoles.owner);
//        params.query.roles = roles;
//        //params.query.roles = enums.UserRoles.requester;
//    }
//    */
//    if(req.query.name){
//        if (Utils.isValidObjectId(req.query.name)) {
//            params.query._id = req.query.name;
//        }else{
//            req.query.name = req.query.name.replace(/(\W|\D])/g, "\\$1");
//            params.query.name = new RegExp(decodeURI(req.query.name), "i");
//        }
//    }
//
//    Utils.findByQuery(User, params).exec(function (err, users) {
//        if (err) {
//            return next(err);
//        }
//
//        res.json(users);
//    });
//};
//
///*
//    Count all user
//    @author: khanhpq
// */
//exports.count = function (req, res, next) {
//    var idOwner = Utils.getParentUserId(req.user),
//        query   = {
//            is_suspended: false,
//        },
//        roles = [];
//
//    //suspended: 2 get all
//    if(req.query.suspended === '2'){
//        delete query.is_suspended;
//    }else if(req.query.suspended === '1'){
//        query.is_suspended = true;
//    }
//    
//    if(req.query.roles && req.query.roles != ""){
//        roles = _.split(req.query.roles, '-');
//    }else{
//        return next(new TypeError('people.user.count.not_roles'));
//    }
//
//    var tasks = [];
//    roles.forEach((role) => {
//        var promise = new Promise((resolve, reject) => {
//
//            if(role == enums.UserRoles.owner) {
//                query['$or'] = [{
//                    _id: idOwner
//                }];
//            }else{
//               query['$or'] = [{
//                    ed_parent_id: idOwner
//                },{
//                    _id: idOwner
//                }];
//            }
//
//            query.roles = {
//                $in: [role]
//            };
//
//            User.count(query, function(err, count) {
//                if (err) {
//                    return reject(err);
//                }
//                return resolve({
//                    role: role,
//                    count: count
//                });
//            });
//        });
//        tasks.push(promise);
//    });
//
//    Promise.all(tasks).then(function(count) {
//        var data = {};
//        if(count.length > 0){
//            count.forEach((item) => {
//                data[item.role] = item.count;
//            });
//        }
//        res.json(data);
//
//    }, function(reason) {
//        return next(reason);
//    });
//};
//
///*
//    Find or Add internal
//    @author: khanhpq
//    options: {
//        idOwner: "",
//        value: "",
//        name: '',
//        code: "",
//        provider: "local",
//        type: 'email'
//        req_user: req.user
//    }
// */
//exports.findOrAdd_internal = (options, next) => {
//    findOrAdd(options, next);
//};
//
///*
//    @author: khanhpq
// */
//exports.deleteOrSuspendRequester = function (req, res, next) {
//    var ids = req.query.ids,
//        is_delete = req.query.is_delete,
//        is_suspend = req.query.is_suspend,
//        idOwner = Utils.getParentUserId(req.user);
//    if(!Array.isArray(ids)){
//        return next(new TypeError('people.user.ids.invalid'));
//    }
//
//    var tasks = [],
//        listRequesters = [];
//    ids.forEach((id) => {
//        var promise = new Promise((resolve, reject) => {
//
//            User.findOne({
//                ed_parent_id: idOwner,
//                _id: id,
//                roles: [enums.UserRoles.requester]
//            }).exec((err, requester)=>{
//                if(err){
//                    return reject(err);
//                }
//
//                if(!requester){
//                    return resolve(null);
//                }
//
//                if(is_delete === "1"){
//                    var requester_id = requester._id,
//                        requesterElastic = requester.toObject();
//                    requester.remove(function (err) {
//                        if (err) {
//                            return reject(err);
//                        }
//                        listRequesters.push({
//                            delete: {
//                                _index: `profile-${idOwner}`,
//                                _type: 'requester',
//                                _id: requesterElastic._id
//                            }
//                        });
//                        console.log(listRequesters);
//                        emitter.emit('evt.user.remove_user_filter', {user_id: requester_id});
//
//                        UserContact.remove({user_id: requester_id}, (err, result) =>{
//                            if(err){
//                                return reject(err);
//                            }
//                            return resolve(requester);
//                        });
//                    });
//
//                }else{
//                    if(is_suspend){
//                        requester.is_suspended = is_suspend == "1";
//                    }else{
//                        requester.is_suspended = !requester.is_suspended;
//                    }
//
//                    requester.save((err) => {
//                        if (err) {
//                            return reject(err);
//                        }
//                        filter_requester(requester);
//                        resolve(requester);
//                    });
//                }
//            });
//        });
//        tasks.push(promise);
//    });
//
//    Promise.all(tasks).then(function(results) {
//        if(listRequesters.length > 0){
//            Utils_elastics.sendElastics(listRequesters);
//        }
//        res.json({is_success: true});
//    }, function(reason) {
//        return reject(reason);
//    });
//}
//
///*
//    Delete or Suspend Users, and transfer ticket after delete
//    @author: khanhpq
// */
//exports.deleteUser = function (req, res, next) {
//    var idOwner = Utils.getParentUserId(req.user),
//        agent_delete_id = req.params.agent_delete,
//        agent_assign_id = req.params.agent_assign  === "0" ? idOwner : req.params.agent_assign;
//
//    if (!mongoose.Types.ObjectId.isValid(agent_delete_id) || !mongoose.Types.ObjectId.isValid(agent_assign_id)) {
//        return next(new TypeError('people.user.id.objectId'));
//    }
//
//    if(agent_delete_id == agent_assign_id){
//        return next(new TypeError('people.user.id.same'));
//    }
//
//    new Promise(function(resolve, reject) {
//        var query = {_id: agent_assign_id};
//
//        if(agent_assign_id != idOwner){
//            query['ed_parent_id'] = idOwner;
//        }
//
//        User.findOne(query).exec((err, result) =>{
//            if (err) {
//                return reject(err);
//            }
//
//            if (!result) {
//                return reject(new TypeError('people.user.agent_assign_id.not_found'));
//            }
//            resolve({agent_assign: result});
//        });
//    }).then(function(data) {
//        return new Promise(function(resolve, reject) {
//           User.findOne({
//                ed_parent_id: idOwner,
//                _id: agent_delete_id
//            })
//            .exec((err, result) =>{
//                if (err) {
//                    return reject(err);
//                }
//
//                if (!result) {
//                    return reject(new TypeError('people.user.agent_delete_id.not_found'));
//                }
//                data.agent_delete = result;
//                resolve(data);
//            });
//        });
//
//    }).then(function(data) {
//        return new Promise(function(resolve, reject) {
//            if(Utils_people.checkRoleEditUser(req.user, data.agent_delete) === false){
//                return next(new TypeError('people.user.roles.invalid'));
//            }
//
//            /*if(data.agent_delete.is_suspended == false){
//                return next(new TypeError('people.user.is_suspended.invalid'));
//            }*/
//            res.json({is_success: true});
//            emitter.emit('evt.user.assign_ticket', {
//                req_user: req.user,
//                agent_delete: data.agent_delete,
//                agent_assign: data.agent_assign,
//                idOwner: idOwner,
//                user_id: data.agent_delete._id
//            }, function(err, result){
//                if(err){
//                    console.error(err, "assign_ticket user fail");
//                }
//                if(result === true){
//                    emitter.emit('evt.user.setting.update.max_agent', {
//                        idOwner: idOwner,
//                        agent_no: -1,
//                        callback: function(err, result){
//                            if(err){
//                                console.error(err, "update.max_agent fail"); 
//                            }else{
//                                req.user.settings.current_agent_no -= 1;
//                            }
//                        }
//                    });
//                }
//                return;
//
//            });
//        });
//
//    }, function(reason) {
//        next(reason);
//    });
//};
//
///*
//    Find or Add internal
//    Find or Update contact, and add a new user
//    @author: khanhpq
//    options: {
//        ed_user_id: "",
//        org_id: ''
//        phones: [],
//        code: "", if exists phone
//        name: '',
//        emails: []
//        provider: "local",
//        type: 'email'
//        user: req.user
//    }
// */
//exports.findAndUpdateOrAdd_internal = (options, next) => {
//    if(!options.name || (!options.phones && !options.emails)){
//        return next(new TypeError('people.user.contact.value.required'));
//    }
//    
//    var idOwner = options.ed_user_id,
//        query = {
//            ed_user_id: idOwner
//        };
//        
//    var phones = options.phones;
//    if(options.code){
//        phones = _.map(phones, phone=>{
//            return phone = `(+${options.code})` + phone.replace(/^0/g, '');
//        });
//    }
//    var values = _.concat([], phones, options.emails);
//    query.value = {$in: values};
//    
//    UserContact.find(query).select('').populate({ path: "user_id", select: ''})
//    .exec((err, results) => {
//        if (err) {
//            return next(err);
//        }
//        var tasks = [];
//        var phone_primary = false;
//        var email_primary = false;
//        var addContact =(user)=>{
//            // check contact exists
//            _.forEach(phones, phone=>{
//                var contact = {
//                    value: phone,
//                    type : peolpe_enums.UserContactType.phone,
//                    ed_user_id: idOwner,
//                    user_id: user._id,
//                    is_requester: options.is_requester || false,
//                    is_primary: !phone_primary
//                };
//                phone_primary = true;
//                tasks.push(addUserContact(contact));
//            });
//
//            _.forEach(options.emails, email=>{
//                var contact = {
//                    value: email,
//                    type : peolpe_enums.UserContactType.email,
//                    ed_user_id: idOwner,
//                    user_id: user._id,
//                    is_requester: options.is_requester || false,
//                    is_primary: !email_primary
//                };
//                email_primary = true;
//                tasks.push(addUserContact(contact));
//            });
//            return Promise.all(tasks);
//        };
//        if(!_.isEmpty(results)){
//            var first = results[0];
//            // check contact exists
//            UserContact.find({ed_user_id: idOwner, is_primary: true, user_id: first.user_id._id}).exec((errPrimary, contacts)=>{
//                if(errPrimary){
//                    console.error('Find primary contact failued', err);
//                }
//                if(_.find(contacts,(o)=> { return o.type = peolpe_enums.UserContactType.phone})){
//                    phone_primary = true;
//                }
//
//                if(_.find(contacts,(o)=> { return o.type = peolpe_enums.UserContactType.email})){
//                    email_primary = true;
//                }
//
//                // add contact
//                addContact(first.user_id).then(result=>{
//                    filter_requester(first.user_id);
//                    return next(null, first.user_id);
//                }).catch(ex=>{
//                    return next(null, first.user_id);
//                });
//            });
//            
//            
//        }else{
//            var body = {
//                roles: [enums.UserRoles.requester],
//                code: options.code || '',
//                org_id: options.org_id,
//                name: options.name != undefined ? options.name : options.value.replace(/[_\W]+/g, "_"),
//                provider: options.provider || 'local',
//                provider_data: {}
//            };
//
//            if(!_.isEmpty(options.emails)){
//                body.email = options.emails.pop();
//                email_primary = true;
//            }else{
//                body.phone = options.phones.pop();
//                body.code = options.code,
//                phone_primary = true;
//            }
//            
//            add_user({ body: body, req_user: options.user}, (err, user_add)=>{
//                if(err){
//                    var result = err.toJSON();
//                    if(result.code == 11000){
//                        User.findOne({email:result.op.email}).exec((errFind, user)=>{
//                            if(errFind){
//                                return next(errFind);
//                            }
//                            addContact(user).then(result=>{
//                                return next(null, user);
//                            }).catch(ex=>{
//                                return next(null, user);
//                            });
//                        });
//                    }else{
//                        return next(err);
//                    }
//                }else{
//                    addContact(user_add).then(result=>{
//                        filter_requester(user_add);
//                        return next(null, user_add);
//                    }).catch(ex=>{
//                        return next(null, user_add);
//                    });
//                }
//            });
//        }
//    });
//};
//
//
//var addUserContact = (data)=>{
//    var tmp_data = require('../../core/controllers/tmp.data.controller');
//    return new Promise((resolve, reject)=>{
//        var userContact = new UserContact(data),
//            valid_contact= require('../validator/user.contact.validator');
//        valid_contact.validate_add(userContact, function(err, result){
//            if(err){
//                return reject();
//            }
//            
//            tmp_data.save('add_contact_user', data.ed_user_id, userContact, userContact, (err, result) =>{
//                if(err && err.code != 11000){
//                    console.error(err, "save contact user failed");
//                }
//                return resolve(result);
//            });
//        });
//    });
//};
//
///*
//    Find or Add
//    @author: khanhpq
// */
//exports.findOrAdd = function (req, res, next) {
//    req.query.idOwner = Utils.getParentUserId(req.user);
//    req.query.req_user = req.user;
//    findOrAdd(req.query, function(err, result){
//        if(err){
//            return next(err);
//        }
//        res.json(result);
//    });
//};
//
///*
//    Find or Add
//    @author: khanhpq
// */
//exports.countTicketsAgent = function (req, res, next) {
//    Ticket.count({
//        ed_user_id: Utils.getParentUserId(req.user),
//        agent_id: req.profile._id
//    }, function(err, count) {
//        if (err) {
//            return next(err);
//        }
//
//        res.json({
//            tickets: count
//        });
//    });
//};
//
///**
// * userByID middleware
// * author: khanhpq
// */
//exports.userByID = (req, res, next, id) => {
//    // check the validity of user id
//    if (!mongoose.Types.ObjectId.isValid(id)) {
//        return next(new TypeError('people.user.id.objectId'));
//    }
//
//    var idOwner = Utils.getParentUserId(req.user);
//    // find user by its id
//    User.findById(id).exec((err, user) => {
//        if (err){
//            return next(err);
//        }
//
//        //Check is owner
//        if (!user || !_.isEqual(Utils.getParentUserId(user), idOwner)) {
//            return next(new TypeError('people.user.id.notFound'));
//        }
//
//        //if(_.indexOf([enums.UserRoles.admin, enums.UserRoles.owner], user.roles[0]) != -1 && req.user.roles[0] == enums.UserRoles.agent && req.user._id != id){
//        if(req.method.toLowerCase() != 'get'){
//            if(req.user.roles[0] == enums.UserRoles.agent && req.user._id != id){
//                return next(new TypeError('people.user.role.invalid'));
//            }
//        }
//
//        req.profile = user;
//        next();
//    });
//};
