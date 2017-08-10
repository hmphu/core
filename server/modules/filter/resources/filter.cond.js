'use strict';
//
//  filter.cond.js
//  build trigger matrix to render layout
//
//  Created by thanhdh on 2016-01-13.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var path = require('path'),
    enums = require(path.resolve('./modules/biz.rule/resources/enums')),
    moment = require('moment'),
    mongoose = require('mongoose'),
    utils = require(path.resolve('./modules/core/resources/utils')),
    groupUserController = require(path.resolve('./modules/people/controllers/people.group.user.controller'));

/**
 * handle trigger conditions
 * author: thanhdh
 */
module.exports = (user, data, next) =>{
    var and_cond = data.all_conditions || [],
        any_cond = data.any_conditions || [],
        query = {
            $or: [],
            $and: []
        };
    allConditions(query['$and'], and_cond, user, 0, () => {
        if(!query['$and'].length){
            delete query['$and'];
        }
        anyConditions(query['$or'], any_cond, user, 0, ()=>{
            if(!query['$or'].length){
                delete query['$or'];
            }
            return next(query);
        });
    });
};

/**
 * handle all conditions
 * author: thanhdh
 */
function allConditions(query, and_conditions, user, index, next){
    var and_cond = and_conditions[index];
    if(!and_cond){
        return next();
    }
    matching(query, and_cond, user, () =>{
        return allConditions(query, and_conditions, user, ++index, next);
    });
}

/**
 * handle any conditions
 * author: thanhdh
 */
function anyConditions(query, any_conditions, user, index, next){
    var any_cond = any_conditions[index];
    if(!any_cond){
        return next();
    }
    matching(query, any_cond, user, () =>{
        return anyConditions(query, any_conditions, user, ++index, next);
    });
}

/**
 * matching ticket data vs trigger conditions
 * author: thanhdh
 */
function matching(query, condition, user, next){
    let moreValue = {
        operator: condition.operator
    };
    // if there are ticket fields in the conditions
    if(condition.cond_type == enums.BizRuleType.Ticket){
        switch(condition.field_key) {
            case 'group':
                if(condition.value == 'default_loggedin_group'){
                    var idOwner = utils.getParentUserId(user);
                    groupUserController.findGroupUser(idOwner, user._id, (err, result) =>{
                        if(err){
                            console.error(err, 'filter.match in filter module')
                        }
                        if(result && result.group_id){
                            condition.value = result.group_id;
                            query.push(buildCond('group_id', condition));
                        }
                        next();
                    });
                } else if(condition.value == 'all_loggedin_group') {
                    var idOwner = utils.getParentUserId(user);
                    groupUserController.getGroupIdOfUser(idOwner, user._id, (err, result) =>{
                        if(err){
                            console.error(err, 'filter.match in filter module')
                        }
                        if(result && result.length){
                            condition.operator = (condition.operator == 'is'? 'includes': 'not_includes');
                            condition.value = result;
                            query.push(buildCond('group_id', condition));
                        }
                        next();
                    });
                } else {
                    next();
                }
                break;
            case 'agent':
                // current user
                if(condition.value == 'current_user'){
                    condition.value = user._id;
                    query.push(buildCond('agent_id', condition));
                }
                return next();
                break;
            case 'sla':
                if(condition.operator){ //report
                    
                }else{
                    if(condition.value == 'processing'){
                        condition.value = +moment.utc();
                        condition.operator = 'greater_than_equal';
                        query.push(buildCond('sla.deadline.agent_working_time', condition));
                    }
                    if(condition.value == 'overdue'){
                        condition.value = +moment.utc();
                        condition.operator = 'less_than';
                        query.push(buildCond('sla.deadline.agent_working_time', condition));
                    }
                }
                return next();
                break;
            case 'minutes_since_new':
            case 'minutes_since_open':
            case 'minutes_since_pending':
            case 'minutes_since_solved':
            case 'minutes_since_suspended':
            case 'minutes_since_closed':
                condition.operator = 'minutes';
                query.push(buildCond('date.status', condition, moreValue));
                return next();
                break;
            case 'minutes_since_assigned':
                condition.operator = 'minutes';
                query.push(buildCond('date.assigned', condition, moreValue));
                return next();
                break;
            case 'minutes_since_update':
                condition.operator = 'minutes';
                query.push(buildCond('upd_time', condition, moreValue));
                return next();
                break;
            case 'minutes_since_requester_update':
                condition.operator = 'minutes';
                query.push(buildCond('date.requester_updated', condition, moreValue));
                return next();
                break;
            case 'minutes_since_agent_update':
                condition.operator = 'minutes';
                query.push(buildCond('date.agent_updated', condition, moreValue));
                return next();
                break;
            case 'minutes_since_duedate':
                condition.operator = 'minutes';
                query.push(buildCond('date.deadline', condition, moreValue));
                return next();
                break;
            case 'minutes_until_duedate':
                condition.operator = 'until_minutes';
                query.push(buildCond('date.deadline', condition, moreValue));
                return next();
                break;
            default:
                return next();
        }
    }
    // if there are other conditions
    else if(condition.cond_type == enums.BizRuleType.Others){
        /*switch(condition.field_key) {
            default:
                return next();
                break;
        }*/
        return next();
    } else {
        return next();
    }
}

/**
 * compare data and return true or false
 * author: thanhdh
 */
function buildCond(column, condition, moreValue){
    if(condition.value === 'string' && mongoose.Types.ObjectId.isValid(`${condition.value}`)) {
        condition.value = mongoose.Types.ObjectId(condition.value);
    }

    switch(condition.operator) {
        case 'is':
            return {[column]: condition.value};
            break;
        case 'is_not':
            return {[column]: {$ne: condition.value}};
            break;
        case 'less_than':
            return {[column]: {$lt: condition.value}};
            break;
        case 'less_than_equal':
            return {[column]: {$lte: condition.value}};
            break;
        case 'greater_than':
            return {[column]: {$gt: condition.value}};
            break;
        case 'greater_than_equal':
            return {[column]: {$gte: condition.value}};
            break;
        case 'includes':
            return {[column]: {$in: condition.value}};
            break;
        case 'not_includes':
            return {[column]: {$nin: condition.value}};
            break;
        case 'minutes':
            var now = +moment.utc(),
                value = +moment.utc().subtract(condition.value, 'm');
            if(moreValue.operator == 'greater_than'){
                return {[column]: {$lt: value}};
            }
            if(moreValue.operator == 'less_than'){
                return {[column]: {$lte: now, $gt: value}};
            }
            return {[column]: value};
            break;
        case 'until_minutes':
            var now = +moment.utc(),
                value = +moment.utc().add(condition.value, 'm');
            if(moreValue.operator == 'greater_than'){
                return {[column]: {$gt: value}};
            }
            if(moreValue.operator == 'less_than'){
                return {[column]: {$gt: now, $lte: value}};
            }
            return {[column]: value};
            break;
        default:
            return {[column]: condition.value};
            break;
    }
}
