'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    sendmail = require('../resources/sendmail'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller')),
    redis = require(path.resolve('./config/lib/redis')),
    _ = require('lodash');

/**
 * override console.error and send mail when there are errors
 */
var overrideConsole = function(app){
    console.error = (err, context, isNotOverride) => {
        // override error object
        if(!isNotOverride){
            if(typeof err == 'string'){
                err = new Error(err);
            } else if(typeof err == 'object' && !err.stack){
                err = new Error(err.toString() == '[object Object]'?JSON.stringify(err): err.toString());
            }
            var isUnique = errorHandler.getUniqueErrorMessage(err);
            // send a single error back
            if(err instanceof TypeError){
                err.stack = JSON.stringify(errorHandler.getSingleMessage(err.message))
            }
            // send a validation errors back
            else if(err instanceof mongoose.Error.ValidationError){
                err.stack = JSON.stringify(err.message);
            }
            // mongo unique error
            else if(isUnique instanceof Error){
                err.stack = JSON.stringify({[isUnique.message]: 'common.unique'});
            }
        }

        var data = {
            message: err.stack,
            context: context
        };
        var options = {
            template : `modules/core/templates/sys-error.html`,
            from : config.mailer.from,
            to : config.mailer.errorlog,
            subject : '[izi-core-sys-error]'
        };
        // send mail for any system error
        sendmail(data, options);
        // print out to the console
        process.stderr.write(data.message);
    };
};

/**
 * Module init function.
 */
module.exports = function(app, db) {
    // override console.error
    overrideConsole(app);
};
