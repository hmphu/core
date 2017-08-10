'use strict';
//
//  user.delete.event.js
//  handle user.delete events
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    translation = require('../resources/translate.res'),
    Group = mongoose.model('Group'),
    utils = require('../../core/resources/utils'),
    utilsElastics = require('../../elastics/resources/utils'),
    GroupUser = mongoose.model('GroupUser'),
    UserContact = mongoose.model('UserContact'),
    UserFbAccount = mongoose.model('UserFbAccount'),
    ticketController = require('../../ticket/controllers/ticket.controller'),
    enums_biz = require('../../biz.rule/resources/enums'),
    enums_ticket = require('../../ticket/resources/enums'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    User = mongoose.model('User'),
    CustomSetting = mongoose.model('CustomSetting'),
    UserLogin = mongoose.model('UserLogin'),
    Sessions = mongoose.model('Sessions'),
    Sessions = mongoose.model('Sessions'),
    Ticket = mongoose.model('Ticket'),
    FilterUserView = mongoose.model('FilterUserView'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    ticketEnums = require('../../ticket/resources/enums'),
    socketIO = require(path.resolve('./config/lib/socket.io')),
    notifyTimeout = undefined;

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
var biz_rules = [mongoose.model('Trigger'), mongoose.model('Automation'), mongoose.model('Macro'), mongoose.model('Sla'), mongoose.model('ViewTicket'), mongoose.model('ViewUser')];

function removeSession(options){
    return new Promise((resolve, reject) => {
        console.log('=======DELETE ALL SESSIONS=======');
        //find all session
        UserLogin.find({
            ed_user_id : options.idOwner,
            user_id: options.agent_delete._id
        },(err, results) => {

            if (err) {
                console.error(err);
                return;
            }

            var sessionIds = results.map((result) => {
                return result.session_id
            });

            Sessions.remove({ _id : {
                $in : sessionIds
            }}, (removeErr) => {
                if (removeErr) {
                    console.error(removeErr);
                    return;
                }

                sessionIds.forEach((sid) => {

                    socketIO.emit('/core', sid, {
                        topic : 'izi-core-client-signout',
                        payload : {
                            kicked : 'concurrent'
                        }
                    });
                });
            });

            UserLogin.remove({ session_id : {
                $in : sessionIds
            }}, (removeErr) => {
                if (removeErr) {
                    console.error(removeErr);
                }
            });
            resolve(options);
        });
    });
}

function deleteUser(options){
    console.log('=======DELETE USER ASSIGN TICKET=======');
    return ((resolve, reject) => {
        var agent_delete = options.agent_delete,
            agent_elastics = options.agent_delete.toObject();
        User.remove({_id: agent_delete._id}, (err) => {
            if(err){
                console.error(err, "Delete user fail, _id: " + agent_delete._id);
                return reject("Delete user fail");
            }
            var data_elastics = [
                {
                    delete: {
                        _index: `profile-${options.idOwner}`,
                        _type: 'agent',
                        _id: agent_elastics._id
                    }
                }
            ];
            utilsElastics.sendElastics(data_elastics);
            FilterUserView.remove({ user_id: agent_delete._id}, (removeErr) => {
                if (removeErr) {
                    console.error(removeErr);
                }
            });
        
            options.delete_user_success = true;
            //find group of user_assign
            GroupUser.findOne({user_id: options.agent_assign._id, is_default: true}).exec((err, result)=>{
                if(err){
                    console.error(err, "Find group_user fail, _id: " + options.agent_assign._id);
                    return reject("Find group_user fail");
                }
                options.group_id = result.group_id;
                return resolve(options);
            });
        });
    });
};

function updateAllTicket(options){
    console.log('=======ASSIGN TICKET TO USER=======');
    return new Promise((resolve, reject) => {
        var tasks = [];
        Ticket.find({
            ed_user_id: options.idOwner,
            agent_id: options.agent_delete._id,
            $or: [
                {
                    status:  { $ne: ticketEnums.TicketStatus.Closed }
                },{
                    is_delete: false,
                }
            ]
        }).exec((err, tickets)=>{
            if(err){
                return reject(err);
            }

            tickets.forEach((ticket) => {
                var promise = new Promise((resolve_, reject_) => {
                    var oldTicket = ticket.toObject();
                    var ticket_new = ticket;
                    ticket_new.group_id = options.group_id;
                    ticket_new.agent_id = options.agent_assign._id;

                    ticketController.editInternal({ ed_user_id: options.idOwner }, ticket_new, oldTicket, options.req_user, (errTicket, resultTicket) =>{
                        if(errTicket){
                            return reject_(errTicket);
                        }

                        /*rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-edit-ticket', payload: {
                            ticket: ticket_new,
                            oldTicket: oldTicket,
                            user: {
                                "_id" : options.req_user._id,
                                "name": options.req_user.name,
                                "ed_parent_id": options.idOwner,
                                "sub_domain": options.req_user.sub_domain
                            }
                        }});*/

                        return resolve_(true);
                    });
                });
                tasks.push(promise);
            });

            Promise.all(tasks).then(function(result) {
                return resolve(options);
            }, function(reason) {
                return reject(reason);
            });
        });
    });
};

function deleteAllBizRuleOnly(options){
    console.log('=======DELETE BIZRULE=======');
    return new Promise((resolve, reject) => {
        var tasks = [];
        biz_rules.forEach((biz_rule) => {
            var promise = new Promise((resolve_, reject_) => {
                biz_rule.remove({user_id: options.agent_delete._id, availability: enums_biz.Availability.Only_me}, (err, result) =>{
                    if(err){
                        console.error(err, "Delete biz fail");
                        return reject_(err);
                    }
                    return resolve_();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(result) {
            return resolve(options);
        }, function(reason) {
            return reject(reason);
        });
    });
};

function deleteAllFacebookProfile(options){
    console.log('=======DELETE FACEBOOK PROFILE=======');
    return new Promise((resolve, reject) => {
        UserFbAccount.remove({user_id: options.agent_delete._id}, (err, result) =>{
            if(err){
                console.error(err, "Delete all Facebook profile false");
                return reject(err);
            }
            return resolve(options);
        });
    });
};

function deleteAllContact(options){
    console.log('=======DELETE CONTACT=======');
    return new Promise((resolve, reject) => {
        UserContact.remove({user_id: options.agent_delete._id}, (err, result) =>{
            if(err){
                console.error(err, "Delete all UserContact false");
                return reject(err);
            }
            return resolve(options);
        });
    });
};

function deleteAllGroupUser(options){
    console.log('=======DELETE GROUPUSER=======');
    return new Promise((resolve, reject) => {
        GroupUser.remove({user_id: options.agent_delete._id}, (err, result) =>{
            if(err){
                console.error(err, "Delete all GroupUser false");
                return reject(err);
            }
            
            emitter.emit('evt.group_user.mongo-people-online', {
                idOwner: options.idOwner,
                group_id: options.group_id,
                user_id: options.agent_delete._id,
                type: "remove_agent"
            });
            return resolve(options);
        });
    });
};

function deleteTicketField(options){
    console.log('=======DELETE TICKET FIELD=======');
    return new Promise((resolve, reject) => {
        CustomSetting.remove({"provider_data.agent_id": options.agent_delete._id.toString()}, (err, result) =>{
            if(err){
                console.error(err, "Delete all CustomSetting false");
                return reject(err);
            }
            return resolve(options);
        });
    });
};

/*function updateTicketField(options){
    console.log('=======UPDATE TICKET FIELD=======');
    return new Promise((resolve, reject) => {
        CustomSetting.update({
            "provider_data.agent_id": options.agent_delete._id
        },{
            "provider_data.agent_id": options.agent_assign._id
        },{
            multi: true
        }, (err, result) =>{
            if(err){
                console.error(err);
                return reject(err);
            }
            return resolve();
        });
    });
};*/

function updateAllBizRule(options){
    console.log('=======UPDATE BIZRULE=======');
    var tasks = [];
    return new Promise((resolve, reject) => {
        biz_rules.forEach((biz_rule) => {
            var promise = new Promise((resolve_, reject_) => {
                biz_rule.update({
                    user_id: options.agent_delete._id
                },{
                    user_id: options.idOwner
                },{
                    multi: true
                }, (err, result) =>{
                    if(err){
                        console.error(err);
                        return reject_(err);
                    }
                    return resolve_();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(result) {
            return resolve(options);
        }, function(reason) {
            return reject(reason);
        });
    });
};

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.user.assign_ticket', (options, callback) => {
        new Promise(deleteUser(options))
            .then(updateAllTicket)
            .then(deleteAllBizRuleOnly)
            .then(updateAllBizRule)
            .then(deleteAllFacebookProfile)
            .then(deleteAllContact)
            .then(deleteAllGroupUser)
            .then(deleteTicketField)
            //.then(updateTicketField)
            .then(removeSession)
            .then(result => {
                console.log('===DELETE SUCCESS===');
                return callback(null, result.delete_user_success);
            }).catch(error => {
                console.log(error);
                console.error(error);
                return callback(error);
            });
    });

    emitter.on('evt.user.remove_user_filter', (options, callback) => {
        FilterUserView.remove({ user_id: options.user_id}, (removeErr) => {
            if (removeErr) {
                console.error(removeErr);
            }
        });
    });

    emitter.on('evt.user.requester_filter', (options, callback) => {
        var user = _.assign({}, options.user) ,
            user = user._doc,
            idOwner = utils.getParentUserId(user);

        FilterUserView.remove({ user_id: user._id}, (removeErr) => {
            if (removeErr) {
                console.error(removeErr);
                return;
            }
            
            if(notifyTimeout){
                clearTimeout(notifyTimeout);
            }
 
            notifyTimeout = setTimeout(() =>{
                socketIO.emit('/core', idOwner, {
                    topic: 'izi-core-client-view-user',
                    payload : {
                        is_success: true
                    }
                });
            }, 3000);
            
            user.ed_parent_id = idOwner;
            rbSender(config.rabbit.sender.exchange.trigger, {
                topic: 'izi-user-filter-core',
                payload: {
                    data_user: user
                }
            });
        });
    });
};
