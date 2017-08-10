'use strict';

/**
 * Module dependencies.
 */
var path = require('path');

/**
 * send data to queue
 * author : thanhdh
 */
function sender(exchange, message, done){
    require(path.resolve('./config/lib/emitters/rabbitmq')).publish(exchange, message.topic, new Buffer(JSON.stringify(message)), message.headers);
};

/**
 * Module init function.
 */
module.exports = sender;
