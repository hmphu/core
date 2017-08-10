'use strict';
//
// fb.controller.js
// handle fb logic
//
// Created by thanhdh on 2016-02-23.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    moment = require('moment'),
    config = require(path.resolve('./config/config')),
    mongoose  = require('mongoose'),
    utils = require('../../core/resources/utils'),
    enumsFB = require('../resources/enums'),
    ticketEnums = require('../../ticket/resources/enums'),
    fbPost = require('../resources/fb.post'),
    Fb = mongoose.model('Fb'),
    FbStats = mongoose.model('FbStats'),
    UserFbPage = mongoose.model('UserFbPage'),
    Ticket = mongoose.model('Ticket'),
    TicketComment = mongoose.model("TicketComment"),
    peopleGroup = require('../../people/controllers/people.group.user.controller'),
    fbController = require('./fb.controller'),
    ticketController = require('../../ticket/controllers/ticket.controller'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    elastics = require('../resources/elastics'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));

/**
 * get list ticket is comment of wall post
 * author: dientn
 */
exports.listCommentWallPost = (req, res, next) =>{
    if(!_.isArray(req.body.page_ids) ){
        return next(new TypeError('facebook.fb_page_id.is_array'));
    }
    
    if(_.isEmpty(req.body.page_ids)){
       return res.json([]);
    }
    var ownerId = utils.getParentUserId(req.user);
    var options = {
        limit: Number( req.query.limit),
        skip: Number(req.query.skip),
        search: req.query.search,
        page_ids: req.body.page_ids,
        ticket_type: 'fb-comment',
        is_user_post: false
    };

    var filter = req.query.filter;

    if(filter == 'no_reply'){
        options.is_answered = false;
    }

    elastics.filterTicket(ownerId, options, (err, resutls)=>{
        if(err){
            return next(err);
        }
        var data = resutls.hits.map(item => Object.assign({}, item._source, {_id: item._id, data: undefined, provider_data: item._source.data, last_cmt_time: (item._source.stats || {}).last_time_cmt}));
        res.json(data);
    });
};

/**
 * get list ticket is userpost
 * @author: dientn
 */
exports.listCommentUserPost = (req, res, next) =>{
    if(!_.isArray(req.body.page_ids) ){
        return next(new TypeError('facebook.fb_page_id.is_array'));
    }

    if(_.isEmpty(req.body.page_ids)){
       return res.json([]);
    }
    var ownerId = utils.getParentUserId(req.user);
    var options = {
        limit: Number( req.query.limit),
        skip: Number(req.query.skip),
        search: req.query.search,
        page_ids: req.body.page_ids,
        ticket_type: 'fb-comment',
        is_user_post: true
    };

    var filter = req.query.filter;

    if(filter){ // add orther filter
        if(filter == 'no_reply'){
            options.is_answered = false;
        }
    }
    elastics.filterTicket(ownerId, options, (err, resutls)=>{
        if(err){
            return next(err);
        }
        var data = resutls.hits.map(item => Object.assign({}, item._source, {_id: item._id, data: undefined, provider_data: item._source.data, last_cmt_time: (item._source.stats || {}).last_time_cmt}));
        res.json(data);
    });
};


/**
 * get list ticket is conversation
 * @modify by: dientn
 */
exports.listConversation = (req, res, next) =>{
    if(!_.isArray(req.body.page_ids) ){
        return next(new TypeError('facebook.fb_page_id.is_array'));
    }
    
    if(_.isEmpty(req.body.page_ids)){
       return res.json([]);
    }
    var ownerId = utils.getParentUserId(req.user);
    var options = {
        limit: Number( req.query.limit),
        skip: Number(req.query.skip),
        search: req.query.search,
        page_ids: req.body.page_ids,
        ticket_type: 'fb-chat'
    };

    var filter = req.query.filter;

    if(filter){ // add orther filter
        if(filter == 'no_reply'){
            options.is_answered = false;
        }
    }
    elastics.filterTicket(ownerId, options, (err, resutls)=>{
        if(err){
            return next(err);
        }
        var data = resutls.hits.map(item => Object.assign({}, item._source, {_id: item._id, data: undefined, provider_data: item._source.data, last_cmt_time: (item._source.stats || {}).last_time_cmt}));
        res.json(data);
    });
};

