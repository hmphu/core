'use strict';
//
//  datetime.js
//  process common date time
//
//  Created by thanhdh on 2016-01-15.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

exports.getDatePattern = function ( locale ) {
    var dateFormat = {
        en : "MM/DD/YYYY",
        vi : "DD/MM/YYYY"
    };
   
    if ( dateFormat[ locale ] !== undefined ) {
        return dateFormat[ locale ];
    }
    
    return dateFormat.en;
};

exports.getTimePattern = function ( timeFormat ) {
    if ( timeFormat == "12" ) {
        return "h:mm A";
    }
    
    return "HH:mm";
};
