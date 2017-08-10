var _ = require('lodash');

/**
 * Extend user's controller
 */
module.exports = _.assign(
    require('./agent/summary.controller'),
    require('./agent/profile.controller'),
    require('./agent/notify.controller')
);