/**
 * get last comment by ticket id
 * @author: dientn
 */
exports.getLastTicketComment = [(req, res, next)=>{
    if(!req.params.fb_ticket_id || !mongoose.Types.ObjectId.isValid(req.params.fb_ticket_id)){
        return next(new TypeError('fb.ticket_id.invalid'));
    }
    var comment_type = req.params.comment_type;
    var ownerId = utils.getParentUserId(req.user);
    var typeMapping = {
        'wallpost': 'fb-comment',
        'userpost': 'fb-comment',
        'chat': 'fb-chat'
    };
    elastics.getLastTicketCmt(ownerId, typeMapping[comment_type], req.params.fb_ticket_id, (err, result)=>{
        if(err){
            return next(err);
        }

//        console.log(result);
        var data = result? Object.assign({}, result._source, {_id: result._id, data: undefined, provider_data: result._source.data}): null;
        return res.json(data);
    });
}];

/**
 * get list comment by ticket id
 * @author: dientn
 */
exports.getListCommentByTicketId = [(req, res, next)=>{
    var ticket_id = req.params.fb_ticket_id;
    
    if(!ticket_id || !mongoose.Types.ObjectId.isValid(ticket_id)){
        return next(new TypeError('fb.ticket_id.invalid'));
    }
    
    var options = {
        query : {
            ed_user_id: utils.getParentUserId(req.user),
            is_delete: { $ne: true},
            provider: ticketEnums.Provider.fbComment,
            ticket_id: ticket_id,
            is_first: { $ne: true},
            is_child: { $ne: true}
        },
        limit: req.query.limit,
        skip: req.query.skip,
        sort_order: 1
    }

    utils.findByQuery(TicketComment, options).exec((err, fb_comment)=>{
        if (err) {
            return next(err);
        }
        res.json(fb_comment);
    });
}];

/**
 * get list comment(message) by ticket id
 * @author: dientn
 */
exports.getListMessageByTicketId = [(req, res, next)=>{
    var ticket_id = req.params.fb_ticket_id;

    if(!ticket_id || !mongoose.Types.ObjectId.isValid(ticket_id)){
        return next(new TypeError('fb.ticket_id.invalid'));
    }

    var options = {
        query : {
            ed_user_id: utils.getParentUserId(req.user),
            is_delete: { $ne: true},
            provider: ticketEnums.Provider.fbMessage,
            ticket_id: ticket_id,
        },
        limit: req.query.limit,
//        skip: req.query.skip,
        sort_order: -1
    }
    if(req.query.skip){
        options.query.add_time = {$lt: Number(req.query.skip)};
    }
    utils.findByQuery(TicketComment, options).exec((err, fb_comment)=>{
        if (err) {
            return next(err);
        }
        res.json(fb_comment);
    });
}];

/**
 * get list comment by parent comment
 * @author: dientn
 */

exports.getListReplyByComment = [(req, res, next)=>{
//    var ticket_id = req.params.fb_ticket_id;
    var parent_id = req.params.comment_id;

    var options = {
        query : {
            ed_user_id: utils.getParentUserId(req.user),
            is_delete: { $ne: true},
            provider: ticketEnums.Provider.fbComment,
            "provider_data.parent_id": parent_id
        },
        limit: req.query.limit,
        skip: req.query.skip,
        sort_order: 1
    };

    utils.findByQuery(TicketComment, options).exec((err, fb_comment)=>{
        if (err) {
            return next(err);
        }
        res.json(fb_comment);
    });
}];

/**
 * get fb post
 * @author: dientn
 */
exports.getPost = [(req, res, next)=>{
    var ownerId = utils.getParentUserId(req.user);
    var post_id = req.params.post_id;
    elastics.getPost(ownerId, post_id, (err, result)=>{
        if(err){
            return next(err);
        }
        var res_data = (!result || !result.found)? null: Object.assign({}, result._source, {data: undefined, provider_data : result._source.data, fb_id: result._source.data.post_id});
        return res.json(res_data);
    });
}];

/*
 * send message of conversation to facebook
 * @author: dientn
 */
