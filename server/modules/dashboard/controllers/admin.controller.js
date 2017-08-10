var _ = require('lodash');

/**
 * Extend user's controller
 */
module.exports = _.assign(
    require('./admin/summary.controller'),
    require('./admin/invoice.controller')
    
);