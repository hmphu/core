var moment = require('moment');
var mongoose = require('mongoose');
var WikiCategory = mongoose.model('WikiCategory');
var WikiSection = mongoose.model('WikiSection');
var WikiArticle = mongoose.model('WikiArticle');
var WikiStats = mongoose.model('WikiStats');
var fs = require('fs');
var fs_extra = require('fs-extra');
var _ = require('lodash');
var php = require("phpjs");
var path = require('path');
var utils = require('../../core/resources/utils');
var file = require('../../core/resources/file');
var config = require(path.resolve('./config/config'));
var validate = require('../validator/app.wiki.validator');
var allowed_extension = ".jpg .png .gif .doc .docx .pptx .ppt .pdf .jpeg";
//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========


// update stats collection
var updateStats = (search, user)=>{
    var idOwner = utils.getParentUserId(user);
    WikiStats.findOne({search: search, ed_user_id: idOwner}).exec((err, result)=>{
        if(err){
            console.error(err);
            return;
        }
        if(!result){
            var stat = new WikiStats({
                ed_user_id:idOwner,
                search: search,
                count: 1,
                counter: [{ agent: user._id, count:1}]
            });
            stat.save((errAdd)=>{
                if(errAdd){
                    console.error(errAdd);
                }
            });
        }
        else {
            var index = _.findIndex(result.counter, { agent: user._id});
            if( index != -1 ){
                result.count +=1;
                result.counter[index].count +=1;
            }else{
                result.count +=1;
                result.counter = _.concat(result.counter, {agent: user._id, count: 1});
            }
            result.save((errSave)=>{
                if(errSave){
                    console.error(errSave);
                }
            });
        }
    });
}
// get ====================================================

/**
 * list category by query
 */

exports.findCategory = function ( req, res, next ) {
    var idOwner = utils.getParentUserId(req.user);
    var limit = isNaN(Number(req.query.limit))? Number(req.query.limit): config.paging.limit;
    var skip = isNaN(Number(req.query.skip))? Number(req.query.skip): 0 ;
    var query = {
        ed_user_id: idOwner,
        $or:[
            {
                user_created: req.user._id
            },
            {
                is_public: true
            }
        ]
    };
    var populate = {
        path: 'user_created',
        select: 'name profile_image roles'
    };
    WikiCategory.find(query)
    .select('_id title user_created description add_time upd_time')
    .sort({add_time: -1})
    .skip(skip)
    .limit(limit)
    .populate(populate)
//    .lean()
    .exec(( err, result )=> {
        if(err){
            return next(err);
        }
        return res.json(result);
    });
};


/**
 * get category by by id
 */

exports.findCategoryById = function ( req, res, next, id ) {
    // check the validity of id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("wiki.category.cat_id.objectId"));
    }
    var idOwner = utils.getParentUserId(req.user);
    var populate =[
        {
            path: 'user_created',
            select: 'name profile_image roles'
        },
        {
            path: 'user_updated',
            select: 'name profile_image roles'
        }
    ];

    WikiCategory.findById(id)
    .populate(populate)
//    .select('_id ed_user_id title user_created user_updated description add_time upd_time')
    .exec( function ( err, result ) {
        if(err || !result){
            return next(err || new TypeError('wiki.category.not_found'));
        }
        
        if( !_.isEqual(result.ed_user_id, idOwner) ){
           return next(new TypeError('wiki.category.not_found')); 
        }
        req.cate = result;
        return next()
    } );
};
/**
 * read category
 *
 */

exports.readCategory = function ( req, res, next ) {
    var cate = req.cate._doc;
    WikiSection.count({category_id: req.cate._id}).exec((err, count)=>{
        if(err){
            return next(err);
        }
        cate.totalSections = count;
        return res.json(cate);
    });
//    res.json(req.cate);
};

/**
 * list section by query
 *
 */