exports.sendConversation = [
    (req, res, next)=>{
        if(utils.isEmpty(req.params.fb_ticket_id)){
            return next(new TypeError("facebook.fb_ticket_id"));
        }
        if(utils.isEmpty(req.body.content)){
            return next(new TypeError("facebook.content_required"));
        }
        // find fb record by id
        Ticket.findById(req.params.fb_ticket_id).exec((err, result) =>{
            if(err){
                return next(err);
            }

            var idOwner = utils.getParentUserId(req.user);
            if(!result || !_.isEqual(result.ed_user_id, idOwner)){
                return next(new TypeError('facebook.conver_id_notfound'));
            }
            if(result.provider != ticketEnums.Provider.fbMessage){
                return next(new TypeError('facebook.conver_type.invalid'));
            }

            if(result.is_delete){
                return next(new TypeError('facebook.ticket_id_deleted'))
            }

            req.ticket = result;
            next();
        });
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var ticket = req.ticket;
        if(_.isString(req.body.auto_solve_ticket)){
            req.body.auto_solve_ticket = req.body.auto_solve_ticket == 'true';
        }
        var data = {
            thread_id: ticket.provider_data.thread_id,
            thread_id_v1: ticket.provider_data.thread_id_v1,
            page_id: ticket.provider_data.page_id,
            ed_user_id: idOwner,
            content: req.body.content
        };

        if(req.files){
            data.attachments = req.files;
        }

        emitter.emit('evt.facebook.sendConversation', data, req.user, (err, result_evt) =>{
            var is_error = false;
            var error = null;
            if(err){
                is_error = true;
                error = err.message || err;
            }
            else if(!result_evt){
                is_error = true;
                error = 'fb.access_token.not_found';
            }
            result_evt = result_evt || {};
            data.conversation_id = result_evt.id;
            data.fb_detail = result_evt.fb_detail;
            data.auto_solve_ticket = req.body.auto_solve_ticket;
            data.is_error = is_error;
            data.ticket = ticket;
            emitter.emit('evt.facebook.addConversationTicket', data, req.user, (err_add, result_add) =>{
                if(err_add){
                    return next(err_add);
                }

                let resData = result_add || {};

                if(is_error){
                    resData.errors = {
                        single: error
                    };
                }
                return res.json(resData);
            });
        });
    }
];

/*
 * comment of post to facebook
 * @author: dientn
 */
exports.sendComment = [
    (req, res, next) =>{

        if(utils.isEmpty(req.body.content)){
            return next(new TypeError("facebook.content_required"));
        }

        if(['userpost', 'wallpost'].indexOf(req.params.type) == -1){
            return next(new TypeError("facebook.type_not_found"));
        }

        var ticket_id = req.body.ticket_id;
        var idOwner = utils.getParentUserId(req.user);
        if(!ticket_id || !mongoose.Types.ObjectId.isValid(ticket_id)){
            return next(new TypeError("facebook.ticket_id_invalid"));
        }

        Ticket.findById(ticket_id).exec((err, ticket)=>{
            if(err){
                return next(err);
            }

            if(!ticket){
                return next(new TypeError("facebook.ticket_id_notfound"));
            }

            if(!ticket || !_.isEqual(ticket.ed_user_id, idOwner)){
                return next(new TypeError('facebook.ticket_id_notfound'));
            }
            if(ticket.provider != ticketEnums.Provider.fbComment){
                return next(new TypeError('facebook.ticket_id_notfound'));
            }
            if(ticket.is_delete){
                return next(new TypeError('facebook.ticket_id_deleted'))
            }
            req.ticket = ticket;
            return next();
        });
    },
    (req, res, next) =>{
        var ticket = req.ticket;
        var idOwner = utils.getParentUserId(req.user);
        if(_.isString(req.body.auto_solve_ticket)){
            req.body.auto_solve_ticket = req.body.auto_solve_ticket == 'true';
        }

        var data = {
            page_id: ticket.provider_data.page_id,
            post_id: ticket.provider_data.post_id,
            ed_user_id: idOwner,
            content: req.body.content,
            sender_id: req.body.sender_id,
            provider: enumsFB.Provider.comment
        };

        if(req.files){
            data.attachments = req.files;
        }
        emitter.emit('evt.facebook.sendComment', data, req.user, (err, result_evt) =>{
            var is_error = false;
            var error = null;
            if(err){
                is_error = true;
                error = err.message || err;
            }
            else if(!result_evt){
                is_error = true;
                error = 'fb.access_token.not_found';
            }

            result_evt = result_evt || {};
            data.fb_detail = result_evt.fb_detail;
            data.comment_id = result_evt.comment_id;
            data.parent_id = ticket.provider_data.parent_id ||  data.post_id;
            data.auto_solve_ticket = req.body.auto_solve_ticket;
            data.ticket = ticket;
            data.is_error = is_error;
            emitter.emit('evt.facebook.addCommentTicket', data, req.user, (err_add, result_add) =>{
                if(err_add){
                    return next(err_add);
                }

                let resData = result_add;

                if(is_error){
                    resData.errors = {
                        single: error
                    };
                }
                return res.json(resData);
            });
        });
    }
];

