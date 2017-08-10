'use strict';

/**
 * Module dependencies.
 */
var calendarPolicy = require('../policies/user.calendar.policy'),
    coreController = require('../../core/controllers/core.controller'),
    userCalendar = require('../controllers/user.calendar.controller');

module.exports = (app) => {
    
    // user calendar routes
    app.route('/api/user/calendar').all(calendarPolicy.isAllowed)
        .get(calendarPolicy.permissionFeatures,userCalendar.read);
    
    // user enable business hour routes
    app.route('/api/user/calendar/toggle').all(calendarPolicy.isAllowed)
        .put(calendarPolicy.permissionFeatures,  userCalendar.enableBusinessHour);
    
    // user business hour routes
    app.route('/api/user/business-hour').all(calendarPolicy.isAllowed)
        .put(calendarPolicy.permissionFeatures, userCalendar.isEnabled, userCalendar.updateBusinessHour);

    // user holiday routes
    app.route('/api/user/holiday').all(calendarPolicy.isAllowed)
        .post(calendarPolicy.permissionFeatures, userCalendar.isEnabled, userCalendar.addHoliday);
    
    app.route('/api/user/holiday/:holiday_id').all(calendarPolicy.isAllowed)
        .put(calendarPolicy.permissionFeatures, userCalendar.isEnabled, userCalendar.editHoliday)
        .delete(calendarPolicy.permissionFeatures, userCalendar.isEnabled, userCalendar.removeHoliday);
};
