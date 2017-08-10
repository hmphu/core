'use strict';

var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    CustomSetting =mongoose.model('CustomSetting'),
    User = mongoose.model('User'),
    utils = require('../resources/utils'),
    enumsCustomSetting = require('../../custom.setting/resources/enums.res'),
    client = require(path.resolve('./config/lib/elasticsearch'));

var getCustomField = (ed_user_id, data, provider) =>{
    return new Promise((resolve, reject) =>{
        var field = {},
            field_keys = _.keys((data || {}));
        if(field_keys.length == 0 ){
           return resolve();
        }
        var query = {
            ed_user_id: ed_user_id,
            provider: provider,
            field_key : {$in : field_keys}
        };
        CustomSetting.find(query, (err, result) =>{
            if(err){
                return resolve();
            }
            if(result.length == 0){
                return resolve();
            }
            _.forEach(result, (item) =>{
                if(_.indexOf(field_keys, item.field_key) != -1){
                    field[`${item._id}`] = {
                        field_key : item.field_key,
                        cs_type: item.cs_type,
                        value: data[`${item.field_key}`]
                    }
                }
            });
            return resolve(field);
        });
    });
};


var runProfile = (query, handler) =>{
    var number_user = 0;
    User.count(query, (err_count, result_count) =>{
        if(err_count){
            console.error(err_count, "err count user");
        }
        number_user = result_count ? result_count : 0;
    });
    var stage = [];

    var stage1 = {
            $match: query
        };

    var stage2 = {
            $project: {
                "_id": 1,
                "add_time": 1,
                "additional_provider_data": 1,
                "ed_parent_id": 1,
                "email": 1,
                "fields": 1,
                "is_requester": 1,
                "is_suspended": 1,
                "is_verified": 1,
                "language": 1,
                "name": 1,
                "org_id": 1,
                "password": 1,
                "profile_image": 1,
                "provider": 1,
                "provider_data": 1,
                "reset_password_expires": 1,
                "reset_password_token": 1,
                "roles": 1,
                "salt": 1,
                "sub_domain": 1,
                "tags": 1,
                "time_format": 1,
                "time_zone": 1,
                "upd_time": 1
            }
        };
    var stage3 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("user_contact"),
                "localField": "_id",
                "foreignField": "user_id",
                "as": "user_contact_docs"
            }
        };
    var stage4 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("organization"),
                "localField": "org_id",
                "foreignField": "_id",
                "as": "org_docs"
            }
        };
    var stage5 = {
            $unwind: {
                    "path": "$org_docs",
                    "preserveNullAndEmptyArrays": true
            }
        };
    var stage6 = {
            $project: {
                "_id": 1,
                "add_time": 1,
                "additional_provider_data": 1,
                "contacts" : "$user_contact_docs",
                "ed_user_id": {
                    $ifNull: ["$ed_parent_id", "$_id"]
                },
                "email": 1,
                "fields": 1,
                "is_requester" : 1,
                "is_suspended": 1,
                "is_verified": 1,
                "language": 1,
                "name": 1,
                "org_id": {
                    "_id": "$org_docs._id",
                    "name": "$org_docs.name"
                },
                "password": 1,
                "profile_image": 1,
                "provider": 1,
                "provider_data": 1,
                "reset_password_expires": 1,
                "reset_password_token": 1,
                "roles": 1,
                "salt": 1,
                "sub_domain": 1,
                "tags": 1,
                "time_format": 1,
                "time_zone": 1,
                "upd_time": 1
            }
        };
    stage = [stage1, stage2, stage3, stage4, stage5, stage6];
    var cursor = User.aggregate(stage).cursor({ batchSize : 1000 }).exec();
    var array_user = [],
        total_user = 0,
        total_user_undefined = 0,
        count = 0;
    cursor.each((err, doc) =>{
        if(err){
            if(handler){
                return handler(err);
            }
            console.log(err);
            return;
        }
        if(doc == null){
            if(handler){
                return handler(null, doc);
            }
            return;
        }
        Promise.all([getCustomField(doc.ed_user_id, doc.fields, enumsCustomSetting.Provider.user)]).then(result =>{
            if(doc.ed_user_id != undefined){
                doc.fields = result[0];
                if(handler){
                    return handler(null, doc);
                }
                var data = {
                    create: {
                        _index: `profile-${doc.ed_user_id}`,
                        _type: doc.is_requester ? 'requester' : 'agent',
                        _id: doc._id
                    }
                };
                array_user.push(data);
                delete doc.is_requester;
                delete doc._id;
                array_user.push(doc);
                count++;
                total_user++;
            } else {
                if(handler){
                    return handler(null, null);
                }
                total_user_undefined++;
                console.log("user undefined", JSON.stringify(doc));
            }
            if(count == 5000){
                console.log("count send", count);
                console.log("count send", total_user);
                utils.sendElastics(array_user);
                count = 0;
                array_user = [];
            } else {
                let total = total_user + total_user_undefined;
                if(total == number_user){
                    utils.sendElastics(array_user);
                    console.log("count send", count);
                    console.log("count send", total_user);
                    console.log("count profile undefined", total_user_undefined);
                    console.log("finish");
                }
            }
        }).catch(error =>{
            console.error(error, "error promise user");
        })
    })
};