/*
 * replies comment to facebook
 * @author: dientn
 */
exports.sendRepliesComment =[
    (req, res, next)=>{
        if(utils.isEmpty(req.params.comment_id)){
            return next(new TypeError("facebook.fb_page_id"));
        }
        if(utils.isEmpty(req.body.content)){
            return next(new TypeError("facebook.content_required"));
        }
        var func = req.params.type == 'wallpost' ? Ticket.findById(req.params.comment_id) : TicketComment.findById(req.params.comment_id);
        if(req.params.type == 'userpost'){
            func = func.populate('ticket_id');
        }
        // find fb record by id
        func.exec((err, result) =>{
            if(err){
                return next(err);
            }

            var idOwner = utils.getParentUserId(req.user);
            if(!result || !_.isEqual(result.ed_user_id, idOwner)){
                return next(new TypeError('facebook.comment_id_notfound'));
            }

            if(req.params.type == 'wallpost' && result.is_delete){
                return next(new TypeError('facebook.ticket_id_deleted'))
            }else if(result.ticket_id.is_delete){
                return next(new TypeError('facebook.ticket_id_deleted'))
            }

            req.comment = result;
            next();
        });
    },
    (req, res, next) =>{
        if(_.isString(req.body.auto_solve_ticket)){
            req.body.auto_solve_ticket = req.body.auto_solve_ticket == 'true';
        }
        var idOwner = utils.getParentUserId(req.user);
        var comment = req.comment;
        var ticket = req.params.type == 'wallpost'? comment: comment.ticket_id;
        var data = {
            page_id: comment.provider_data.page_id,
            comment_id: comment.comment_id || comment.provider_data.comment_id,
            post_id: comment.provider_data.post_id,
            ed_user_id: idOwner,
            content: req.body.content,
            sender_id: req.body.sender_id,
            provider: enumsFB.Provider.comment
        };

        if(req.files){
            data.attachments = req.files;
        }

        // send comment to facebook
        emitter.emit('evt.facebook.sendRepliesComment', data, req.user, (err, result_evt) =>{

            var error = null;
            var is_error = false;
            if(err){
                is_error = true;
                error = err.message || err;
            }
            else if(!result_evt){
                is_error = true;
                error = 'fb.access_token.not_found';
            }

            result_evt = result_evt || {};
            data.parent_id = data.comment_id;
            data.comment_id = result_evt.comment_id;
            data.fb_detail = result_evt.fb_detail;
            data.is_reply = true;
            data.auto_solve_ticket = req.body.auto_solve_ticket;
            data.is_user_post = ticket.provider_data.is_user_post;
            data.is_error = is_error;
            data.ticket = ticket;
            // add comment to fb table
            emitter.emit('evt.facebook.addRepliesCommentTicket', data, req.user, (err_add, result_add) =>{
                if(err_add){
                    return next(err_add);
                }

                let resData = result_add || {};
                if(is_error){
                    resData.errors = {
                        single: error
                    };
                }
                return res.json(resData);
            });
        });
    }
];

