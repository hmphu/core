'use strict';
//
//  user.contact.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2016-01-06.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    enums = require('../resources/enums.res'),
    path = require('path'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    enums_global = require('../../core/resources/enums.res'),
    User = mongoose.model('User'),
    UserContact = mongoose.model('UserContact'),
    people_enums = require('../resources/enums.res'),
    validator = require('../validator/user.contact.validator'),
    utils_contact = require('../resources/utils'),
    Utils = require('../../core/resources/utils');


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

var add_contact = function(options, next){
    var body = options.body,
        idOwner = options.idOwner,
        user_id = options.user_id,
        is_requester = options.is_requester;

    new Promise(function(resolve, reject) {
        if(body.type === enums.UserContactType.phone){
            if(!body.code){
                return reject(new TypeError('people.user.contact.value.code.required'));
            }

//            if (body.value.search(/^[0-9]{1,50}$/) != 0){
//                return next(new TypeError("people.user.contact.value.phone.invalid"));
//            }
            if (body.value && body.value.length > 50){
               return reject(new TypeError("people.user.contact.value.phone.to_long"));
            }

            if (body.value == "" || body.value == null || body.value == undefined){
               return reject(new TypeError("people.user.contact.value.phone.invalid"));
            }

            if (!Number.isInteger(body.code)){
                return reject(new TypeError("people.user.contact.value.code.must_is_number"));
            }

            mongoose.model('Country').count({
                code: body.code
            }, function (err, count) {
                if (err) {
                    return reject(err);
                }

                if (!count) {
                    return reject(new TypeError('people.user.contact.value.code.invalid'));
                }

                resolve();
            });
        }else{
            resolve();
        }
    }).then(function() {
        return new Promise(function(resolve, reject) {

            UserContact.findOne({
                ed_user_id: idOwner,
                user_id: user_id,
                type: body.type,
                is_primary: true
            }, (err, userContact) => {

                if (err) {
                    return next(err);
                }

                var contact = new UserContact({
                    value: body.value,
                    type: body.type,
                    ed_user_id: idOwner,
                    user_id: user_id,
                    is_requester: is_requester || false,
                    is_primary: body.is_primary || false
                });

                if(body.type === enums.UserContactType.phone){
                    if(contact.value && body.code == 84){
                        contact.value = '(+84)' + contact.value.replace(/^0/g, '');
                    }else{
                        if(body.code != '' && body.code != null && body.code != undefined){
                            contact.value = '(+' + body.code + ')' + contact.value;
                        }else{
                            contact.value = utils_contact.convertPhoneValue(contact.value);
                        }
                    }
                }
                
                var is_user_contact_null = false;
                if (!userContact) {
                    contact.is_primary = true;
                    is_user_contact_null = true;
                }

                validator.validate_add(contact, function(err, result){
                    if (err) {
                        return next(err);
                    }

                    contact.save((err) => {
                        if (err) {
                            return next(err);
                        }

                        //if body.is_primary = true, update email of requester and update old user_contact.is_primary = false
                        if (contact.is_primary && userContact) {
                            userContact.is_primary = false;
                            userContact.save((err) => {
                                if (err) {
                                    console.error(err, "update is_primary contact fail");
                                    return;
                                }
                            });

                            if(!options.is_primary || is_user_contact_null){
                                //update mail
                                if (contact.type == people_enums.UserContactType.email) {
                                    require(path.resolve('./config/lib/emitters/event.emitter')).emit('evt.user.edit.edit_mail', {
                                        is_logout: contact.user_id == options.req.user._id ? true : false,
                                        email: contact.value,
                                        user_id: contact.user_id,
                                        req: options.req
                                    });
                                }
                            }
                        }else{
                            if(is_user_contact_null){
                                if (contact.type == people_enums.UserContactType.email) {
                                    require(path.resolve('./config/lib/emitters/event.emitter')).emit('evt.user.edit.edit_mail', {
                                        is_logout: contact.user_id == options.req.user._id ? true : false,
                                        email: contact.value,
                                        user_id: contact.user_id,
                                        req: options.req
                                    });
                                }
                            }
                        }
                        filter_requester(options.req.user);
                        next(null, {
                            _id: contact._id,
                            is_primary: contact.is_primary,
                            value: contact.value,
                            type: contact.type
                        });
                    });
                });
            });
        });

    }, function(reason) {
        next(reason);
    });
};

exports.getListInternal = (idOwner, user_id, type, next)=>{
    var params = {
        query: {
            ed_user_id: idOwner,
            user_id: user_id
        },
        sort: 'add_time'
    };
    var arr_type = [];

    if (type) {

        _.split(type, '-').forEach(function(o){
            arr_type.push(enums.UserContactType[o]);
        });

        if(type && type != ""){
            params.query.type = {
                $in: arr_type
            };
        }
        arr_type = _.split(type, '-');

    }else{
        arr_type = _.keys(enums.UserContactType);
    }

    Utils.findByQuery(UserContact, params).exec(function (err, contacts) {
        if (err) {
            return next(err);
        }
        var result = {};
        arr_type.forEach(function(t){
            var tmp = [];
            contacts.forEach(function(o){
                if(enums.UserContactType[t] == o.type){
                    tmp.push(o);
                }
            });
            result[t] = tmp;
        });
        return next(null, result);
    });
}
//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

/**
 *
 * author : khanhpq
 */
exports.add = (req, res, next) => {
    var options ={
        is_primary: false,
        idOwner: Utils.getParentUserId(req.user),
        user_id: req.profile._id,
        is_requester: req.profile.is_requester || false,
        body: req.body,
        req: req
    };
    
    if(utils_contact.checkRoleEditUser(req.user, req.profile) === false){
            return next(new TypeError('people.user.roles.invalid'));
    }
    
    add_contact(options, function(err, result){
        if(err){
            return next(err);
        }
        res.json(result);
    });
}

/**
 *
 * author : khanhpq
 */
exports.add_internal = (options, next) => {
    options.is_primary = true;
    add_contact(options, next);
};

/**
 *
 * author : khanhpq
 * get list contact
 */
exports.list = (req, res, next) => {
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            user_id: req.params.userId
        },
        sort: 'add_time',
        skip: req.query.skip || 0,
        sort_order: req.query.sort_order || 1,
        limit: req.query.limit || 0
    };

    var arr_type = [];
    //type=email-phone-facebook
    if (req.query.type) {
        
        _.split(req.query.type, '-').forEach(function(o){
            arr_type.push(enums.UserContactType[o]);
        });
        
        if(req.query.type && req.query.type != ""){
            params.query.type = {
                $in: arr_type
            };
        }
        arr_type = _.split(req.query.type, '-');
        
    }else{
        arr_type = _.keys(enums.UserContactType);
    }
    
    Utils.findByQuery(UserContact, params).exec(function (err, contacts) {
        if (err) {
            return next(err);
        }
        var result = {};
        arr_type.forEach(function(t){
            var tmp = [];
            contacts.forEach(function(o){
                if(enums.UserContactType[t] == o.type){
                    tmp.push(o);
                }
            });
            result[t] = tmp;
        });
        res.json(result);
    });
};