exports.findSection = ( req, res, next )=> {
    var idOwner = utils.getParentUserId(req.user);
    var limit = !isNaN(Number(req.query.limit))? Number(req.query.limit): 0;
    var skip = !isNaN(Number(req.query.skip))? Number(req.query.skip): 0 ;
    var is_empty = req.query.is_empty == 1;
    var query = {
        ed_user_id: idOwner,
        $or:[
            {
                user_created: mongoose.Types.ObjectId(req.user._id)
            },
            {
                is_public: true
            }
        ]
    };
    if(req.query.cat_id && mongoose.Types.ObjectId.isValid(req.query.cat_id)){
        query.category_id = mongoose.Types.ObjectId(req.query.cat_id)
    }
    
    var stages = [
        { $match :query },    
        {
           $lookup: {
                "from": config.dbTablePrefix.concat("user"),
                "localField": "user_created",
                "foreignField": "_id",
                "as": "user_created"
            }
        },
        {
          $unwind:
            {
              path: "$user_created",
              preserveNullAndEmptyArrays: true
            }
        },
        {
            $project:{
                _id: 1,
                title: 1,
                user_created: 1,
                description: 1,
                add_time: 1,
                upd_time: 1
            }
        },
        { $sort: { add_time : -1 }},
        { $skip : skip },
        { $limit: limit }
    ];
    
    WikiSection.aggregate(stages).exec( ( err, result )=> {
        if(err){
            return next(err);
        }
        return res.json(result);
    });
//    
//    var populate = {
//        path: 'user_created',
//        select: 'name profile_image roles'
//    };
//    WikiSection.find(query)
//    .select('_id title user_created description add_time upd_time')
//    .sort({add_time: -1})
//    .skip(skip)
//    .limit(limit)
//    .populate(populate)
//    .lean()
//    .exec( ( err, result )=> {
//        if(err){
//            return next(err);
//        }
//        return res.json(result);
//    });
};

exports.getSectionOptions = ( req, res, next )=> {
    var idOwner = utils.getParentUserId(req.user);
    var limit = !isNaN(Number(req.query.limit))? Number(req.query.limit): config.paging.limit;
    var skip = !isNaN(Number(req.query.skip))? Number(req.query.skip): 0 ;
    var title =  req.query.title;
    var cate_id = req.query.cate_id;
    var query = {
        ed_user_id: idOwner,
        $or:[
            {
                user_created: req.user._id
            },
            {
                is_public: true
            }
        ]
    };
    if(cate_id && !mongoose.Types.ObjectId.isValid(cate_id)){
        query._id = mongoose.Types.ObjectId(cate_id)
    }
    var stages = [
        {
            $match :query
        },
        {
            $project:{
                _id: 1,
                title: 1
            }
        },
        {
           $lookup: {
                "from": config.dbTablePrefix.concat("wiki_section"),
                "localField": "_id",
                "foreignField": "category_id",
                "as": "sections"
            }
        }
    ];
    
    var match = {
            $and:[
                { sections: {$gt: [{ $size: "$colors" }, 0]} }
            ]
    };
    if(title){
        if(!mongoose.Types.ObjectId.isValid(title)){
            match.$and.push({sections: {$elemMatch: {title: new RegExp(utils.escapeRegExp(decodeURI(title)), "i")} } });
        }else{
            match.$and.push({sections: {$elemMatch: {_id: mongoose.Types.ObjectId(title)} } });
        }
        
    }
    stages.push({$match :match});
    if(skip){
        stages.push({
            $skip: skip
        });
    }
    if(limit){
        stages.push({
            $limit: limit
        });
    }
    
    WikiCategory.aggregate(stages).exec((err, result) =>{
        if(err){
            return next(err);
        }
        res.json(result);
    });
};

/**
 * get one Section by query
 */

exports.findSectionById = ( req, res, next, id)=> {
    // check the validity of app id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("wiki.section.section_id.objectId"));
    }
    var idOwner = utils.getParentUserId(req.user);
    
    var populate =[ 
        {
            path: 'user_created',
            select: 'name profile_image roles'
        },{
                path: 'user_updated',
                select: 'name profile_image roles'
        },
        {
            path: 'category_id',
            select: 'title'
        }
    ];

    WikiSection.findById(id)
    .populate(populate)
//    .select('_id title ed_user_id user_created user_updated description add_time upd_time category_id')
    .exec( ( err, section )=> {
        if (err || !section) {
            return next(err || new TypeError("wiki.section.not_found"));
        }
        
        if( !_.isEqual(section.ed_user_id,idOwner) ){
           return next(new TypeError('wiki.section.id_not_found')); 
        }
        req.section = section;
        return next();
    } );
};

exports.readSection = ( req, res, next )=>{
    var section = req.section._doc;
    WikiArticle.count({section_id: req.section._id}).exec((err, count)=>{
        if(err){
            return next(err);
        }
        section.totalArtticles = count;
        return res.json(section);
    });
//    return res.json(req.section);
};

/**
 * list section by query
 */