//Solve ticket
exports.solvedTicket = (req, res, next)=>{
    let ticket_id = req.params.fb_ticket_id;
    var idOwner = utils.getParentUserId(req.user);
    if(!ticket_id || !mongoose.Types.ObjectId.isValid(ticket_id)){
        return next(new TypeError('facebook.ticket_id_invalid'))
    }
    
    Ticket.findById(ticket_id).exec((err, ticket)=>{
        if(err || !ticket){
            console.log(err || new TypeError(`Ticket id[${ticket_id}] not found`));
            return;
        }
        if(ticket.is_delete){
             return next(new TypeError('facebook.ticket_id_deleted'));
        }
        ticket = ticket.toJSON();
        ticket.status = ticketEnums.TicketStatus.Solved;
        if(!ticket.agent_id){
            peopleGroup.findGroupUser(idOwner, req.user._id, (err, result)=>{
                if(err){
                    console.log(err);
                    return;
                }else{
                    ticket.agent_id = req.user._id;
                    ticket.group_id = result.group_id;
                    rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
                        ticket: ticket,
                        submitter_id: req.user._id
                    }});

                    return res.json('facebook.ticket_solved_success');
                }
            });
        }
        else{
            rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
                ticket: ticket,
                submitter_id: req.user._id
            }});
            return res.json('facebook.ticket_solved_success');
        }
    });
}

// ============================================ old =============================================//

/**
 * get list comment with page_id in facebook author: vupl
 */
exports.listCommentByPageId = (req, res, next) =>{
    if(utils.isEmpty(req.params.page_id)){
        return next(new TypeError("facebook.fb_page_id"));
    }
    var search = req.query.search;
    var params= {
        query: {
            ed_user_id : utils.getParentUserId(req.user),
            provider: {$in : [enumsFB.Provider.comment, enumsFB.Provider.userpost]},
            page_id: req.params.page_id
        },
        select: '_id ed_user_id ticket_id ticket_comment_id fb_id provider_data provider message sender add_time',
        sort_order: req.query.sort_order,
        limit: req.query.limit,
        skip: req.query.skip
    };
    
    if(search){
        params.query.message = {$regex: search, $options: "mi" };
    }
    
    var states = [
        {
            $match:{
                ed_user_id : utils.getParentUserId(req.user),
                provider: {$in : [enumsFB.Provider.comment]},
                page_id: req.params.page_id
            }
        },
        { $sort:{add_time : -1}},
        {
            $group:{
                _id:{parent_id: "$provider_data.parent_id", post_id: "$provider_data.post_id"},
                id:{ $last: '$_id' },
                ed_user_id:{ $last: '$ed_user_id'},
                ticket_id:{ $last: '$ticket_id'},
                ticket_comment_id:{ $last: '$ticket_comment_id'},
                fb_id:{ $last: '$fb_id'},
                provider_data:{ $last: '$provider_data'},
                provider:{ $last: '$provider'},
                message:{ $last: '$message'},
                sender:{ $last: '$sender'},
                add_time:{ $last: '$add_time'},
                no_reply:  {$last: { $ifNull:['$is_requester', false] }},
                all_messages:{ $push: '$message' },
                all_senders:{ $push: '$sender' },
                all_noreplys:{ $push: {$ifNull:['$is_requester', false]} },
                all_noconverts:{ $push: {$cond: { if: { $ne: ["$ticket_id", null] }, then: true, else: false }} },
            }
        },
        { $sort:{add_time : -1}},
    ];

    Fb.aggregate(states).read('secondaryPreferred').allowDiskUse(true).exec((err, fb_comment) =>{
        if (err) {
            return next(err);
        }
        res.json(fb_comment);
    });
};

/**
 * get list replies with comment_id in facebook author: vupl
 */
