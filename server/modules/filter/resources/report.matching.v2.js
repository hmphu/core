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
    mongoose = require('mongoose'),
    utils = require(path.resolve('./modules/core/resources/utils')),
    enumsTicket = require(path.resolve('./modules/ticket/resources/enums')),
    filterUtils = require(path.resolve('./modules/filter/resources/utils.v2'));

/**
 * matching ticket data vs trigger conditions
 * author: thanhdh
 */
module.exports = (query, condition, user, next) => {
    let moreValue = {
        operator: condition.operator
    };
    // if there are ticket fields in the conditions
    if(condition.cond_type == enums.BizRuleType.Ticket){
        switch(condition.field_key) {
            case 'rate':
                if(condition.value == 'good'){
                    condition.value = 1;
                }else if(condition.value == 'bad'){
                    condition.value = 0;
                }else{
                    condition.operator = condition.operator == 'is' ? 'includes' : 'not_includes';
                    condition.value = null;
                }
                filterUtils.buildCond(query, 'rating.value', condition);
                return next();
                break;
            case 'reopen':
                filterUtils.buildCond(query, 'stats.counter_reopen', condition);
                return next();
                break;
            case 'izi_last_comment':
                //condition.value = (condition.value == 'agent'? true: false);
                condition.operator = 'is';
                filterUtils.buildCond(query, 'stats.is_agent_answered', condition);
                return next();
                break;
            default:
                return next();
        }
    }
    else {
        return next();
    }
}
