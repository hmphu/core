'use strict'
//
//  utils.js
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash'),
    enums = require('../../core/resources/enums.res');

exports.checkName = function( value){   
    var regex = /^[a-z0-9A-Z_\- ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂưăạảấầẩẫậắằẳẵặẹẻẽếềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹý]+$/;

    return !regex.test(value);
};

exports.convertPhoneValue = function(value){
    if(!value || value == ""){
        return "";
    }
    
    value = value.replace("+840", "(+84)");
    if(value.indexOf("(+84)") == -1){
        if(value.length >= 10){
            value = "(+84)" + value.replace(/^0/, "");
        }
    }
    return value;
};

exports.checkRoleEditUser = function(user, body){
    if(user._id.toString() === body._id.toString()){
        return true;
    }
    
    if(user.roles[0] == enums.UserRoles.admin && _.indexOf([enums.UserRoles.owner, enums.UserRoles.admin], body.roles[0]) != -1){
        return false;
    }

    if(user.roles[0] == enums.UserRoles.agent && _.indexOf([enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent], body.roles[0]) != -1){
        return false;
    }
    return true;
};