exports.listRepliesByCommentId = (req, res, next) =>{
    if(utils.isEmpty(req.params.comment_id)){
        return next(new TypeError("facebook.fb_page_id"));
    }
    var params= {
        query: {
            ed_user_id : utils.getParentUserId(req.user),
            provider: enumsFB.Provider.comment,
            'provider_data.parent_id': req.params.comment_id
        },
        select: '_id ed_user_id ticket_id ticket_comment_id fb_id provider_data provider message sender add_time',
        sort_order: req.query.sort_order || 1,
        limit: req.query.limit,
        skip: req.query.skip
    };
    if(req.query.reply_id){
        var getComment = (limit)=>{
            return new Promise((resolve, reject)=>{
                var query = _.assign(params.query, {add_time : {$eq: limit}});
                Fb.findOne(query).select(params.select).sort({add_time: 1}).skip(req.query.skip || 0).exec((err, comments)=>{
                    if(err){
                        return reject(err);
                    }
                    resolve([comments]);
                });
                
            });
        };
        
        var canLoadLate = (limit)=>{
            return new Promise((resolve, reject)=>{
                var query = _.assign(params.query, {add_time : {$lt: limit}});
                Fb.count(query).exec((err, count)=>{
                    if(err){
                        console.error(err)
                        return resolve(0);
                    }
                    resolve(count);
                });
            });
        }
        var canLoadMore = (limit)=>{
            return new Promise((resolve, reject)=>{
                var query = _.assign(params.query, {add_time : {$gt: limit}});
                Fb.count(query).exec((err, count)=>{
                    if(err){
                        console.error(err)
                        return resolve(0);
                    }
                    resolve(count);
                });
            });
        }
        Fb.findOne({fb_id: req.query.reply_id}).exec((err, comment)=>{
            if(err){
                return reject(new TypeError('facebook.fb_comment_id'));
            }
            
            Promise.all([getComment(comment.add_time), canLoadLate(comment.add_time), canLoadMore(comment.add_time)])
            .then(results=>{
                res.json({
                    comments: results[0],
                    can_load_late: results[1] > 0,
                    can_load_more: results[2] > 0
                });
            }).catch(reason=>{
                return next(reason);
            });
        });
    }else{
        utils.findByQuery(Fb, params).exec((err, fb_replies_comment) =>{
            if (err) {
                return next(err);
            }
            res.json(fb_replies_comment);
        }); 
    }
};

/**
 * get list replies with comment_id in facebook author: vupl
 */
exports.loadMoreReplies= (req, res, next) =>{
    if(utils.isEmpty(req.params.comment_id)){
        return next(new TypeError("facebook.fb_comment_id"));
    }
    var navigate = req.query.navigator || "next";
    var params= {
        query: {
            ed_user_id : utils.getParentUserId(req.user),
            provider: enumsFB.Provider.comment,
            'provider_data.parent_id': req.params.comment_id
        },
        select: '_id ed_user_id ticket_id ticket_comment_id fb_id provider_data message sender add_time',
        sort_order: navigate == 'prev'? -1: 1,
        limit: req.query.limit,
        skip: req.query.skip
    };
    
    utils.findByQuery(Fb, params).exec((err, fb_replies_comment) =>{
        if (err) {
            return next(err);
        }
        res.json(fb_replies_comment);
    });
};


/*
 * like or unlike comment to facebook
 * @author: dientn
 */
exports.likeComment = [
    (req, res, next) =>{
        if(utils.isEmpty(req.params.comment_id)){
            return next(new TypeError("facebook.fb_page_id"));
        }
        if(utils.isEmpty(req.params.is_like)){
            return next(new TypeError("facebook.is_like"));
        }
        var model = req.query.is_ticket == "1"? Ticket: TicketComment;
        model = model.findById(req.params.comment_id);
        if(req.params.is_ticket != "1"){
            model = model.populate('ticket_id');
        }
        model.exec((err, result)=>{
            if(err) return next(err);

            var idOwner = utils.getParentUserId(req.user);
            if(!result || !_.isEqual(result.ed_user_id, idOwner)){
                return next(new TypeError('facebook.comment_id_notfound'));
            }

            req.comment = result;
            return next();
        });
    },
    (req, res, next) =>{

        var comment = req.comment;
        var ticket = comment.ticket_id || comment;
        var idOwner = utils.getParentUserId(req.user);

        var data = {
            page_id: comment.provider_data.page_id,
            comment_id: comment.comment_id || comment.provider_data.comment_id,
            is_like: req.params.is_like === '0'? false: true,
            is_ticket : req.query.is_ticket == "1",
            ed_user_id: idOwner,
            ticket: ticket,
            comment: comment
        };

        emitter.emit('evt.facebook.likeComment', data, req.user, (err, result_evt) =>{
            if(err && err.type == 'OAuthException'){
                return next(new TypeError(err.message  ||'fb.access_token.not_found'));
            }
            if(!result_evt){
                return next(err || new TypeError('fb.access_token.not_found'));
            }
            res.json(result_evt);
        });
    }
];

/*
 * hide or show comment to facebook
 * @author: dientn
 */
