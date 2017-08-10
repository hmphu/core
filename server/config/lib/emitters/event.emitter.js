'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    EventEmitter = require('events'),
    config = require(path.resolve('./config/config'));

// init emitter
var emitter = new EventEmitter();
// unlimited listeners
emitter.setMaxListeners(0);

console.log('Notifier: internal event emitter started!');

module.exports = emitter;