var runUpdate = (data) =>{
    var query = {
        _id: mongoose.Types.ObjectId(data.o2._id)
    };
    runProfile(query, (err, result) =>{
        if(err){
            console.error(err, 'update user to elastics error');
            return;
        }
        if(!result){
            return;
        }
        if(!result.ed_user_id == undefined){
            return;
        }
        var update_user_in_ticket = {
            index: `ticket-${result.ed_user_id}`,
            body: {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "term": {
                                    "ed_user_id": `${result.ed_user_id}`
                                }
                            },
                            {
                                "bool": {
                                    "should": [
                                        {
                                            "term": {
                                                "submitter_id._id" : `${result._id}`
                                            }
                                        },
                                        {
                                            "term": {
                                                "agent_id._id": `${result._id}`
                                            }
                                        },
                                        {
                                            "term": {
                                                "requester_id._id": `${result._id}`
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                },
                "script": {
                    "inline": `if(ctx._source.submitter_id != null && ctx._source.submitter_id._id == '${result._id}') ctx._source.submitter_id = params.submitter_id;if(ctx._source.requester_id != null && ctx._source.requester_id._id == '${result._id}') ctx._source.requester_id = params.requester_id;if(ctx._source.agent_id != null && ctx._source.agent_id._id == '${result._id}') ctx._source.agent_id = params.agent_id;`,
                    "params": {
                        requester_id: {
                            "name": result.name,
                            "_id": result._id,
                            "field": result.fields
                        },
                        submitter_id: {
                            "_id": result._id,
                            "name": result.name
                        },
                        "agent_id": {
                            "name": result.name,
                            "_id": result._id,
                            "field": result.fields
                        }
                    }
                }
            }
        };
        var update_user_id_ticket_cmt = {
            index: `cmt-ticket-${result.ed_user_id}`,
            body: {
                query: {
                    term : {
                        "user_id._id": `${result._id}`,
                    }
                },
                script: {
                    inline: `ctx._source.user_id.name = '${result.name}'`
                }
            }
        };
        utils.sendUpdateByQuery(update_user_in_ticket);
        utils.sendUpdateByQuery(update_user_id_ticket_cmt);
        return;
    });
}

exports.execProfile = (req, res, next) =>{
    var roles = req.query.roles;
    var params = {
        query : {}
    };
    if(roles != undefined){
        let arr_roles = roles.split(',');
        params.query['roles'] = {
            $in : arr_roles
        }
    }
    runProfile(params.query);
    res.json({});
};

exports.syncElasticUser = (data) =>{
    if( data.op == 'i' ){
        var query = {
            _id: mongoose.Types.ObjectId(data.o._id)
        };
        runProfile(query, (err, result) =>{
            if(err){
                console.error(err, 'sync insert user to elastics error');
                return;
            }
            if(!result){
                return;
            }
            var insert_elastic = {
                index: `profile-${result.ed_user_id}`,
                type: result.is_requester ? 'requester' : 'agent',
                id: `${result._id}`
            };
            delete result._id;
            insert_elastic.body = result
            utils.sendCreated(insert_elastic);
            return;
        });
    } else if( data.op == 'u' ){
        var query = {
            _id: mongoose.Types.ObjectId(data.o2._id)
        };
        var data_update = (data.o['$set'] || {});
        if(data_update['name'] || data_update['fields']){
            runUpdate(data);
        }
        runProfile(query, (err, result) =>{
            if(err){
                console.error(err, 'sync update user elastic error');
                return;
            }
            if(!result){
                return;
            }
            var update_elastic = {
                index: `profile-${result.ed_user_id}`,
                type: result.is_requester ? 'requester' : 'agent',
                id: `${result._id}`
            };
            delete result._id;
            update_elastic.body = {
                doc: result
            };
            update_elastic.retryOnConflict = 2;
            utils.sendUpdated(update_elastic);
            return;
        });
    } else {
        var delete_elastic = {
            index: `profile-index`,
            id: `${data.o._id}`
        };
        utils.sendDelete(delete_elastic);
        return;
    }
}