exports.toggleComment =[
    (req, res, next) =>{
        if(utils.isEmpty(req.params.comment_id)){
            return next(new TypeError("facebook.fb_comment_id"));
        }
        if(utils.isEmpty(req.params.is_hidden)){
            return next(new TypeError("facebook.is_hidden"));
        }

        var model = req.query.is_ticket == "1"? Ticket: TicketComment;
        model = model.findById(req.params.comment_id);
        if(req.params.is_ticket != "1"){
            model = model.populate('ticket_id');
        }
        model.exec((err, result)=>{
            if(err) return next(err);

            var idOwner = utils.getParentUserId(req.user);
            if(!result || !_.isEqual(result.ed_user_id, idOwner)){
                return next(new TypeError('facebook.comment_id_notfound'));
            }

            req.comment = result;
            return next();
        });
    },
    (req, res, next) =>{
        var comment = req.comment;
        var ticket = comment.ticket_id || comment;
        var idOwner = utils.getParentUserId(req.user);

        var data = {
            page_id: comment.provider_data.page_id,
            comment_id: comment.comment_id || comment.provider_data.comment_id,
            is_hidden: req.params.is_hidden === '0'? false: true,
            is_ticket : req.query.is_ticket == "1",
            ed_user_id: idOwner,
            ticket: ticket,
            comment: comment
        };

        emitter.emit('evt.facebook.hideComment', data, req.user, (err, result_evt) =>{
            if(err && err.type == 'OAuthException'){
                return next(new TypeError(err.message ||  'facebook.permision_denied'));
            }
            if(err || !result_evt){
                return next(err || new TypeError('facebook.access_token.not_found'));
            }
            res.json(result_evt);
        });
    }
];


/*
 * convert comment to ticket author: vupl
 */
exports.convertCommentToTicket = (req, res, next) =>{
    if(utils.isEmpty(req.params.comment_id)){
        return next(new TypeError("facebook.fb_page_id"));
    }
    
    var idOwner = utils.getParentUserId(req.user);
    Fb.findOne({fb_id: req.params.comment_id, ed_user_id: idOwner}).exec((err, result) =>{
        if(err|| !result){
            return next(err || new TypeError("facebook.not_found"));
        }
        if(req.query.auto_solve == '1'){
            peopleGroup.findGroupUser(idOwner, req.user._id, (err, group_user)=>{
                if(err){
                    console.log(err);
                }else{
                    var childQuery ={};
                    if(result.provider == "comment"){
                        if(!result.ticket_id){
                            var dataSend = result._doc;
                            dataSend.status = {
                                value : ticketEnums.TicketStatus.Solved,
                                login_id : req.user._id,
                                group_id: group_user.group_id
                            }
                            rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                        }

                        childQuery['provider_data.parent_id'] = result.fb_id;
                    }else if(result.provider == "userpost"){
                        if(!result.ticket_id){
                            var dataSend = result._doc;
                            dataSend.status = {
                                value : ticketEnums.TicketStatus.Solved,
                                login_id : req.user._id,
                                group_id: group_user.group_id
                            }
                            rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                        }
                        childQuery['provider_data.post_id'] = result.provider_data.post_id;
                        childQuery['fb_id'] ={$ne: result.fb_id};
                    }

                    if(Object.keys(childQuery).length >0){
                        // find all fb not have ticket_id
                        childQuery['ticket_id'] = {$exists: false};
                        Fb.find(childQuery).exec((err, resultChilds)=>{
                            if(err){
                                console.error(err);
                            }else if(resultChilds.length > 0){
                                resultChilds.forEach(comment=>{
                                    var dataSend = comment._doc;
                                    dataSend.status = {
                                        value : ticketEnums.TicketStatus.Solved,
                                        login_id : req.user._id,
                                        group_id: group_user.group_id
                                    }
                                    rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                                }) 
                            }
                        });
                        res.json({
                            message: "facebook.convert_success"
                        });
                    }else{
                        res.json({
                            message: "facebook.convert_success"
                        });
                    }
                }
            });
        }
        else{
            var childQuery ={};
            if(result.provider == "comment"){
                if(!result.ticket_id){
                    var dataSend = result.toObject();
                    rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                }

                childQuery['provider_data.parent_id'] = result.fb_id;
            }else if(result.provider == "userpost"){
                if(!result.ticket_id){
                    var dataSend = result.toObject();
                    rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                }
                childQuery['provider_data.post_id'] = result.provider_data.post_id;
                childQuery['fb_id'] ={$ne: result.fb_id};
            }

            if(Object.keys(childQuery).length >0){
                // find all fb not have ticket_id
                childQuery['ticket_id'] = {$exists: false};
                childQuery['ed_user_id'] = idOwner;
                Fb.find(childQuery).exec((err, resultChilds)=>{
                    if(err){
                        console.error(err);
                    }else if(resultChilds.length > 0){
                        resultChilds.forEach(comment=>{
                            var dataSend = comment.toObject();
                            rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                        }) 
                    }
                });
                res.json({
                    message: "facebook.convert_success"
                });
            }else{
                res.json({
                    message: "facebook.convert_success"
                });
            }
        }
    });
};

