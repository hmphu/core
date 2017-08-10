'use strict';

const path = require('path'),
      config = require(path.resolve('./config/config')),
      utils= require('./utils'),
      crypto = require('crypto'),
      https = require('https'),
      request = require('request');

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = config.facebook.clientSecret;

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = config.facebook.assets;


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
exports.webhook = function (data, access_token, next) {
    // if no access token, do nothing
    if(!access_token){
        console.error(new TypeError(), JSON.stringify(data));
        return;
    }
    sendTextMessage(data, access_token, next);

    // send images
    (data.attachments || []).forEach(attachment =>{
        sendFileMessage(data.thread_id, attachment, access_token);
    });
};

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(data, page_access_token, next) {

    var recipientId = data.thread_id,
        messageText = data.message;

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText.length > 320? messageText.substr(0, 320): messageText,
            metadata: "izi-messenger"
        }
    };

    callSendAPI(messageData, page_access_token, next);
}

/*
 * Send an image using the Send API.
 *
 */
function sendFileMessage(recipientId, attachment, page_access_token) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: isImage(attachment)? "image": "file",
                payload: {
                    url: attachment
                }
            },
            metadata: "izi-messenger"
        }
    };

    callSendAPI(messageData, page_access_token, ()=>{});
}

function isImage(filename) {
    var parts = filename.split('.');
    var ext = parts[parts.length - 1];
    switch (ext.toLowerCase()) {
        case 'jpg':
        case 'gif':
        case 'jpeg':
        case 'png':
            return true;
    }
    return false;
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData, page_access_token, next) {
    request({
        uri: `https://graph.facebook.com/${config.facebook.version}/me/messages`
        , qs: {
            access_token: page_access_token
        }
        , method: 'POST'
        , json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s"
                    , messageId, recipientId);
                return next(null, messageId);
            } else {
                console.log("Successfully called Send API for recipient %s"
                    , recipientId);
                return next(null, null);
            }
        } else {
            error = error || (body || {}).error;
            console.error(new TypeError(JSON.stringify(error)), JSON.stringify(messageData));
            return next(error, null);
        }
    });
}
