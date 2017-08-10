'use strict';
//
//  subscription.controller.js
//  handle core system routes
//
//  Created by dientn on 2016-01-05.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    utils = require('../../core/resources/utils'),
    path = require( "path" ),
    config = require(path.resolve('./config/config')),
    enums = require('../resources/enums'),
    Plan = mongoose.model('Plan'),
    userSetting = require('../../user.setting/controllers/user.setting.controller'),
    moment = require( "moment" );

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * load subscription information by id owner
 */
exports.getPlans = ( req, res, next ) =>{
    var locale = req.user.language || "en";
    //get all planpacking
    var query = {is_public : true, locale : locale},
        fields = {
            is_public: 1,
            features: 1,
            duration: 1,
            name: 1,
            price : 1,
            locale : 1,
            desc : 1,
            short_desc : 1,
            discount_opts: 1
        };

    Plan.find( query, fields ).exec( ( err, plans)=>{
        if( err ){
            return next(err);
        }
        
        res.json(plans);
    } );
};


exports.getPlan = (req, res, next)=>{
    var plan = req.plan;
    var locale = req.user.language;
    plan.price = plan.price[locale];
    plan.name.value = plan.name.value[locale];
    var discount_opts = plan.discount_opts.map(dis=>{
        var result = _.assign({}, dis._doc);
        result.name = result.name[locale];
        return result;
    });
    plan.discount_opts = discount_opts;
    res.json(plan);
};
/*
 * check current plan is max
 */
exports.checkCurrentPlanIsMax = ( req, res, next ) =>{
    var idOwner = utils.getParentUserId( req.user );
    var query = {
        locale : req.user.language || "en"
    };
    var sort = {
        "price.value" : -1
    };
    var setting = req.user.settings;
 
    var getMaxPlan = new Promise( (resolve, reject)=>{
        Plan.findOne( query ).sort( sort ).exec(( err, plan ) =>{
            if ( err ) {
                return reject(err);
            }
            if(!plan){
                return reject(new TypeError('subscription.checkMaxPlan.noData'));
            }
            resolve(plan);
        } );
    });

    getMaxPlan.then( (plan) =>{
        var maxPlanId = plan.id.toString();
        var currentPlanId = setting.plan_id.toString();
        
        var isMax = false;
        // compare plan
        if ( maxPlanId === currentPlanId ) {
            isMax = true;
        }
        
        res.json( {
            isMax : isMax
        });
    }).catch( (reason)=>{
        return next( reason );
    });
};

/**
 *  Middleware
 */

/*
 * get plan by id
 */
exports.planById = ( req, res, next, id ) =>{
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("subscription.plan_id.objectId"));
    }
    var idOwner = utils.getParentUserId(req.user);
    // find sms by id
    Plan.findById(id).exec((err, plan) => {
        if (err) {
            return next(err);
        }
        req.plan = plan._doc;
        next();
    });
};
