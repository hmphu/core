'use strict';
//
//  dropdown.js
//  feed dropdown data for custom setting schema
//
//  Created by thanhdh on 2016-03-08.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');
/**
 * set dropdown channel to provider
 * author : thanhdh
 * ex:
 *    {
 *        values: [{
 *            text: 'label',
 *            value: 0,
 *            position: 1
 *        }],
 *        is_multi_choice: true,
 *        is_empty_option: true
 *    }
 */
exports.setDropdown = (data) => {
    data.values = _.sortBy((data.values || []), ['position']);
    var value = {
        values: data.values || [], // array of value and text
        is_multi_choice: data.is_multi_choice || false,
        is_searchable: data.is_searchable || false
    };
    
    if(value.is_multi_choice === true && value.is_searchable === true){
        value.is_multi_choice = false;
        value.is_searchable = false;
    }

    return value;
};
