'use strict';
//
//  elastic.js
//  handle elastic search for zalo
//
//  Created by thanhdh on 2017-03-28.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    ticketEnums = require(path.resolve('./modules/ticket/resources/enums')),
    es = require(path.resolve('./config/lib/elasticsearch'));

/**
 * handle zalo filter
 * author: thanhdh
 */
exports.filterTicket = (idOwner, options, next) => {
    var filter = [
        {
            term: { ed_user_id: idOwner }
        },
        {
            terms: { "data.oaid": options.oaids }
        },
        {
            range: { status: {lt: ticketEnums.TicketStatus.Solved} }
        },
        {
            term: {_type: 'zalo-chat'}
        },
        {
            bool: {
                must_not: [{
                      term: {
                          'stats.is_delete': true
                      }
                  }
               ]
            }
        }
    ];
    if(options.last_time_cmt){
        filter.push({
            range: {
                "stats.last_time_cmt": {
                    lt: options.last_time_cmt
                }
            }
        });
    }
    if(options.requester_name){
        filter.push({
            match_phrase_prefix: { "requester_id.name": options.requester_name }
        });
    }
    if(options.is_not_replied !== undefined){
        filter.push({
            term: { "stats.is_agent_answered": !options.is_not_replied }
        });
    }
    var query = {
        index: `ticket-${idOwner}`,
        body: {
            size: isNaN(options.limit)? config.paging.limit: options.limit,
            query: {
                bool: {
                    filter: filter
                }
            },
            sort: [{
                "stats.last_time_cmt": 'desc'
            }]
        }
    };
    // call to ES json api to search
    es.search(query, (err, data)=>{
        if(err){
            console.error(err, JSON.stringify(query));
            return next(err);
        }
        return next(null, data.hits);
    });
}

/**
 * handle zalo filter
 * author: thanhdh
 */
exports.getLastTicketCmt = (idOwner, ticket_id, next) => {
    var query = {
        index: `cmt-ticket-${idOwner}`,
        body: {
            size: 1,
            query: {
                bool: {
                    filter: [{
                        term: { ed_user_id: idOwner }
                    },
                    {
                        term: {_type: 'zalo-chat'}
                    },
                    {
                        term: {ticket_id: ticket_id}
                    },
                    {
                        term: {is_internal: false}
                    },
                    {
                        term: {is_delete: false}
                    },
                    {
                        bool: {
                            must_not: [{
                                  term: {
                                      'data.is_error': true
                                  }
                              }
                           ]
                        }
                    }]
                }
            },
            sort: [{
                "add_time": 'desc'
            }]
        }
    };
    // call to ES json api to search
    es.search(query, (err, data)=>{
        if(err){
            console.error(err, JSON.stringify(query));
            return next(err);
        }
        return next(null, data.hits);
    });
};
