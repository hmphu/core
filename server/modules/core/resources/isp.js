'use strict'
//
//  isp.js
//  add isp email
//
//  Created by dientn on 2016-01-12.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var path = require('path'),
    config = require(path.resolve('./config/config')),
    querystring = require("querystring"),
    https = require("https");

/*
 *  add domain and domain alias from remote server
 * @author: dientn
 */
module.exports = ( options, handler ) => {
    // Build the post string from an object
    var post_data = querystring.stringify( {
        "action" : options.action,
        "current_domain" : options.current_domain || null,
        "mail_domain" : options.mail_domain,
        "mail_src" : options.mail_src,
        "mail_dest" : options.mail_dest
    } );

    // encode user/pass by base64
    var user = new Buffer( config.isp.user ).toString( "base64" );
    var pass = new Buffer( config.isp.pass ).toString( "base64" );

    var opts = {
        host : config.isp.host,
        port : config.isp.port,
        path : "/remote/auth.php?secret=" + config.isp.secret,
        method : "POST",
        rejectUnauthorized : false,
        headers : {
            "Authorization" : "izihelp:" + user + ":" + pass,
            "Content-Type" : "application/x-www-form-urlencoded",
            "Content-Length" : Buffer.byteLength(post_data, "utf8")
        }
    };
    var req = https.request( opts, function ( res ) {
        var data = "";
        res.on( "data", function ( response ) {
            data += response;
        } );
        res.on( "end", function ( response ) {
            var result = {};
            try {
                result = JSON.parse( data.toString() );
            } catch ( e ) {
                result = {};
            }
            if ( result.is_error === false ) {
                return handler( null, result );
            } else {
                return handler( ( result.is_error === true ? result.errors : true ), null );
            }
        } );
    } );
    // post the data
    req.write( post_data );
    req.end();
    // if error happens
    req.on( "error", function ( e ) {
        return handler( true, null );
    } );
};