/**
 *
 * author : khanhpq
 */
exports.delete = (req, res, next) => {

    if(utils_contact.checkRoleEditUser(req.user, req.profile) === false){
            return next(new TypeError('people.user.roles.invalid'));
    }
    
    var contact = req.contact;
    if (contact.is_primary && contact.type != people_enums.UserContactType.extension) {
        return next(new TypeError('people.user.contact.primary.invalid'));
    }

    contact.remove(function (err) {
        if (err) {
            return next(err);
        }
        filter_requester(req.user);
        res.json({
            is_succes: true
        });
    });

};

/**
 *
 * author : khanhpq
 * only update primary
 */
exports.update = (req, res, next) => {
    
    var contact = req.contact,
        body = req.body;
    
//    if(contact.type == people_enums.UserContactType.extension){
//        return next(new TypeError('people.user.contact.type.invalid'));
//    }

    if(utils_contact.checkRoleEditUser(req.user, req.profile) === false){
            return next(new TypeError('people.user.roles.invalid'));
    }
    
    //update primary
    if(req.body.is_primary != undefined && req.body.is_primary){
        UserContact.update({
            ed_user_id: contact.ed_user_id,
            user_id: contact.user_id,
            type: contact.type
        }, {
            is_primary: false,
            upd_time: +moment.utc()
        }, {
            multi: true
        }, function (err, result) {

            if (err) {
                return next(err);
            }

            if (!result) {
                return next(new TypeError('people.user.contact.update_fail'));
            }

            contact.is_primary = true;
            contact.save((err) => {
                if (err) {
                    return next(err);
                }

                //update mail
                if (contact.type == people_enums.UserContactType.email) {
                    require(path.resolve('./config/lib/emitters/event.emitter')).emit('evt.user.edit.edit_mail', {
                        is_logout: contact.user_id == req.user._id ? true : false,
                        email: contact.value,
                        user_id: contact.user_id,
                        req: req
                    });
                }

                res.json(contact);
            });
        });
    //update value
    }else{
        if(contact.type === enums.UserContactType.phone){
            if(contact.value && body.code == 84){
                contact.value = '(+84)' + body.value.replace(/^0/g, '');
            }else{
                contact.value = '(+' + (body.code || '84') + ')' + body.value;
            }
        }else{
            contact.value = body.value;
        }
        
//        contact.value = body.value;
        validator.validate_update(contact, function(err, result){
            if (err) {
                return next(err);
            }            
            contact.save((err) => {
                if (err) {
                    return next(err);
                }

                if(contact.is_primary === true && contact.type === enums.UserContactType.email){
                    require(path.resolve('./config/lib/emitters/event.emitter')).emit('evt.user.edit.edit_mail', {
                        is_logout: contact.user_id == req.user._id ? true : false,
                        email: contact.value,
                        user_id: contact.user_id,
                        req: req
                    });
                }
                filter_requester(req.user);
                res.json(contact);
            });
        });
    }
};

