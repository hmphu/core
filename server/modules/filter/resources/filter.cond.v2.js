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
    enumsTicket = require(path.resolve('./modules/ticket/resources/enums')),
    viewMatching = require(path.resolve('./modules/filter/resources/view.matching.v2')),
    reportMatching = require(path.resolve('./modules/filter/resources/report.matching.v2'));

/**
 * handle trigger conditions
 * author: thanhdh
 */
module.exports = (user, data, next) =>{
    var and_cond = data.all_conditions || [],
        any_cond = data.any_conditions || [],
        query = {
            $and: [{
                term: {
                    ed_user_id: utils.getParentUserId(user)
                }
            }, {
                bool: {
                    must_not: [{
                          term: {
                              _type: 'fb-post'
                          }
                      }
                   ]
                }
            }, {
                bool: {
                    must_not: [{
                          term: {
                              'stats.is_delete': true
                          }
                      }
                   ]
                }
            }],
            $or : []
        };
    allConditions(query.$and, and_cond, user, 0, (is_break) => {
        if(is_break){
            return next(true);
        }
        anyConditions(query.$or, any_cond, user, 0, (is_break)=>{
            if(is_break){
                return next(true);
            }
            // add or query if any
            if(query.$or.length){
                query.$and.push({
                    bool: {
                        should: query.$or
                    }
                });
            }
            return next(false, query.$and);
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
    and_cond.is_and = true;
    matching(query, and_cond, user, (is_break) =>{
        if(is_break){
            return next(true);
        }
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
    matching(query, any_cond, user, (is_break) =>{
        if(is_break){
            return next(true);
        }
        return anyConditions(query, any_conditions, user, ++index, next);
    });
}

/**
 * matching ticket data vs trigger conditions
 * author: thanhdh
 */
function matching(query, condition, user, next){
    viewMatching(query, condition, user, (is_break)=> {
        if(is_break){
            return next(true);
        }
        reportMatching(query, condition, user, next);
    });
}
