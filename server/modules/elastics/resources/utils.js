'use strict';
//
//  utils.js
//  handle core system routes
//
//  Created by vupl on 2017-03-01.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    enumsTicket = require('../../ticket/resources/enums'),
    client = require(path.resolve('./config/lib/elasticsearch'));

exports.sendElasticsAlias = (data, next) =>{
    client.indices.updateAliases({
        body: {
            "actions":data
        }
    }, (err, res) =>{
        if(err){
            console.error(err, `send elastics alias error data => ${JSON.stringify(data)}`);
            if(next){
                return next(err);
            }
            return;
        }
        console.log(res);
        if(next) {
            return next(null, res);
        }
        return;
    });
};

exports.sendElasticsCreatedIndex = (index, data_mapping, next) =>{
    client.indices.create({
        index: index,
        body: data_mapping
    }, (err, res) =>{
        if(err){
            if(next){
                return next(err);
            }
            return;
        }
        console.log(res);
        if(next){
            return next(null, res);
        }
        return;
    })
}

exports.sendElastics = (array) =>{
    client.bulk({
        body:array
    }, (err, res) =>{
        if(err){
            console.error(err,`error send elastics`);
            return;
        }
        if(res && res.errors){
            _.forEach(res.items, (item) =>{
                if(item.create.status != 201){
                    console.error(item.create, `import elastic error`);
                }
            });
        }
        console.log(JSON.stringify(res));
        return;
    });
};

exports.sendCreated = (data) =>{
    client.create(data, (err, res) =>{
        if(err){
            console.error(err, `send created elastics error ${JSON.stringify(data)}`);
            return;
        }
        console.log(JSON.stringify(res));
        return;
    });
};

exports.sendUpdated = (data) =>{
    client.update(data, (err, res) =>{
        if(err){
            console.error(err, `send update elastics error ${JSON.stringify(data)}`);
            return;
        }
        console.log(JSON.stringify(res));
        return;
    })
}

exports.sendDelete = (data) =>{
    client.delete(data, (err, res) =>{
        if(err){
            console.error(err, `send delete elastics error ${JSON.stringify(data)}`);
            return;
        }
        console.log(JSON.stringify(res));
        return;
    });
};

exports.sendUpdateByQuery = (data) =>{
    client.updateByQuery(data, (err, res) =>{
        if(err){
            console.log(err, `send update by query error ${JSON.stringify(data)}`);
            return;
        }
        console.log(JSON.stringify(res));
        return;
    })
}

exports.channelMapping = (provider) =>{
    switch(provider){
        case enumsTicket.Provider.fbMessage:
            return 'fb-chat';
            break;
        case enumsTicket.Provider.fbComment:
            return 'fb-comment';
            break;
        case enumsTicket.Provider.iziComment:
            return 'izi-comment';
            break;
        case enumsTicket.Provider.iziChat:
            return 'izi-chat';
            break;
        case enumsTicket.Provider.api:
            return 'izi-api';
            break;
        case enumsTicket.Provider.web:
            return 'web';
            break;
        case enumsTicket.Provider.voip:
            return 'voip';
            break;
        case enumsTicket.Provider.sms:
            return 'sms';
            break;
        case enumsTicket.Provider.iziMail:
            return 'izi-mail';
            break;
        case enumsTicket.Provider.gmail:
            return 'gmail';
            break;
        case enumsTicket.Provider.youtube:
            return 'youtube';
            break;
        case enumsTicket.Provider.zaloMessage:
            return 'zalo-chat';
            break;
        default:
            return 'undefined';
            break;
    }
}
