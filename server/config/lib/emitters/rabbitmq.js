'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    amqp = require('amqplib/callback_api'),
    rabbitCore = require(path.resolve('./modules/rabbitmq/rabbitmq/rabbitmq.core')),
    config = require(path.resolve('./config/config'));

// if the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;

/**
 * start connecting to rabbitmq
 * author : thanhdh
 */
function start() {
    var uri = `amqp://${config.rabbit.user}:${config.rabbit.pass}@${config.rabbit.ip}:${config.rabbit.port}/${config.rabbit.vhost}`;

    amqp.connect(uri, function (err, conn) {
        if (err) {
            console.error(err, "[AMQP]");
            return setTimeout(start, config.rabbit.reconnectTimeout);
        }
        conn.on("error", function (err) {
            if (err.message !== "Connection closing") {
                console.error(err, "[AMQP] conn error");
            }
        });
        conn.on("close", function () {
            console.log("[AMQP] reconnecting");
            return setTimeout(start, config.rabbit.reconnectTimeout);
        });

        console.log("[AMQP] connected");
        amqpConn = conn;

        whenConnected();
    });
}

/**
 * start binding publisher and workers
 * author : thanhdh
 */
function whenConnected() {
    startPublisher();
    startWorker();
}

var pubChannel = null;
var offlinePubQueue = [];

/**
 * create a confirm channel and send message
 * author : thanhdh
 */
function startPublisher() {
    amqpConn.createConfirmChannel(function (err, ch) {
        if(closeOnErr(err)){
            return;
        }
        ch.on("error", function (err) {
            console.error(err, "[AMQP] channel error");
        });
        ch.on("close", function () {
            console.log("[AMQP] channel closed");
        });

        pubChannel = ch;
        while (true) {
            var m = offlinePubQueue.shift();
            if (!m) break;
            publish(m[0], m[1], m[2]);
        }
    });
}

/**
 * method to publish a message, will queue messages internally if the connection is down and resend later
 * author : thanhdh
 */
function publish(exchange, routingKey, content, headers) {
    try {
        var ex_options = {durable: true},
            type = 'topic';
        if(headers && (headers['x-delay'] || headers['x-delay'] == 0)){
            ex_options['arguments'] = {'x-delayed-type': 'direct'};
            type = 'x-delayed-message';
        }
        pubChannel.assertExchange(exchange, type, ex_options);
        pubChannel.assertQueue(routingKey, {durable: true}, function(err, q) {
            pubChannel.bindQueue(q.queue, exchange, routingKey);
        });
        pubChannel.publish(exchange, routingKey, content, {persistent: true, headers: headers || {}}, function (err, ok) {
            if (err) {
                console.error(err, "[AMQP] publish");
                offlinePubQueue.push([exchange, routingKey, content]);
                pubChannel.connection.close();
            }
        });
    } catch (e) {
        console.error(e, "[AMQP] publish");
        offlinePubQueue.push([exchange, routingKey, content]);
    }
}

/**
 * A worker that acks messages only if processed succesfully
 * author : thanhdh
 */
function startWorker() {
    amqpConn.createChannel(function (err, ch) {
        if (closeOnErr(err)){
            return;
        }
        ch.on("error", function (err) {
            console.error(err, "[AMQP] channel error");
        });
        ch.on("close", function () {
            console.log("[AMQP] channel closed");
        });
        ch.prefetch(config.rabbit.prefetch);
        assertQueue(ch, {
            exchange: config.rabbit.receiver.exchange,
            type: 'topic',
            exOptions: {durable: true},
            queues: config.rabbit.receiver.queues,
            env_queues: process.env.QUEUES,
            env_q_override: process.env.QUEUE_OVERWRITE
        });
        if(config.rabbit.receiver.delayed){
            assertQueue(ch, {
                exchange: config.rabbit.receiver.delayed.exchange,
                type: 'x-delayed-message',
                exOptions: {durable: true, arguments: {'x-delayed-type': 'direct'}},
                queues: config.rabbit.receiver.delayed.queues,
                env_queues: process.env.DELAYED_QUEUES,
                env_q_override: process.env.DELAYED_QUEUE_OVERWRITE
            });
        }
        console.log("Worker is started");
    });
}

function assertQueue(ch, opts){
    // assert exchange
    ch.assertExchange(opts.exchange, opts.type, opts.exOptions);

    // get list of public queues and specific queues fron config
    let env_queues = opts.env_queues? JSON.parse(opts.env_queues): [],
        env_q_override = JSON.parse(opts.env_q_override|| false);

    // get list of public queues and specific queues fron config
    let queues = env_q_override? env_queues: opts.queues.concat(env_queues);
    queues.forEach(queue=>{
        ch.assertQueue(queue, {durable: true}, function(err, q) {
            console.log(`[*][${opts.exchange}] Watching for ${queue} queue`);
            // bind queue to an exchange by a specific routing key
            ch.bindQueue(q.queue, opts.exchange, q.queue);
            // watch binded queues
            ch.consume(q.queue, processMsg, {noAck: false});
        });
    });

    function processMsg(msg) {
        work(msg, function (ok) {
            try {
                if(ok === false){
                    ch.reject(msg, true);
                } else{
                    ch.ack(msg);
                }
            } catch (e) {
                closeOnErr(e);
            }
        });
    }
}


/**
 * send message to rabbitCore for processing and ack if ok
 * author : thanhdh
 */
function work(msg, cb) {
    var data;
    try{
        var content = msg.content.toString();
        if(config.db.debug){
            console.log(" [x] %s:'%s'", msg.fields.routingKey, content);
        }
        // parse data
        data = JSON.parse(content);
        data.topic = msg.fields.routingKey;
    } catch(ex){
        console.error(ex, "[AMQP] parse received data failed: "+msg.content.toString());
    }
    if(!data){
        return;
    }
    // send data to rabbit core to handle
    rabbitCore(data, cb);
}

function closeOnErr(err) {
    if (!err){
        return false;
    }
    console.error(err, "[AMQP] error");
    amqpConn.close();
    return true;
}

start();

/**
 * Module init function.
 */
module.exports = {
    publish: publish
};
