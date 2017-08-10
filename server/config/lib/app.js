'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require('../config'),
    mongoose = require('./mongoose'),
    express = require('./express'),
    chalk = require('chalk');

// Initialize Models
mongoose.loadModels();

module.exports.init = function init(callback) {
    mongoose.connect(function (db) {
        // Initialize express
        var app = express.init(db);
        if (callback) callback(app, db, config);
    });
};

module.exports.start = function start(callback) {
    var _this = this;

    _this.init(function (app, db, config) {

        // Start the app by listening on <port>
        app.listen(config.port, function () {

            // Logging initialization
            console.log('--');
            console.log(chalk.green(config.app.title));
            console.log(chalk.green('Environment:\t\t\t' + process.env.NODE_ENV));
            console.log(chalk.green('Port:\t\t\t\t' + config.port));
            console.log(chalk.green('Database:\t\t\t\t' + config.db.uri));
            if (process.env.NODE_ENV === 'secure') {
                console.log(chalk.green('HTTPs:\t\t\t\ton'));
            }
            console.log('--');

            // start rabbitmq
            require(path.resolve('./config/lib/emitters/rabbitmq'));
            require(path.resolve('./config/lib/emitters/sender.rabbitmq'));
            // start elasticsearch
            require(path.resolve('./config/lib/elasticsearch'));

            if (callback) callback(app, db, config);
        });

    });
};
