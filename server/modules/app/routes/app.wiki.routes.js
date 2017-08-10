'use strict';

/**
 * Module dependencies.
 */
var wikiPolicy = require('../policies/app.wiki.policy'),
    upload = require('../../core/resources/upload'),
    wiki = require('../controllers/app.wiki.controller');
var uploadOpts = {
    mimetype : ['image/gif',
                'image/jpeg',
                'image/png',
                'text/plain',
                'application/pdf',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpointtd',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.oasis.opendocument.text',
                'application/vnd.oasis.opendocument.spreadsheet'],
    array: {fieldname: "attachments", maxCount: 10},
};
module.exports = function(app) {
    // find categories
    app.route('/api/app/wiki/category').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.findCategory)
        .post(wikiPolicy.permissionFeatures, wiki.addCategory);
        
    
    app.route('/api/app/wiki/category/:cat_id').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.readCategory)
        .delete(wikiPolicy.permissionFeatures, wiki.removeCategory)
        .put(wikiPolicy.permissionFeatures, wiki.updateCategory);
    
    // find sections
    app.route('/api/app/wiki/section').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.findSection)
        .post(wikiPolicy.permissionFeatures, wiki.addSection);
    
    app.route('/api/app/wiki/section/:sec_id').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.readSection)
        .delete(wikiPolicy.permissionFeatures, wiki.removeSection)
        .put(wikiPolicy.permissionFeatures, wiki.updateSection);
     
    // find articles
    app.route('/api/app/wiki/article').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.findArticle)
        .post(wikiPolicy.permissionFeatures, upload(uploadOpts), wiki.addArticle);
        
    app.route('/api/app/wiki/article/:art_id').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.readArticle)
        .delete(wikiPolicy.permissionFeatures, wiki.removeArticle)
        .put(wikiPolicy.permissionFeatures, upload(uploadOpts), wiki.updateArticle);
    
    app.route('/api/app/wiki/article/:art_id/file/:file_name').all(wikiPolicy.isAllowed)
        .delete(wikiPolicy.permissionFeatures, wiki.removeArticleFile);
    
    app.route('/api/app/wiki/sect-opts').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.getSectionOptions);
    
    app.route('/api/app/wiki/report/top').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.reportTopSearch);
    
    app.route('/api/app/wiki/report/user/:user_id').all(wikiPolicy.isAllowed)
        .get(wikiPolicy.permissionFeatures, wiki.reportUserSearch);
    
    // Finish by binding the wiki middleware
    app.param('cat_id', wiki.findCategoryById);
    app.param('sec_id', wiki.findSectionById);
    app.param('art_id', wiki.findArticleById);
    
};
