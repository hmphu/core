"use strict";

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var PlanSchema = new Schema( {
    name: {
        value: {
            en: String,
            vi: String
        },
        seo_uri: {
            type: String,
            index: true,
            unique: true
        }
    },
    locale: String,
    ref_plan_id: {
        type:  Schema.Types.ObjectId,
        ref: "Plan",
        index: true
    },
    ref_lang_plan: {
        type:  [Schema.Types.ObjectId],
        ref: "Plan",
        index: true
    },
    duration: {
        type: Number, // in months
        default: 0
    },
    price: {
        en:{
            value: Number,
            currency: String
        },
        vi:{
            value: Number,
            currency: String
        }
        //... etc
    },
    short_desc: {
        en: String,
        vi: String
        //... etc
    },
    desc: {
        en: String,
        vi: String
        //... etc
    },
    features: {
//        exapmple data
//        emails:{
//                is_active: {
//                    type: Boolean,
//                    default: false
//                },
//                quantity:Number,
//                current_no: Number
//            },
//            facebooks:{
//                is_active: {
//                    type: Boolean,
//                    default: false
//                },
//                current_no: Number
//                quantity:Number
//            },
//            voip:{
//                is_active: {
//                    type: Boolean,
//                    default: false
//                }
//            },
//            izi_chat:{
//                is_active: {
//                    type: Boolean,
//                    default: false
//                }
//            },
//            sms:{
//                is_active: {
//                    type: Boolean,
//                    default: false
//                }
//            },
//            izi_comment:{
//                is_active: {
//                    type: Boolean,
//                    default: false
//                }
//            },
//            rest_api:{
//                is_active: {
//                    type: Boolean,
//                    default: false
//                }
//            }
        channels:{},
//        example data
//        triggers:{
//                is_active:{
//                    type: Boolean,
//                    default: false
//                },
//                current_no: Number
//                quantity:Number
//            },
//            automations:{
//                is_active:{
//                    type: Boolean,
//                    default: false
//                },
//                current_no: Number
//                quantity:Number
//            },
//            slas:{
//                is_active:{
//                    type: Boolean,
//                    default: false
//                },
//                current_no: Number
//                quantity:Number
//            },
//            macros:{
//                is_active:{
//                    type: Boolean,
//                    default: false
//                },
//                current_no: Number
//                quantity:Number
//            },
//            custom_fields:{
//                is_active:{
//                    type: Boolean,
//                    default: false
//                },
//                current_no: Number
//                quantity:Number
//            },
//            attachments: Number,
//            business_hours:{
//                type: Boolean,
//                default: false
//            }
        productivity:{
            
        },
//        example data
//        genaral_report: {
//                type: Boolean,
//                default: false
//            },
//            insights: {
//                "is_active":{
//                    type: Boolean,
//                    default: false
//                },
//                current_no: Number
//                quantity:Number
//                
//            }
        reports:{
            
        },
        // data
//        {
//            ticket_archive:{
//                is_active:{
//                     type: Boolean,
//                    default: false
//                },
//                cycle_life: Number
//            }
//        }
        storage:{},
//        data
//        marketplace:{
//                type: Boolean,
//                default: false
//            },
//            custom_apps: {
//                type: Boolean,
//                default: false
//            }
        applications:{},
//        data
//        email_template: {
//                type: Boolean,
//                default: false
//            },
//            review_template: {
//                type: Boolean,
//                default: false
//            }
        branding_customize:{
            
        },
//        data
//        email: {
//                type: Boolean,
//                default: false
//            },
//            izi_chat: {
//                type: Boolean,
//                default: false
//            }
        supports:{}
    },
    discount_opts: [{
        name: {
            en: String,
            vi: String
        },
        terms: Number,
        // in months
        discount_months: {
            type: Number,
            default: 0
        }
    }],
    is_public: {
        type: Boolean,
        default: false,
        index: true
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex
});

mongoose.model( "Plan", PlanSchema, config.dbTablePrefix.concat( "plan" ) );
