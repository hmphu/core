'use strict';
//
//  elastic.js
//  handle elastic search for face
//
//  Created by dientn on 2017-04-03.
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
 * handle facebook filter
 * author: dientn
 */
exports.filterTicket = (idOwner, options, next) => {
    var filter = [
        {
            term: { ed_user_id: idOwner }
        },
        {
            terms: { "data.page_id": options.page_ids }
        },
        {
            range: { status: {lt: ticketEnums.TicketStatus.Solved} }
        },
        {
            term: {_type: options.ticket_type}
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

    // filter fb post
    if(options.ticket_type == 'fb-comment'){
        if(!options.is_user_post){// wall post
            filter.push({
                bool:{
                     must_not: [{
                          term: {
                              'data.is_user_post': true
                          }
                      }
                   ]
                }
            });
        }else{ // userpost
            filter.push({
                bool:{
                    must: {
                      term: {
                          'data.is_user_post': true
                      }
                    }
                }
            });
        }
    }

    if(options.skip){
        filter.push({
            range: {
                "stats.last_time_cmt": {
                    lt: options.skip
                }
            }
        });
    }
    if(options.search){
        filter.push({
            match_phrase_prefix: { "data.sender_name": options.search }
        });
//        filter.push({
//            regexp: { "data.sender_name": options.search.toLowerCase().replace(/\s+/gi, '|') }
//        });
    }
    // filter unanswered
    if(options.is_answered == false){
        filter.push({
            bool:{
                must_not: [{
                    term: {
                          'stats.is_agent_answered': true
                      }
                    }
                ]
            }
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
 * get  last fb ticket comment
 * author: dientn
 */
exports.getLastTicketCmt = (idOwner, comment_type, ticket_id, next) => {
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
                        term: {_type: comment_type }
                    },
                    {
                        term: {ticket_id: ticket_id}
                    },
                    {
                         bool: {
                            must_not: [{
                                  term: {
                                      is_internal: true
                                  }
                              }
                           ]
                        }
                    },
                    {
                         bool: {
                            must_not: [{
                                  term: {
                                      is_delete: true
                                  }
                              }
                           ]
                        }
                    },
//                    {
//                        bool: {
//                            must_not: [{
//                                  term: {
//                                      'data.is_error': true
//                                  }
//                              }
//                           ]
//                        }
//                    }
                    ]
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
        return next(null, data.hits.hits[0]);
    });
};

/**
 * get  last fb ticket comment
 * author: dientn
 */
exports.getPost = (idOwner, post_id, next) => {
    var query = {
        index: `ticket-${idOwner}`,
        type: 'fb-post',
        id: post_id
    };
    // call to ES json api to search
    es.get(query, (err, data)=>{
        if(err && !data){
            console.error(err);
//            console.error(data);
//            console.error(err, JSON.stringify(query));
            return next(err);
        }
        return next(null, data);
    });
};

exports.getConversation = (idOwner, options, next) =>{
    var filter = [
        {
            term: { ed_user_id: idOwner }
        },
        {
            term: { "data.page_id": options.page_id }
        },
        {
            term: {"data.thread_id": options.thread_id}
        },
        {
            term: {_type: options.ticket_type}
        }
    ];
    var query = {
        index: `cmt-ticket-${idOwner}`,
        body: {
            from: isNaN(options.skip)? 0: options.skip,
            size: isNaN(options.limit)? config.paging.limit: options.limit,
            query: {
                bool: {
                    filter: filter
                }
            },
            sort: [{
                "add_time": 'desc'
            }]
        }
    };
    es.search(query, (err, data)=>{
        if(err){
            console.error(err, JSON.stringify(query));
            return next(err);
        }
        return next(null, data.hits);
    });
};