exports.findArticle = ( req, res, next )=> {
    var idOwner = utils.getParentUserId(req.user);
    var limit = !isNaN(Number(req.query.limit))? Number(req.query.limit): 0;
    var skip = !isNaN(Number(req.query.skip))? Number(req.query.skip): 0 ;
    var search = req.query.text_search;
    var query = {
        ed_user_id: idOwner,
        $or:[
            {
                user_created: req.user._id
            },
            {
                is_public: true
            }
        ]
    };
    
    if(req.query.sect_id && mongoose.Types.ObjectId.isValid(req.query.sect_id)){
        query.section_id = req.query.sect_id
    }
    if(search){
        query.$or =[
            {title : new RegExp(utils.escapeRegExp(decodeURI(search)), "i")},
            {content : new RegExp(utils.escapeRegExp(decodeURI(search)), "i")}
        ];
        
        updateStats(search, req.user);
    }
    var populate =[
        {
            path: 'user_created',
            select: 'name '
        },
        {
            path: 'section_id',
            select: 'title'
        }
    ];

    WikiArticle.find(query)
    .select('_id title user_created content add_time upd_time section_id')
    .sort({add_time: -1})
    .skip(skip)
    .limit(limit)
    .populate(populate)
    .lean()
    .exec(  ( err, result )=> {
        if(err){
            return next(err);
        }
        return res.json(result);
    });
};


/**
 * get one article by query
 */

exports.findArticleById = ( req, res, next, id )=> {
    // check the validity of app id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("wiki.article.article_id.objectId"));
    }
    var idOwner = utils.getParentUserId(req.user);
    var populate =[
            {
                path: 'user_created',
                select: 'name profile_image roles'
            },{
                path: 'user_updated',
                select: 'name profile_image roles'
            },
            {
                path: 'section_id',
                select: 'title category_id'
            }
        ];
    // find app by id
    WikiArticle.findById(id)
    .populate(populate)
//    .select('_id title ed_user_id user_created user_updated content add_time upd_time section_id')
    .exec((err, article) => {
        if (err || !article) {
            return next(err || new TypeError("wiki.article.id_not_found"));
        }
        
        if( !_.isEqual(article.ed_user_id,idOwner) ){
           return next(new TypeError('wiki.article.id_not_found')); 
        }
        
        req.article = article;
        next();
    });
};
        
exports.readArticle = ( req, res, next )=>{
    return res.json(req.article);
};

// create, edit , remove================================
/**
 * Create new Category
 */
exports.addCategory = ( req, res, next )=> {
    // otherwise save new Category
    var idOwner = utils.getParentUserId(req.user);
    var newCategory = new WikiCategory( req.body );
    newCategory.user_created = req.user._id;
    newCategory.user_updated = req.user._id;
    newCategory.ed_user_id = idOwner;
    newCategory.save( ( err, cate )=> {
        if(err){
            return next(err);
        }
        
        return res.json(cate)
    } );
};

/**
 * Edit Category
 */
exports.updateCategory = ( req, res, next )=> {
    var update = Object.assign(req.cate, req.body);
    update.user_updated = req.user._id;
    update.save(( err, cate )=> {
        if(err){
            return next(err);
        }
        res.json(update);
    } );
};
/**
 * Remove Category
 */
exports.removeCategory = ( req, res, next )=> {
    req.cate.remove((err)=>{
        if(err){
            return next(err);
        }
        res.json({success:true,message:'cate.remove_success'});
    });
};

/**
 * Create new Section
 */
exports.addSection =[ 
    ( req, res, next)=>{
        validate.addSection(req.body, next);
    },
    ( req, res, next )=> {
    // otherwise save 
    var idOwner = utils.getParentUserId(req.user);
    var newSection = new WikiSection( req. body );
    newSection.user_created = req.user._id;
    newSection.user_updated = req.user._id;
    newSection.ed_user_id = idOwner;
    newSection.save( ( err, result )=> {
        if(err){
           return next(err);
        }
        return res.json(newSection); 
    });
    }
];

/**
 * Edit Section
 */
exports.updateSection = ( req, res, next)=>{
    var update = Object.assign(req.section, req.body);
    update.user_updated = req.user._id;
    update.save(( err, result )=> {
        if(err){
            return next(err);
        }
        return res.json(update);
    } );
};
/**
 * Remove section
 */
exports.removeSection = ( req, res, next )=> {
    var section = req.section;
    section.remove((err)=>{
        if(err){
            return next(err);
        }
        res.json({success: true});
    });
};

/**
 * Create new Article
 */
