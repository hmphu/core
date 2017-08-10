'use strict';
//
//  custom.setting.event.js
//  handle custom.setting events
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    enums = require('../resources/enums.res'),
    translation  = require('../resources/translate.res'),
    CustomSetting = mongoose.model('CustomSetting');


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

//ed_user_id  language  provider  provider_data
module.exports = (emitter) => {
    emitter.on('evt.cs.add_master', (options) => {

        var arr_master = createMasterData(options.language, options.provider, options.provider_data),
            tasks = [],
            index = 0;

         arr_master.forEach((item) => {
            
            var promise = new Promise((resolve, reject) => {
                item.ed_user_id = options.ed_user_id;
                item.position = index;
                item.field_key = item.field_key + '_' + options.provider;
                var cs = new CustomSetting(item);
                
                tmp_data.save('cs_add_master', options.ed_user_id, cs, cs, (err, result) =>{
                    if(err){
                        return reject(err);
                    }
                    resolve(result);
                }); 
            });
            index++;
            tasks.push(promise);
        });

        if (!tasks.length) {
            console.error("create master data custom setting fail", "add master data custom setting fail");
            return;
        }
        
        Promise.all(tasks).then(function(messages) {
             return;
        }, function(reason) {
            console.error("save master data custom setting fail", JSON.stringify(reason));
        });
        
    });
};

var createMasterData = function(language, provider, provider_data){
    language = translation[language || "en"];
    return [
        {
            name: language.choice.name,
            description: language.choice.name,
            field_key: language.choice.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.choice,
            cs_type_data: {
                is_radio: true,
                options: [
                    {value: 1, text:1},
                    {value: 2, text:2}
                  ]
            }
        },{
            name: language.date.name,
            description: language.date.name,
            field_key: language.date.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.date,
            cs_type_data: {
                is_datetime: true
            }
        },{
            name: language.drop_down.name,
            description: language.drop_down.name,
            field_key: language.drop_down.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.dropdown,
            cs_type_data: {
                is_multi_choice : true,
                values: [
                    {value: 1, text:1},
                    {value: 2, text:2}
                  ]
            }
        },{
            name: language.numeric.name,
            description: language.numeric.name,
            field_key: language.numeric.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.numeric,
            cs_type_data: {
                is_decimal: false
            }
        },{
            name: language.decimal.name,
            description: language.decimal.name,
            field_key: language.decimal.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.numeric,
            cs_type_data: {
                is_decimal: true
            }
        },{
            name: language.slider.name,
            description: language.slider.name,
            field_key: language.slider.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.slider,
            cs_type_data: {
                min: 0,
                max: 100
            }
        },{
            name: language.switch.name,
            description: language.switch.name,
            field_key: language.switch.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.switch,
            cs_type_data: {
                value: true
            }
        },{
            name: language.text.name,
            description: language.text.name,
            field_key: language.text.key,
            provider: provider,
            provider_data: provider_data || {},
            cs_type: enums.CustomFieldType.text,
            cs_type_data: {
                is_multiline: false,
                is_link: false,
                is_edittable: false
            }
        },
    ];
};
