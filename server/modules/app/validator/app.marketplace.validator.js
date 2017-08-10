'use strict';
//
// organization.validator.js
// check the validity of organization functions
//
// Created by khanhpq on 2016-01-06.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    path            = require('path'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller')),
    mongoose        = require('mongoose'),
    _               = require('lodash'),
    fs              = require('fs'),
    AppUser         = mongoose.model("AppUser");

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

// check exist app by name
var checkValidApp = ( data ) =>{
    return new Promise( ( resolve, reject )=>{
        AppUser.findOne({market_id: data.app_id, ed_user_id: data.parrent_id}, (err, result) =>{
            if ( err ) {
                console.error(err);
                return reject("validator.market.app_unavailable");
            }

            if (result){
                return reject( "validator.market.app_exist" );
            }
            
            resolve( data );
        });
    });
};

// check exit folder app on market place
var checkAppFolder = ( data )=>{
    return new Promise( ( resolve, reject ) =>{
        var path_app_market = `assets/marketplace/${data.app_name}`;
        fs.stat(path_app_market, (err, stat) =>{
            if (err) {
                return reject(err);
            }

            if ( !(stat && stat.isDirectory()) ) {
                return reject( "validator.market.app_unavailable" );
            }
            resolve();
        });
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators install app from marketplace @author: dientn
 */
exports.install = ( data, next ) => {
    
    var success = ( result )=>{
        return next();
    };
    var error = ( reason )=>{
        return next( new TypeError(reason) );
    };
    
    checkValidApp( data ).then( checkAppFolder )
        .then( success )
        .catch( error );
};