exports.addArticle =[ 
    (req, res, next)=>{
        validate.addArticle(req.body, next);
    },
    ( req, res, next )=> {
        var idOwner = utils.getParentUserId(req.user);
        
        // otherwise save
        var newArticle = new WikiArticle( req.body );
        newArticle.user_created = req.user._id;
        newArticle.user_updated = req.user._id;
        newArticle.ed_user_id = idOwner;
        if(req.files && req.files.length > 0){
            file.moveFile(idOwner, req.files, 'wiki');
            var wikiPath = `${config.upload.path}${idOwner}/wiki`;
            var path = `${wikiPath}/${req.files[0].filename}`
            while(!fs.existsSync(path)){
                break;
            }
            newArticle.files = req.files.map(file=>{
                return file.filename;
            });
        }
        
        newArticle.save( ( err, result )=> {
            if(err){
                return next(err);
            }
            
            res.json(result);
        } );
    }
];

/**
 * Edit Article
 */
exports.updateArticle = ( req, res, next )=> {
    var idOwner = utils.getParentUserId(req.user);
    var update = Object.assign(req.article, req.body);
    update.user_updated = req.user._id;
    if(req.files && req.files.length > 0){
        file.moveFile(idOwner, req.files, 'wiki');
        var wikiPath = `${config.upload.path}${idOwner}/wiki`;
        var path = `${wikiPath}/${req.files[0].filename}`
        while(!fs.existsSync(path)){
            break;
        }
        update.files = req.files.map(file=>{
            return file.filename;
        });
        if(req.body.old_files){
            update.files = _.concat(update.files, req.body.old_files);
        }
    }
    update.save( ( err, result )=> {
        if(err){
            return next(err);
        }
        
        res.json(update);
    });
};

/**
 * Remove Article
 */
exports.removeArticle = ( req, res , next )=> {
    var art = req.article;
    art.remove((err)=>{
        if(err){
            return next(err);
        }
        res.json({success: true});
    });
};

/**
 * Remove article attament
 */
exports.removeArticleFile = ( req, res , next )=> {
    var art =  Object.assign(req.article, {});
    var idOwner = utils.getParentUserId(req.user);
    var file_name = req.params.file_name;
    var file_path = `${config.upload.path}${idOwner}/wiki/${file_name}`;
    _.remove(art.files, (file)=>{file_name == file});
    art.save((errSave)=>{
        if(errSave){
            return next(errSave);
        }
        file.removeFile(file_path, (err)=>{
            if(err){
                return next(err);
            }
        });
        
        res.json({success: true});
    });
};


exports.reportTopSearch = (req, res, next)=>{
    var idOwner = utils.getParentUserId(req.user);
    var limit = isNaN(Number(req.query.limit))? Number(req.query.limit): config.paging.limit;
    var skip = isNaN(Number(req.query.skip))? Number(req.query.skip): 0 ;
    var title =  req.query.title;
    var cate_id = req.query.cate_id;
    var query = {
        ed_user_id: idOwner,
    };
    var stages = [
        { $match :query},
        { $sort : { count : -1, add_time: -1} },
        { $limit : 10 },
        { $project:{ _id: 1, count: 1, search: 1}},
    ];
    
    WikiStats.aggregate(stages).exec((err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        res.json(result);
    })
}

exports.reportUserSearch = (req, res, next)=>{
    var idOwner = utils.getParentUserId(req.user);
    var limit = isNaN(Number(req.query.limit))? Number(req.query.limit): config.paging.limit;
    var skip = isNaN(Number(req.query.skip))? Number(req.query.skip): 0 ;
//    var title =  req.query.title;
//    var cate_id = req.query.cate_id;
    if(!req.params.user_id || !mongoose.Types.ObjectId.isValid(req.params.user_id)){
        return next(new TypeError('wiki.user.invalid'));
    }
    var user_id = mongoose.Types.ObjectId(req.params.user_id);
    var query = {
        ed_user_id: idOwner,
        counter: {$elemMatch : {agent: user_id}}
    };
    var stages = [
        { $match :query},
        { $project:{ _id: 1, counter: 1, search: 1, add_time: 1}},
        { $unwind: { path: "$counter", preserveNullAndEmptyArrays: true}},
        { $match : { "counter.agent": user_id } },
        { $project:{ _id: 1, count: "$counter.count", search: 1,  add_time: 1}},
        { $sort : { count : -1, add_time: -1} },
        { $limit : 10 },
    ];
    
    WikiStats.aggregate(stages).exec((err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        res.json(result);
    })
}
