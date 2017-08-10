'use strict';
//
//  ticket.js
//  feed ticket data for ticket schema
//
//  Created by thanhdh on 2016-03-08.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set ticket channel to provider
 * author : thanhdh
 */
exports.setTicket = (data) => {
    return {
        group_id: data.group_id,
        agent_id: data.agent_id
    };
};