/**
 *
 * author : vupl
 * only update primary
 */
exports.findContact = (data, next) => {
    var query = {
        ed_user_id: data.ed_user_id,
        type: data.type,
        value: data.value,
        user_id: data.user_id
    };

    UserContact.findOne(query, (err, result) => {
        if (err) {
            return next(err);
        }
        return next(null, result);
    })
}

/**
 *
 * author : lamtv
 * find a contact by query
 * queries : {
 *      query : query
 *      populate : population,
 *      select : select
 * }
 */
exports.findOneByQuery = (params, next) => {
    var query = params.query,
        populate = params.populate || {
            path: ""
        },
        select = params.select;

    UserContact.findOne(query)
        .select(select)
        .populate(populate)
        .exec((err, result) => {
            if (err) {
                return next(err);
            }
            return next(null, result);
        });
}

/**
 *
 * author : lamtv
 * find contacts by query
 * queries : {
 *      query : query
 *      populate : population,
 *      select : select
 * }
 */
exports.findByQuery = (params, next) => {
    var query = params.query,
        populate = params.populate || {
            path: ""
        },
        select = params.select;

    UserContact.find(query)
        .select(select)
        .populate(populate)
        .exec((err, result) => {
            if (err) {
                return next(err);
            }
            return next(null, result);
        });
}

/**
 *
 * author : khanhpq
 */
exports.contactId = (req, res, next, id) => {
    // check the validity of contact id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('people.user.contact.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);

    // find contact by its id
    UserContact.findById(id).exec((err, contact) => {
        if (err) {
            return next(err);
        }

        //Check is owner
        if (!contact || !_.isEqual(contact.ed_user_id, idOwner)) {
            return next(new TypeError('people.user.contact.id.notFound'));
        }

        req.contact = contact;
        next();
    });
};

/**
 *
 * author : khanhpq
 */
exports.userId = (req, res, next, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('people.user.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);

    User.findById(id).exec((err, user) => {
        if (err) {
            return next(err);
        }

        //Check is owner
        if (!user || !_.isEqual(user.ed_user_id, idOwner)) {
            return next(new TypeError('people.user.id.notFound_'));
        }
        
        if(_.indexOf([enums.UserRoles.admin, enums.UserRoles.owner], user.roles[0]) != -1 && req.user.roles[0] == enums.UserRoles.agent && req.user._id != id){
            return next(new TypeError('people.user.role.invalid'));
        }

        if(req.user.roles[0] == enums.UserRoles.agent && user.roles[0] != enums.UserRoles.requester){
            return next(new TypeError('people.user.contact.roles.invalid'));
        }
        
        next();
    });
};