/*
 * convert comment to ticket author: vupl
 */
exports.convertRepliesCommentToTicket = (req, res, next) =>{
    if(utils.isEmpty(req.params.reply_comment_id)){
        return next(new TypeError("facebook.fb_page_id"));
    }
    var idOwner = utils.getParentUserId(req.user);
    Fb.findById(req.params.reply_comment_id).exec((err, result) =>{
        if(err){
            return next(err);
        }
        if(result.ticket_id){
            return next(new TypeError("facebook.comment.comment_is_convert"));
        }
        if(req.query.auto_solve == '1'){
            peopleGroup.findGroupUser(idOwner, req.user._id, (err, group_user)=>{
                if(err){
                    console.log(err);
                }else{
                    var dataSend = result._doc;
                    dataSend.status = {
                        value : ticketEnums.TicketStatus.Solved,
                        login_id : req.user._id,
                        group_id: group_user.group_id
                    }
                    rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                }
            });
        }else{
            var dataSend = result.toObject();
            rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
            res.json({
                message: "facebook.convert_success"
            });
        }
    });
};

/*
 * convert comment to ticket author: vupl
 */
exports.convertConversationToTicket = (req, res, next) =>{
    if(utils.isEmpty(req.params.conversation_id)){
        return next(new TypeError("facebook.fb_thread_id"));
    }
    var idOwner = utils.getParentUserId(req.user);

    Fb.find({'provider_data.thread_id': req.params.conversation_id, ticket_id: {$exists: false}, ed_user_id: idOwner}).exec((err, results)=>{
        if(err){
            console.error(err);
        }else{
            if(req.query.auto_solve == '1'){
                peopleGroup.findGroupUser(idOwner, req.user._id, (err, group_user)=>{
                    if(err){
                        console.log(err);
                    }else{
                        results.forEach(item=>{
                            var dataSend = item._doc;
                            dataSend.status = {
                                value : ticketEnums.TicketStatus.Solved,
                                login_id : req.user._id,
                                group_id: group_user.group_id
                            }
                            rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                        });
                    }
                });
            }else{
                results.forEach(item=>{
                    var dataSend = item.toObject();
                    rbSender(config.rabbit.sender.exchange.realtime, {topic: 'izicore-fb-convert-ticket', payload: dataSend});
                });
            }
        }
        res.json({
            message: "facebook.convert_success"
        });
    });
};

exports.countMessageOfConversation = (req, res, next) =>{
    var query = {
        ed_user_id : utils.getParentUserId(req.user),
        provider: enumsFB.Provider.conversation,
        "page_id": req.params.page_id,
        "provider_data.thread_id":req.params.conversation_id
    };
    Fb.count(query).exec((err, result) =>{
        if(err){
            return next(err);
        }
        res.json(result);
    });
};

exports.getConversationByThreadId = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var options = {
        limit: Number( req.query.limit),
        skip: Number(req.query.skip),
        page_id: req.params.page_id,
        thread_id: req.params.thread_id,
        ticket_type: 'fb-chat'
    };
    elastics.getConversation(idOwner, options, (err, results) =>{
        if(err){
            return next(err);
        }
        var total = results.total ? results.total : 0;
        var data = results.hits.map(item => Object.assign({}, item._source, {_id: item._id, data: undefined, provider_data: item._source.data, last_cmt_time: (item._source.stats || {}).last_time_cmt}));
        res.json({total: total, data: data});
    });
}