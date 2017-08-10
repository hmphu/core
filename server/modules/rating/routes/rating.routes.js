'use strict';
/**
 * Module dependencies.
 */
var ratingPolicy = require('../policies/rating.policy'),
    rating = require('../controllers/rating.controller');

module.exports = (app) => {
    
    app.route('/api/rating').all(ratingPolicy.isAllowed)
        .post(rating.add)
        .get(rating.read)
        .put(rating.update)
        .delete(rating.delete);
    
    app.route('/api/rating/:rating_ed_id').all(ratingPolicy.isAllowed)
        .get(rating.read)
};
