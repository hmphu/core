'use strict';

/**
 * Module dependencies.
 */
var config = require('../config'),
    chalk = require('chalk'),
    path = require('path'),
    mongoose = require('mongoose');

// Load the mongoose models
module.exports.loadModels = function (callback) {
    // Globbing model files
    config.files.server.models.forEach(function (modelPath) {
        require(path.resolve(modelPath));
    });

    if (callback) callback();
};

// Initialize Mongoose
module.exports.connect = function (cb) {
    var _this = this;

    var db = mongoose.connect(config.db.uri, config.db.options, function (err) {
        // Log Error
        if (err) {
            console.error(chalk.red('Could not connect to MongoDB!'));
            console.log(err);
        } else {
            // Enabling mongoose debug mode if required
            if(config.db.debug){
                mongoose.set('debug', function (collectionName, method, query, doc) {
                    console.log(`Mongoose: ${collectionName}.${method}; Query: ${JSON.stringify(query, null, 2)}; Doc: ${JSON.stringify(doc, null, 2)}`);
                });
            }else {
                mongoose.set('debug', false);
            }
            // Call callback FN
            if (cb) cb(db);
        }
    });
};

module.exports.disconnect = function (cb) {
    mongoose.disconnect(function (err) {
        console.info(chalk.yellow('Disconnected from MongoDB.'));
        cb(err);
    });
};
