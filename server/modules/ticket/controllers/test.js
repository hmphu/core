// list ticket archive
exports.list = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
    };
    if(req.query.start && req.query.end){
        query['add_time'] = {
            $gte: Number(req.query.start),
            $lte: Number(req.query.end)
        }
    }
    var stage = [],
        stage15 = {};
    var stage1 = {
        $match: query
    };
    var stage2 ={
        $sort: {
            add_time: req.query.sort_order ? 1 : -1
        }
    };
    var stage6 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "requester_id",
            "foreignField": "_id",
            "as": "requester_docs"
        }
    };
    var stage7 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "agent_id",
            "foreignField": "_id",
            "as": "agent_docs"
        }
    };
    var stage8 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("group"),
            "localField": "group_id",
            "foreignField": "_id",
            "as": "group_docs"
        }
    };

    var stage9 = {
        $unwind: {
            "path": "$requester_docs",
            "preserveNullAndEmptyArrays": true
        }
    };

    var stage10 = {
        $unwind: {
            "path": "$agent_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage11 = {
        $unwind: {
            "path": "$group_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage12 = {
        $project: {
            "_id": "$_id",
            "status": "$status",
            "subject": "$subject",
            "requester":{
                "_id":  "$requester_docs._id",
                "name":  "$requester_docs.name"
            },
            "agent": {
                "_id": "$agent_docs._id",
                "name": "$agent_docs.name"
            },
            "group": {
                "_id": "$group_docs._id",
                "name": "$group_docs.name"
            },
            "add_time": "$add_time",
        }
    };
    var stage14 = {
        $limit: isNaN(req.query.limit) ? config.paging.limit: Number(req.query.limit)
    };
    stage15 = {
        $match:{}
    }
    if(req.query.skip){
        if(req.query.sort_order){
            if(req.query.start && req.query.end){
                stage15.$match.add_time=  {
                    $gt: Number(req.query.skip),
                    $lte: Number(req.query.end)
                }
            } else {
                stage15.$match.add_time = {
                    $gt: Number(req.query.skip)
                }
            }
        }
        else {
            if(req.query.start && req.query.end){
                stage15.$match.add_time = {
                    $gte: Number(req.query.start),
                    $lt: Number(req.query.skip)
                }
            } else {
                stage15.$match.add_time = {
                    $lt: Number(req.query.skip)
                }
            }
        }
    }
    if(req.query.agent && mongoose.Types.ObjectId.isValid(req.query.agent)){
        stage15.$match.agent_id = mongoose.Types.ObjectId(req.query.agent);
    }
    if(req.query.requester && mongoose.Types.ObjectId.isValid(req.query.requester)){
        stage15.$match.requester_id = mongoose.Types.ObjectId(req.query.requester);
    }
    
    if(_.keys(stage15.$match).lenght > 0){
        stage = [stage1, stage2, stage15, stage6, stage7, stage8, stage9, stage10, stage11, stage12, stage14];
    } else {
        stage = [stage1, stage2, stage6, stage7, stage8, stage9, stage10, stage11, stage12,  stage14];
    }
    
    console.log(JSON.stringify(stage));
    TicketArchive.aggregate(stage).allowDiskUse(true).exec((err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        res.json(result);
    })
}

exports.count = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
    };
    if(req.query.start && req.query.end){
        query['add_time'] = {
            $gte: Number(req.query.start),
            $lte: Number(req.query.end)
        }
    }
    var stage = [],
        stage3 = {};
    var stage1 = {
        $match: query
    };
    var stage2 ={
        $sort: {
            add_time: req.query.sort_order ? 1 : -1
        }
    };
    stage3 = {
        $match:{}
    }
    if(req.query.skip){
        if(req.query.sort_order){
            if(req.query.start && req.query.end){
                stage3.$match.add_time=  {
                    $gt: Number(req.query.skip),
                    $lte: Number(req.query.end)
                }
            } else {
                stage3.$match.add_time = {
                    $gt: Number(req.query.skip)
                }
            }
        }
        else {
            if(req.query.start && req.query.end){
                stage3.$match.add_time = {
                    $gte: Number(req.query.start),
                    $lt: Number(req.query.skip)
                }
            } else {
                stage3.$match.add_time = {
                    $lt: Number(req.query.skip)
                }
            }
        }
    }
    if(req.query.agent && mongoose.Types.ObjectId.isValid(req.query.agent)){
        stage3.$match.agent_id = mongoose.Types.ObjectId(req.query.agent);
    }
    if(req.query.requester && mongoose.Types.ObjectId.isValid(req.query.requester)){
        stage3.$match.requester_id = mongoose.Types.ObjectId(req.query.requester);
    }
    
    if(_.keys(stage15.$match).lenght > 0){
        stage = [stage1, stage2, stage13];
    } else {
        stage = [stage1, stage2];
    }
//    if(req.query.skip){
//        if(req.query.sort_order){
//            if(req.query.start && req.query.end){
//                stage3 = {
//                    $match:{
//                        add_time: {
//                            $gt: Number(req.query.skip),
//                            $lte: Number(req.query.end)
//                        }
//                    }
//                }
//            } else {
//                stage3 = {
//                    $match:{
//                        add_time: {
//                            $gt: Number(req.query.skip)
//                        }
//                    }
//                }
//            }
//
//        } else {
//            if(req.query.start && req.query.end){
//                stage3 = {
//                    $match:{
//                       add_time: {
//                            $gte: Number(req.query.start),
//                            $lt: Number(req.query.skip)
//                        }
//                    }
//                }
//            } else {
//                stage3 = {
//                    $match: {
//                        add_time: {
//                            $lt: Number(req.query.skip)
//                        }
//                    }
//                }
//            }
//        }
//        stage = [stage1, stage2, stage3];
//    } else {
//        stage = [stage1, stage2];
//    }
    TicketArchive.aggregate(stage).allowDiskUse(true).exec((err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        res.json(result.length);
    });
};