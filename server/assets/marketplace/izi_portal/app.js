
/*jshint quotmark: true*/
String.prototype.capitalizeFirst = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
* stripTags
*
* @param mixed input
* @parm mixed output
*/

window.strip_tags= function(input) {
    if (input) {
        var tags = /(<([^>]+)>)/ig;
        if (!Array.isArray(input)) {
            input = input.replace(tags,"");
        }
        else {
            var i = input.length;
            var newInput = [];
            while(i--) {
            input[i] = input[i].replace(tags,"");
            }
        }
        return input;
    }
    return input;
};

window.mail_simplify = function (mail_body, keep_origin) {
    var content = mail_body;
    if (content.indexOf("<base") != -1) {
        content = content.replace(/<base/g, '<izi_tag');
    }
    if (keep_origin) {
        return content;
    }
    var $body = $("<div>"+content+"</div>");
    // remove quote tag if exist
    if (content.indexOf("gmail_extra") !== -1){$body.find(".gmail_extra").remove();}
    if (content.indexOf("yahoo_quoted") !== -1){$body.find(".yahoo_quoted").remove();}
//     remove signature tag if exist
    if (content.indexOf("signature") !== -1){$body.find(".signature").remove();}
    if (content.indexOf("style") !== -1){$body.find("style").remove();}
    if (content.indexOf("blockquote") !== -1){$body.find("blockquote").remove();}
    if (content.indexOf("head") !== -1){$body.find("head").remove();}
    if (content.indexOf("moz-signature") !== -1){$body.find(".moz-signature").remove();}
    // remove img tag
    $body.find("img").remove();
//    $.each($body.find("a"), function(){
//        $(this).html($(this).text());
//    })
    $body.find("a").map(function (i, el) {
        return $(this).text();
    });
    if (content.indexOf("gmail_signature") !== -1){$body.find(".gmail_signature").remove();}
    var res_value = $body.html();
    if (!res_value || !res_value.trim()) {
        res_value = mail_body;
    }
    return res_value;
};

String.prototype.mailSimplify = function(keep_origin){
    return mail_simplify(this, keep_origin);
};
String.prototype.stripTags = function(){
//    var inputHtml = $(this);
//    return inputHtml.find("body")?$(this).find("body").text() : $(this).text();
    var tmp = document.createElement("DIV");
    tmp.innerHTML = this;
    return strip_tags(tmp.textContent || tmp.innerText) || "...";
};

function convertHexToRgba(hex,opacity){
    hex = hex.replace('#','');
    r = parseInt(hex.substring(0,2), 16);
    g = parseInt(hex.substring(2,4), 16);
    b = parseInt(hex.substring(4,6), 16);

    result = 'rgba('+r+','+g+','+b+','+opacity/100+')';
    return result;
}

function convertRbgToRgba(rgb,opacity){
    new_col = rgb.replace(/rgb/i, "rgba");
    new_col = rgb.replace(/\)/i,','+opacity/100+')');

    return result;
}

window.lng = app.data.lng;
window.app_name = app.data.name;
window.MAX_FILE_SIZE = 3145728;
window.getFileType = function(filename){
    var filetype = "";
    switch(filename.split(".").pop().toLowerCase()){
        case "jpg": 
        case "jpeg":
        case 'img':
        case "png":
        case "gif":
            filetype ="image";
            break;
        default :
            filetype ="file";
    }
    return filetype;
};

window.getExtensionClass= function(filename){
    var exts = filename? "."+filename.split(".").pop(): null;
    return addExtensionClass(exts);
};

window.addExtensionClass = function(extension) {
    extension = extension?extension.toLowerCase(): null;
    
    switch (extension.toLowerCase()) {
        case '.jpg':
        case '.jpeg':
        case '.img':
        case '.png':
        case '.gif':
            return "fa-file-image-o";
        case '.doc':
        case '.docx':
            return "fa-file-word-o";
        case '.xls':
        case '.xlsx':
            return "fa-file-excel-o";
        case '.pdf':
            return "fa-file-pdf-o";
        default:
            return "fa-file";
    }
};

window.getkendoDateTimeFormat = function(date, type){
    switch(type){
        case "date":
            break;
        case "time":
            break;
        case "datetime":
            break;
        default :
            break;
    }
};

var app_style = {};
for(var index in document.styleSheets){
    var style = document.styleSheets[index];
    if(style.ownerNode.id == "app_style"){
        app_style = style;
        break;
    }
}


for(var index in app_style.cssRules){
    var rule = app_style.cssRules[index];
    
    if(rule.selectorText == "#"+app_name+ " .listview-item.k-state-selected"){
        rule.style["background-color"] = account_color || color;
    }
}
    
// cache DOM elements
var app_id = document.getElementById(app.data.name);

$("#"+app.data.name+" a").unbind("click");// unbind trigger click
$("#"+app.data.name).css("position", "relative");
$(".content_right").css("margin-left","57px");
$(".content_right").removeClass("float-right");

// custom binding 
kendo.data.binders.slideHorizontal = kendo.data.Binder.extend( {
    refresh: function() {
        var value = this.bindings["slideHorizontal"].get();

        if (value) {
            $(this.element).show();
            appViewModel.showRightColunm(true);
        } else {
            $(this.element).hide();
            appViewModel.showRightColunm(false);
        }
    }
});

// define viewmodel

var ticketModel = kendo.observable({
    ticket: {
        requester: ""
    }
});

window.ticketModel = ticketModel;

window.appViewModel = kendo.observable({
    init: function(){
        this.getTicketStatus();
        this.getTicketFields();
//        this.getAppSettings();
    },
    getAppRequest: false,
    ticketFields: [],
    dropdownTicketFields: {},
    loadSidebarApp: function(){
        if (this.getAppRequest == false) {
            this.getAppRequest = true;

            var apps_list = new kendo.data.DataSource({
                transport : {
                    read : {
                        url : baseurl+"/rest/settings/apps/manage/locations-apps",
                        dataType : "json"
                    }
                },
                schema : {
                    data : "data"
                }
            });
            apps_list.fetch(function(){
                var apps = this.data(),
                    app_url = baseurl+'/apps/';
                var ticket_id = null;
                var location_app = 'portal_sidebar';
                for (var i = 0; i < apps.length ; i++) {
                    //ticket_sidebar && new_ticket_sidebar
                    if (apps[i].locations.indexOf(location_app) > -1) {
                        var app_name = apps[i].app_name;
                        $.ajax({
                            type: "GET",
                            url: baseurl+ '/apps/' + apps[i].app_name ,
                            cache: false,
                            dataType : "html",
                            data: {is_html_app: true, ticket_id: ticket_id},
                            success: function(html){
                                var url_parse = this.url.replace(app_url, '');
                                var app_name = url_parse.indexOf('?') > 0 ? url_parse.substr(0, url_parse.indexOf('?')) : url_parse;

                                var content = $("#tpl_item_app_ticket_bar").html();
                                var template_app = kendo.template(content);
                                var data_render = {
                                    icon_app : baseurl + '/apps/assets/' + app_name + '/logo-small.png?' + new Date().getTime(),
                                    name_app : app_name,
                                    body_content : html
                                };
                                var appTarget = $("#"+app_name);
                                
                                if(appTarget.length > 0){
                                    var display = appTarget.parent().css("display");
                                    var htmlDis ="<div></div>";
                                    htmlDis = $(htmlDis).html(template_app(data_render));
                                    htmlDis = $(htmlDis).find(".app-ticket-bar").html();
                                    appTarget.closest(".app-ticket-bar").html(htmlDis);
                                    var header = $("#"+app_name).closest(".app-ticket-bar").find("header");
                                    display == "block"? header.trigger("click") : null;
                                }else{
                                     $("#app_right_column").append(template_app(data_render));
                                }
                                
                            },
                            error: function(XMLHttpRequest, textStatus, errorThrown)
                            {
                                alert(textStatus);
                            }
                        });
                    }
                }
            });
        }
    },
    getAppSettings: function(){
        var that = this;
        var jsonString =  sessionStorage.getItem("appSettings");
        if(jsonString){
            var settings = JSON.parse(jsonString);
            sessionSettings = {
                isPressEnter: settings.press_enter || false,
                rightSideBar: settings.right_side_bar || false,
                groupBy: settings.groupBy || "requester",
                filter:  settings.filter || null,
                dateType: settings.dateType || null
            };
            that.set("sessionSettings", sessionSettings);
        }
    },
    getTicketStatus: function(){
        var ticketStatus = [];
        var that = this;
        $.ajax({
            url: "/api/general/enums",
            dataType: "json",
            type : "POST",
            data: {
                types: ["TicketStatus"],
                isFirstHalf: 1
            },
            success: function(result){
                if(result && result.data){
                    that.messageSetting.statusDatasource  = result.data.TicketStatus.filter(function(status){
                        return (status.value === "1" || status.value === "2" || status.value === "3");
                    });
                    that.set("messageSetting.statusDatasource",new kendo.data.DataSource({
                        data: that.messageSetting.statusDatasource})
                    );
                }
            },
            error: function(){
//                $.notify("Cant not replay response", "error");
            },
            complete: function(){


            }
        });
    },
    getTicketFields: function(){
        var that = this;
        $.ajax({
            url: "/api/ticket-fields",
            dataType: "json",
            type : "GET",
            success: function(result){
                if(result && !result.is_error && result.data){
                    that.ticketFields = result.data.custom_settings.active;
                    that.ticketFieldType = result.data.custom_field_type;
                }
            },
            error: function(){
//                $.notify("Cant not replay response", "error");
            },
            complete: function(){

            },
            async: false
        });

    },
    refreshTicketField: function(){
        // load filter ticket field from session
        var filter = this.get("sessionSettings.filter")? this.get("sessionSettings.filter").toJSON(): null;
        if(filter && filter.hasOwnProperty("custom_fields")){
            var custom = filter.custom_fields;
            for(var key in custom){
                $("#custom_"+ key).val((custom[key] || {}).value);
                $("#checked_custom_"+ key).prop("checked", true);
            }
            $("[data-filter='ticket-fields']").parent().addClass("active");
        }
        var enabled = false;
        $(".checked_custom").each(function() {
            if($(this).prop("checked") == true){
                enabled = true;
                return false;
            }
        });
        this.set("filterSettings.enabledApplyTicketField", enabled);

        $(".checked_custom").bind("change", this.filterSettings.changeCheckTicketField);
        var dropdowns = this.dropdownTicketFields.toJSON();
        for(var key in dropdowns){
            var dropdown = $("#custom_"+ key).data("kendoDropDownList");
            if(this.dropdownTicketFields[key] && Array.isArray(this.dropdownTicketFields[key]) && dropdown){
                var dataSource = new kendo.data.DataSource({
                    data: this.dropdownTicketFields[key]
                });
                dropdown.setDataSource(dataSource);
            }
        }
    },
    sequence: new Sequence(),
    ticketChange: function(ticket){
        console.log("ticket change",ticket);
        
        var channel  = ticket.channel_type;
        channel = this.getChannelType(channel);
        var that = this;
        if(typeof channel == "undefined" || !channel){
            var listChannel = that.listChannelType || [];
            if(listChannel.length > 0){
                listChannel.forEach(function(channel){
                    var channelObj = that.get(channel);
                    channelObj.refresh? that.sequence.add(function(callback){
                        channelObj.refresh(true, false, function(){
                            callback();
                        });
                    }) : null;
                });
            }
        }else{
            channel = this.get(channel);
            this.sequence.add(function(callback){
                channel.refresh(true, false, function(){
                    callback();
                });
            });
        }
        
        if(!this.sequence.onEnd){
            this.sequence.onEnd = function(){
                var selected = that.selectedConversation;
                //var listview = $(channel.listTarget).data("kendoListView");
                that.updateTicketStatus();
                selected? that.conversationsRefresh() : null;
                //selected? listview.element.children("[data-uid='"+selected.uid+"']").addClass("k-state-selected"): null;
                //selected? listview.select(listview.element.children("[data-uid='"+selected.uid+"']")): null;
            };
        }
        this.sequence.isStop()? this.sequence.start(): null;
    },
    choose_channel: function(contacts){
        //contact_info
        var ticket_info = this.selectedConversation;
        var req_contacttype = {
            0 : "Email",
            1 : "Phone",
            2 : "Facebook",
            3 : "Chat"
        };
        var channel_data = [{
            id: "-1",
            text: i18n.t('ticket.internal_note'),
            type: "-1"
        }];
        var complete = function(){
            var select = $("#response_channel").select2().empty();
            $("#response_channel").select2({
                data: channel_data,
                placeholder: lng.select_channel,
            });
        };
        var is_sms_active =log_info.is_sms_active || false;
        var is_voip_active = log_info.voip_enable;
        var facebook_pages = log_info.facebook_pages;
        var is_ticket_from_fb = ticket_info.contact_type == 22 || ticket_info.contact_type == 21 || false;
        var contacts = contacts || [];
        for(var j=0; j<contacts.length; ++j){
            var contact = Object.assign({},contacts[j] || {});
            contact.type = req_contacttype[contact.type];
            if(contact.type == "Facebook" || (contact.type == "Phone" && !is_sms_active && is_voip_active == 'false')){
                continue;
            }
            var is_found = false;
            for(var i=0; i<channel_data.length; ++i){
                if(channel_data[i].type == contact.type){
                    channel_data[i].children.push({
                        id: contact.value,
                        text: contact.value,
                        type: contact.type
                    });
                    is_found = true;
                    break;
                }
            }
            if(!is_found){
                channel_data.push({
                    text: contact.type,
                    type: contact.type,
                    children: [{
                        id: contact.value,
                        text: contact.value,
                        type: contact.type
                    }]
                });
            }
        }
        var is_facebook = false;
        var page_id =[];
        if(ticket_info){
            var contact_info = ticket_info.contact_info;
            if(contact_info && is_ticket_from_fb){
                var facebook_detail ={
                    id : contact_info,
                    name : contact_info
                };
                if(ticket_info.contact_type == 22){
                    page_id = contact_info.split('@');
                }
                if(ticket_info.contact_type == 21){
                    page_id = contact_info.split('_');
                }
                for(var i = 0 ; i < facebook_pages.length; i++){
                    if(facebook_pages[i].page_id == page_id[0]){
                        facebook_detail.id = contact_info;
                        facebook_detail.name = facebook_pages[i].name;
                        is_facebook = true;
                    }
                }
                channel_data.push({
                    text: "Facebook",
                    type: "Facebook",
                    children: [{
                        id: facebook_detail.id,
                        text: facebook_detail.name,
                        type: "Facebook"
                        }]
                });
            }
        }
        if(!is_facebook && is_ticket_from_fb){
            var data = {
                "facebook_page" : {
                    page_id : page_id[0]
                }
            }
            postData('/rest/ticket/get-facebook-page',"POST",data, function(result){
                if(result.is_error){
                    return complete();
                } else {
                    if(result.data.name != null){
                        for(var i =0 ; i<channel_data.length; i++){
                            if(channel_data[i].type == "Facebook"){
                                channel_data[i]['children'][0]['text']=result.data.name;
                            }
                        }   
                    }
                    complete();
                }
            });
        }else{
            complete();
        }
        
    },
    choose_assignee: function(){
        var data = [{
            id: "",
            text: lng.select_agent
        }];
        var that = this;
        $("#group_assignee").select2({ data: [] });
        var complete = function(){
            $("#group_assignee").select2({
                placeholder: lng.select_agent,
                allowClear: true,
                data: data,
                escapeMarkup: function (m) {
                    return m;
                }
            });
            // select assignee
            if(that.selectedResponse.assignee){
                var assignee = that.selectedResponse.group+ "_" + that.selectedResponse.assignee._id;
                $("#group_assignee").val(assignee).trigger("change");
            }else{
                $("#group_assignee").val(that.selectedResponse.group).trigger("change");
            }
        };
        postData( baseurl+ "/api/group-assignee","GET",{}, function(result){
            if(result.is_error){
                return complete();
            } else {
                data = data.concat(result.data);
                complete();
            }
        });
    },
    refresh: function(){
        var that = this;
        this.sequence.add(function(callback){
            that.email.refresh(true, false, function(){
                callback();
            });
        });
        this.sequence.add(function(callback){
            that.sms.refresh(true, false, function(){
                callback();
            });
        });
        this.sequence.add(function(callback){
            that.facebook.messages.refresh(true, false, function(){
                callback();
            });
        });
        this.sequence.add(function(callback){
            that.facebook.comments.refresh(true, false, function(){
                callback();
            });
        });
    },
    updateTicketStatus: function(){
        if(!this.selectedConversation){
            return;
        }
        var channel  = this.selectedChannel;
        channel = this.getChannelType(channel);
        channel = this.get(channel) ;
        
        if(typeof channel == "undefine"){
            return;
        }
        var channelType = (channel && channel.getType)? channel.getType(): null;
        
        if(typeof channelType == "undefine" || channelType == null ){
            return;
        }
        var data =  {
            requester: this.selectedConversation.requester._id,
            channel: channelType
        };
        
        if(this.appSettings.groupBy == "ticket"){
            data.ticket = this.selectedConversation.ticket_id;
        }
        var that = this;
        $.ajax({
            url : baseurl+ "/rest/portal/update-ticket",
            dataType: "json",
            type: "POST",
            data: data,
            success: function(result){
                that.selectedConversation ? that.set("selectedConversation.is_read", true) : null;
                channel.resetNoReadCurrent();
            },
            error: function(error){
                
            }
        });
    },
    selectedChannel: null,
    selectedConversation: null,
    contact_types: {
        0: {
            name: "email",
            icon_class: "envelope"
        },
        1: {
            name: "phone",
            icon_class: "phone"
        },
        2: {
            name: "facebook",
            icon_class: "facebook"
        },
        3: {
            name: "chat",
            icon_class: "comments-o"
        }
    },
    channels: {},
    getResponseType: function(){
        var channel = this.selectedChannel;
        var response_type={
            0: "Email",
            2: "Phone",
            1: "Facebook",
            3: "Chat",
        }
        return response_type[channel];
    },
    showRightColunm: function(display){
        if(display){
            $("#app_content_column").css("margin-right", "300px");
            this.loadSidebarApp();
        }else{
            $("#app_content_column").css("margin-right", "0");
        }
    },
    scrollToEnd: function(target){
        var content = $("#app_content_column .app_conversation_content");
//        content.animate({ scrollTop: content.height()}, 1000);
        var posi = content[0].scrollHeight - this.get("currentOffset");
        content.scrollTop(posi);
    },
    getConversationById: function(channel, id){
        var responses = [];
       
        if(!id){
            return responses;
        }
        // Assign handlers immediately after making the request,
        // and remember the jqxhr object for this request
        var url = baseurl + "/rest/portal/ticket-responses/" +channel+"/" +id ;
        var jqxhr = $.getJSON( url );
        
        return jqxhr;
    },
    getFileType: window.getFileType,
    listChannelType: [
        "email",
        "facebook",
        "facebook.comments",
        "facebook.messages",
        "sms",
        "chat",
        "comments",
    ],
    getChannelType: function(channel){
        var types = {
            0 : "email",
            1: "facebook",
            21: "facebook.comments",
            22: "facebook.messages",
            2 : "sms",
            3 : "chat",
            4 : "comments",
            "email": 0,
            "facebook": 1,
            "facebook.comments": 21,
            "facebook.messages": 22,
            "sms": 2,
            "chat": 3,
            "comments": 4,
        }
        var type = types[channel];
        
        return type;
    },
    conversationsListTarget: ".chat",
    conversloadMoreVisible: true,
    currentOffset: 0,
    skip: -1,
    limit: 50,
    // event 
    conversationsDataBound: function(e){
        var data = e.sender.dataSource.data();
        e.sender.select(e.sender.element.children().last());
        this.selectedConversation? this.scrollToEnd(): null;
        this.conversloadMoreVisible? $(".message-content .load-more").show():$(".message-content .load-more").hide();
    },
    conversloadMore:function(event){
        var listview = $(this.conversationsListTarget).data("kendoListView");
         var content = $("#app_content_column .app_conversation_content");
        content.length > 0 ?this.set("currentOffset", content[0].scrollHeight): null;
        this.set("isLoadMore", true);
        listview ? (this.limit += 50 ,listview.dataSource.transport.options.read.data.limit = this.limit, this, listview.dataSource.read()): null;
    },
    resetSelectedConversations: function(){
        this.selectedConversation = null;
        this.selectedResponse = null;
        this.limit = 50;
        this.skip = -1;

        var view = new kendo.View("#"+app_name+"_tpl_empty_conversation", {model: {}, evalTemplate: true, wrap: false });
        $("#app_content_column .content_column_wrapper").html("");
        view.render($("#app_content_column .content_column_wrapper"));
    },
    conversationsRefresh: function(){
        var listview = $(this.conversationsListTarget).data("kendoListView");
        listview ? (listview.dataSource.read()): null;
    },
    updateConversationContent: function(channel){
        if(!this.selectedConversation){
            return;
        }

        this.set("currentOffset", 0);
        this.set("limit", 50);
        this.messageSetting.fbUser = "";
        this.messageSetting.fbUserDatasource = new kendo.data.DataSource({ 
            data: []
        });
        if( this.selectedConversation && !this.selectedConversation.is_read ){
            this.updateTicketStatus();
        }
        var that = this;
        var requester_id = that.selectedConversation.requester._id;
        var ticket_id = that.appSettings.groupBy =="ticket" ?  that.selectedConversation.ticket_id: null;
        
        ticketModel.ticket.requester = requester_id;// for sidebar app
        this.getAppRequest = false;
        
        var data = {
            channel: channel,
            requester_id: requester_id,
            ticket_id: ticket_id,
            skip: this.skip,
            limit: this.limit,
            current_user: this.appSettings.currentAgent
        };
        
        var dataSource = new kendo.data.DataSource({
            transport : {
                read : {
                    url : baseurl + "/rest/portal/ticket-responses",
                    dataType : "json",
                    type : "POST",
                    data: data,
                }
            },
            schema: {
                data: "data",
            },
            requestStart: function(e) {
                kendo.ui.progress($(".chat"), true);
            },
            requestEnd: function(e) {
                var response = e.response;
                if(response && !response.is_error){
                    that.conversloadMoreVisible = response.total > response.data.length;
                    that.messageSetting.displayFbUser = (that.selectedConversation && that.selectedConversation.contact_type == 21 && response.fb_users && response.fb_users.length > 0)? "inline-block": "none";
                    that.messageSetting.fbUserDatasource = new kendo.data.DataSource({ 
                        data: response.fb_users
                    });
                    $("#fb_users").closest(".response_channel").css("display", that.messageSetting.displayFbUser);
                    $("#fb_users").data("kendoDropDownList")?$("#fb_users").data("kendoDropDownList").setDataSource(that.messageSetting.fbUserDatasource): null;
                }

                kendo.ui.progress($(".chat"), false);
                
                that.showRightColunm(that.appSettings.rightSideBar);
            },

        });

        that.set("selectedConversation.responses",dataSource);

        var view = new kendo.View("#"+app_name+"_tpl_selected_conversation", { model: that, evalTemplate: true ,wrap: false });
        $("#app_content_column .content_column_wrapper").html("");
        view.render($("#app_content_column .content_column_wrapper"));
        this.choose_assignee();
        this.choose_channel(that.selectedConversation.requester.contacts);
        this.getRelateToTicket();
    },
    getRelateToTicket: function(){
        var that = this;
        if( this.selectedConversation.contact_type != 21 ){
            return ;
        }
        
        var contact_info_split = this.selectedConversation.contact_info.split('_');
        
        if( contact_info_split.length != 3){
            return ;
        }
    
        var data = {
            contact_info : contact_info_split[0] + "_" + contact_info_split[1]
        };
        
        postData('/rest/ticket/get-parent-post-facebook', "POST", data, function(result){
           if(result.is_error || !result.data){

           } else {
               if(result.data._id){
                   var contact = "'" + contact_info_split[1] + "_" + contact_info_split[2] + "'";
                   var ticket_id = "'" + that.selectedConversation.ticket_id + "'";
                   var type = "'ticket'";
                   var parent_ticket_facebook = "<a target='_blank' href='/ticket/"+result.data._id+"'>"+result.data.subject+"</a>";
                   $("#response_ticket").html(parent_ticket_facebook);
               }  
           }
        });
    },
    updateAppSettings: function(callback){
        var that = this;
        var data = {
                press_enter : that.messageSetting.isPressEnter,
                right_side_bar: that.appSettings.rightSideBar,
                filter: that.filterSettings.filter,
                dateType: that.filterSettings.dateType,
                groupBy: that.appSettings.groupBy,
        };
        sessionStorage.setItem("appSettings", JSON.stringify(data));

    }
});

appViewModel.getAppSettings();

(function() {
    // filter channel
    ! function () {
        ! function(e, t) {
            var vm = appViewModel,
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                n = "filterChannel",
                tg = "#filter_channel",
                dt = function(){
                    source = [];
                    $items = e("#channel_tab ul:first").children("li");
                    $items.each(function(i){
                        $(this).data("tab-name")? (source[i] = {
                            value: i,
                            name: $(this).data("tab-name").capitalizeFirst()
                        }): null;
                    });
                    return source;
                },
                j = {
                    filterTarget: tg,
                    dataSource: dt(),
                    select: function(channel){
                        var t = e((this.filterTarget || this.filterChannel.filterTarget)), drop = t;
                         t ? (drop = t.getKendoDropDownList(), drop.select(channel), this.parent().selectedChannel = channel): null;
                    },
                    change: function(e){
                        this.selectedChannel != null ? this.channelTabControl.select(this.selectedChannel): null;
                    },
                };
            vm.set(n, j);
        }(window.jQuery)
    }(),
    // app setttings
    ! function () {
        ! function(e, t) {
            var vm = appViewModel,
                groupBy = vm.get("sessionSettings.groupBy")? vm.get("sessionSettings.groupBy"): "requester",
                showRight = vm.get("sessionSettings.rightSideBar")? vm.get("sessionSettings.rightSideBar") : false;
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                n = "appSettings",
                j = {
                    rightSideBar: showRight,
                    groupBy : groupBy,
                    currentAgent: $.apps.get_param(app.secret, app.params.current_agent),
                    changeTheme: function(event){

                        $(event.target).parents(".dropdown-menu").children("li").removeClass("active");
                        $(event.target).parents("li.group-by").addClass("active");
                        this.appSettings.groupBy = $(event.target).val();
                        this.appSettings.applyGroupBy();
                    },
                    applyGroupBy: function(){
                        var that = this.parent() || this;
                        that.resetSelectedConversations();
                        
                        var listChannel = that.listChannelType || [];
                        if(listChannel.length > 0){
                            listChannel.forEach(function(channel){
                                var channelObj = that.get(channel);
                                channelObj.updateGroupBy? channelObj.updateGroupBy(true): null;
                            });
                        }
                    }
                };
            if(groupBy){
                e("input[value='"+ groupBy+"']").parents(".group-by").addClass("active");
            }
            vm.set(n, j);
        }(window.jQuery)
    }(),
    // filter orther
    ! function () {
        ! function(e, t) {
            var vm = appViewModel,
                filter = vm.get("sessionSettings.filter")? vm.get("sessionSettings.filter").toJSON(): null,
                dateType = vm.get("sessionSettings.dateType")? vm.get("sessionSettings.dateType"): null
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                n = "filterSettings",
                tg = "#filter_settings",
                j = {
                    target: tg,
                    settingButton: "#setting_dropdown",
                    dateFormat: log_info.date_format,
                    dateFilters: {
                        now_date: {
                            from:moment().toDate(),
                            to: moment().toDate()
                        },
                        yesterday: {
                            from: moment().add(-1, "d").toDate(),
                            to: moment().add(-1, "d").toDate(),
                        },
                        lastweek:{
                            from: moment().add(-8, "d").toDate(),
                            to: moment().add(-1, "d").toDate()
                        },
                        now_month: {
                            from: moment().dates(1).toDate(),
                            to: moment().add('months', 1).dates(0).toDate()
                        },
                        lastmonth: {
                            from: moment().add('months', -1).dates(1).toDate(),
                            to: moment().dates(0).toDate(),
                        }
                    },
                    filter: filter,
                    fromDate: (filter && filter.add_date)? moment(filter.add_date.from).toDate(): moment().toDate() ,
                    toDate: (filter && filter.add_date)?  moment(filter.add_date.to).toDate(): moment().toDate(),
                    dateType: (filter && filter.add_date)? dateType: null,
                    dateEnable: (filter && filter.add_date && dateType == "custom"),
                    getFromDate: function(){
                        return $("#from_date").data("kendoDatePicker").value();
                    },
                    getToDate: function(){
                        return $("#to_date").data("kendoDatePicker").value();
                    },
                    openDate: function(event){
                        $(event.sender.element).parents(".date-menu").addClass("menu-block");
                        $(event.sender.element).parents(".filter-menu").addClass("menu-block");
                    },
                    startDateChange: function(event){
                        var start = e("#from_date").data("kendoDatePicker");
                        var end = e("#to_date").data("kendoDatePicker");
                        end.min(start.value());
                    },
                    toDateChange: function(event){
                        var start = e("#from_date").data("kendoDatePicker");
                        var end = e("#to_date").data("kendoDatePicker");
                        start.max(end.value());
                    },
                    filterHover: function(event){
                        e(".date-menu").removeClass("menu-block");
                        e(".filter-menu").removeClass("menu-block");
                    },
                    enabledApplyTicketField: false,
                    changeDateFilter:function(event){
                        var filterName = $(event.target).val();
                        e(event.target).parents(".date-menu").children("li").removeClass("active");
                        e(event.target).parents("li.filter-date").addClass("active");
                        
                        if(filterName == "custom"){
                            $("#from_date").focus();
                            this.set("filterSettings.dateEnable",true);
                            $(event.target).parents(".date-menu").addClass("menu-block")
                            $(event.target).parents(".filter-menu").addClass("menu-block");
                        }else{
                            e(event.target).parents(".filter-menu").children("li").removeClass("active");
                            e(event.target).parents("li.filter-date").parents(".dropdown").addClass("active");
                            
                            $(event.target).parents(".date-menu").removeClass("menu-block");
                            this.set("filterSettings.dateEnable",false);
                            
                            var filter = this.filterSettings.dateFilters[filterName];

                            $("#from_date").data("kendoDatePicker").max(filter.to);
                            $("#from_date").data("kendoDatePicker").value(filter.from);

                            $("#to_date").data("kendoDatePicker").min(filter.from);
                            $("#to_date").data("kendoDatePicker").value(filter.to);

                            this.filterSettings.filter = {
                                add_date: {
                                    from: this.filterSettings.getFromDate(),
                                    to: this.filterSettings.getToDate()
                                }
                            };
                            this.filterSettings.applyFilter();
                        }
                    },
                    changeFilter: function(event){
                        filterType = e(event.target).data("filter");
                        this.filterSettings.dateType = "";
                        e('input[name="filter-date"]').prop("checked", false);
                        e(event.target).parents(".filter-menu").children("li").removeClass("active");
                        e(event.target).parent().addClass("active");
                        if(filterType == "all"){
                            this.filterSettings.filter = null;
                        }
                        if(filterType == "unread"){
                            this.filterSettings.filter = {
                                is_read: false
                            };
                        }
                        if(filterType == "read"){
                            this.filterSettings.filter = {
                                is_read: true
                            };
                        }
                        
                        this.filterSettings.applyFilter();
                    },
                    applyFilterTicketField: function(){
                        var that = this;
                        var filter = {};
                        var fields = e("#filter_ticket_fields").find(".ticket-field");
                        e.each(fields, function(index, value){
                            if(value.tagName == "INPUT" || value.tagName == "SELECT" || value.tagName == "TEXTAREA"){
                                filter.custom_fields = filter.custom_fields || {};
                                var enable = e("#checked_"+value.id);
                                if(enable.prop("checked")){
                                    var id = value.id.split("_")[1];
                                    if(this.type == "checkbox"){
                                        return filter.custom_fields[id] ={
                                            type: e(this).data("type"),
                                            value: this.checked ? "checked": "unchecked"
                                        };
                                    }
                                    filter.custom_fields[id]={
                                        type: e(this).data("type"),
                                        value: e(this).val()
                                    }
                                }
                            }
                        });
                        that.filterSettings.filter = filter;
                        e(".filter-menu").children("li").removeClass("active");
                        e("[data-filter='ticket-fields']").parents("li").addClass("active");
                        that.filterSettings.applyFilter();
                        e("#filter_ticket_fields").modal("hide");
                    },
                    cancelFilterTicketField: function(event){
                        this.filterSettings.filter = null;
                        e(".filter-menu").children("li").removeClass("active");
                        e(".filter-menu").children("li:first").addClass("active");
                        this.filterSettings.applyFilter();
                        e("#filter_ticket_fields").modal("hide");
                    },
                    changeCheckTicketField: function(event){
                        var enabled = false;
                        e(".checked_custom").each(function() {
                            if($(this).prop("checked") == true){
                                enabled = true;
                                return false;
                            }
                        });
                        vm.set("filterSettings.enabledApplyTicketField", enabled);
                    },
                    applyFilter: function(event){
                        var that = this.parent() || this;
                        if(event){
                            that.filterSettings.filter = {
                                add_date: {
                                    from: that.filterSettings.getFromDate(),
                                    to: that.filterSettings.getToDate()
                                }
                            };
                            e(event.target).parents(".dropdown-menu").removeClass("menu-block")
                            e(".filter-menu").removeClass("menu-block");
                            e(".filter-menu").children("li").removeClass("active");
                            e(event.target).parents(".dropdown").addClass("active");
                        }
                        that.resetSelectedConversations();
                        var listChannel = that.listChannelType || [];
                        if(listChannel.length > 0){
                            listChannel.forEach(function(channel){
                                var channelObj = that.get(channel);
                                channelObj.updateFilter? channelObj.updateFilter(true): null;
                            });
                        }
                    },
                    cancelFilter: function(event){
                        e(this.filterSettings.settingButton).removeClass('open');
                    },
                    showFilter: function(event){
                        e(this.filterSettings.settingButton).dropdown('toggle');
                    }
                };
            if(filter){
                if( filter.hasOwnProperty("add_date") ){
                    e("input[value='"+ dateType+"']").parents(".filter-date").addClass("active").parents(".dropdown").addClass("active");
                }else if( filter.hasOwnProperty("is_read") ){
                    var dataFilter = filter.is_read ? "read": "unread";
                    e("[data-filter='"+ dataFilter+"']").parent().addClass("active");
                }
            }else{
                e(".filter-menu").children("li:first").addClass("active");
            }
            vm.set(n, j);
        }(window.jQuery)
    }(),
    // channel tab control
    ! function () {
        ! function(e, t) {
            var vm = appViewModel,
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                n = "channelTabControl",
                j = {
                    tabStripTarget : "#channel_tab",
                    init: function(){
                        
                    },
                    select: function(item){
                        var t = e((this.tabStripTarget || this.channelTabControl.tabStripTarget)), tabStrip = t;
                         t ? (tabStrip = t.getKendoTabStrip(),tabStrip.select(item)): null;
                    },
                    onSelect: function(event){
                        this.filterChannel.select($(event.item).index());
                        var channel_type = this.getChannelType(this.selectedChannel);
                        var channel = this.get(channel_type);
                        channel? channel.clearSelection(): null;
                        //channel? channel.refresh(): null;
                        this.selectedConversation = null;
                        var view = new kendo.View("#"+app_name+"_tpl_empty_conversation", {model: {}, evalTemplate: true, wrap: false });
                        $("#app_content_column .content_column_wrapper").html("");
                        view.render($("#app_content_column .content_column_wrapper"));
                    },
                    selectedTab: function(){
                        var tab = e(this.tabStripTarget).data("kendoTabStrip").select()[0] || 0;
                        return tab;
                    },
                    getTabByName: function(name){
                        var value = this.parent().getChannelType(name);
                        return e(this.tabStripTarget).find(".k-tabstrip-items:first").children()[value];
                    }
//                    onActivate: function(){
//                         console.log("active");
//                    }
                };
            vm.set(n, j);
        }(window.jQuery)
    }(),
    //channel email 
    function () {
        ! function(e, t) {
            
            var vm = appViewModel,
                filter = vm.get("sessionSettings.filter")? vm.get("sessionSettings.filter").toJSON(): null,
                groupBy = vm.get("sessionSettings.groupBy")? vm.get("sessionSettings.groupBy"): "requester",
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                listTarget = "#email_list_view",
                type = 0,
                skip = 0,
                limit = 10,
                n = "email",
                j = {
                    init: function(){
                    },
                    type: type,
                    skip: skip,
                    limit: limit,
                    filter: "",
                    noReaded : false,
                    notifyResponses: 0,
                    loadMoreVisible: false,
                    listTarget: listTarget,
                    dataSource: new kendo.data.DataSource({ 
                        transport : {
                            read : {
                                url : baseurl + "/rest/portal/responses/",
                                dataType : "json",
                                data: {
                                    channel: type,
                                    skip: skip,
                                    limit: limit,
                                    filter: filter,
                                    group_by: groupBy,
                                    current_user: vm.appSettings.currentAgent
                                },
                                type : "POST",
                            }
                        },
                        sort: { field: "response_time", dir: "desc" },
                        schema: {
                            data: "data",
                            total: "total"
                        },
                        requestStart: function(e) {
                            kendo.ui.progress($(listTarget), true);
                        },
                        requestEnd: function(e) {
                            that = this.parent();
                            var response = e.response;
                            if(response && !response.is_error){
                                // visible load more;
                                that.set("loadMoreVisible", response.total > response.data.length);
                                that = this.parent();
                                that.notifyResponses = response.total_noread;

                                that.noReaded = (that.notifyResponses >0) ;
                                that.refreshNotify();
                            }
                            
                            kendo.ui.progress($(listTarget), false);
                        },
                    }),
                    // event handler
                    change: function(e){
                        var that = this;
                        var selected = e.sender.select()[0];
                        if(!selected){
                            return;
                        }
                        that.selectedConversation = selected? e.sender.dataItem($(selected)): {};
                        that.selectedResponse = {
                            response: "--",
                            tags: []
                        };
                        
                        this.updateConversationContent(that.email.type);
                    },
                    loadMore: function(e){
                        this.email.limit += 10;
                        this.email.dataSource.transport.options.read.data.limit += this.email.limit;
                        this.email.dataSource.read();
                    },
                    submitFilter: function(event){
                        var filter = e(event.target).val() || "";
                        var filObj = this.get(n).dataSource.transport.options.read.data.filter || {};
                        filObj.requester = filter;
                        this.get(n).dataSource.transport.options.read.data.filter = filObj;
                        this.get(n).dataSource.read();
                    },
                    // public function
                    updateFilter: function(isServer){
                        var that = this.parent() || this;
                        var filObj = that.get("email").dataSource.transport.options.read.data.filter || {};
                        var filSet = that.filterSettings.filter || {} ;
                        
                        if(filObj.requester){
                            filSet.requester = filObj.requester;
                        }
                        
                        that.get("email").dataSource.transport.options.read.data.filter = filSet;
                        isServer? that.get("email").dataSource.read(): null;
                    },
                    updateGroupBy: function(isServer){
                        
                        var group = this.parent().appSettings.groupBy ;
                        var groupObj = this.dataSource.transport.options.read.data.group_by || "";
                        groupObj= group;
                        this.dataSource.transport.options.read.data.group_by = groupObj;
                        isServer? this.dataSource.read(): null;
                    },
                    getType: function(){
                        return this.type;
                    },
                    getPrevResponse: function(item){
                        var index = this.get("dataSource").indexOf(item);
                        return index? this.get("dataSource").at(index): null;
                    },
                    updateDataSource: function(data){
                        var  a = this;
                        return (a.lisView && data && Array.isArray(data))? a.lisView.setDataSource(
                            new kendo.data.DataSource({
                                data: data
                            })
                        ):  undefined;
                    },
                    resetNoReadCurrent: function(){
                        var that = this.parent();
                        var listview = e(this.listTarget).data("kendoListView");
                        
                        var selected = this.parent().selectedConversation;
                        selectedItem = (selected && listview)? listview.dataItem(listview.element.find("[data-uid='"+selected.uid+"']")): null;
                        if(selectedItem){
                            selectedItem.is_read = true;
                            selectedItem.no_read = 0;
                            listview ? this.refresh(false, true) : null;
                        }
                        this.notifyResponses -= 1;
                        this.noReaded = this.notifyResponses > 0;
                        
                        this.refreshNotify();
                    },
                    refreshNotify: function(){
                        var that = this;
                        var selectedTab = that.parent().channelTabControl.getTabByName(n);
                        e(selectedTab).find(".badge").html(that.notifyResponses);
                        that.noReaded? e(selectedTab).find(".badge").show():e(selectedTab).find(".badge").hide() ;
                    },
                    clearSelection: function(){
                        var listview = e(this.listTarget).data("kendoListView");
                        listview ? listview.clearSelection(): null;
                    },
                    refresh: function(isServer,isSelected, callback){
                        var that = this;
                        var listview = e(this.listTarget).data("kendoListView");
                        
                        var selected = this.parent().selectedConversation;
                        
                        var fetch = function(result){
                            if(callback){
                                callback();
                            }
                        };
                        if(listview){
                            if(isServer){
                                listview.dataSource.read();
                                fetch();
                            }else{
                                listview.refresh();
                                fetch();
                                isSelected? listview.element.find("[data-uid='"+selected.uid+"']").addClass("k-state-selected"): null;
                            }
                        }
                    }
                };
            vm.set(n, j);
        }(window.jQuery)
    }(),
    //channel facebook 
    function () {
        ! function(e, t) {
            var vm = appViewModel,
                filter = vm.get("sessionSettings.filter")? vm.get("sessionSettings.filter").toJSON(): null,
                groupBy = vm.get("sessionSettings.groupBy")? vm.get("sessionSettings.groupBy"): "requester",
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                type ={
                    comment: 21,
                    messages: 22
                },
                skip = 0,
                limit = 10,
                n = "facebook",
                j = {
                    init: function(){
                        this.comments.init();
                        this.messages.init();
                    },
                    noReaded: false,
                    notifyResponses: 0,
                    // public function
                    getType: function(){
                        if(e(this.selectedTab()).index() == 0){
                            return this.messages.getType();
                        }else{
                            return this.comments.getType();
                        }
                    },
                    refresh: function(isServer, isSelected, callback){
                        if(e(this.selectedTab()).index() == 0){
                            this.messages.refresh(isServer, isSelected, callback);
                        }else{
                            this.comments.refresh(isServer, isSelected, callback);
                        }
                    },
                    clearSelection: function(){
                        if(e(this.selectedTab()).index() == 0){
                            this.messages.clearSelection();
                        }else{
                            this.comments.clearSelection();
                        }
                    },
                    selectedTab: function(){
                        var tab = e("#fb_tab_ctrl").data("kendoTabStrip").select()[0] || 0;
                        return tab;
                    },
                    tabChange: function(e){
                        this.selectedConversation = null;
                        this.facebook.refresh();
                        var view = new kendo.View("#"+app_name+"_tpl_empty_conversation", {model: {}, evalTemplate: true, wrap: false });
                        $("#app_content_column .content_column_wrapper").html("");
                        view.render($("#app_content_column .content_column_wrapper"));
                        this.showRightColunm(false);
                    },
                    resetNoReadCurrent: function(){
                        if(e(this.selectedTab()).index() == 0){
                            this.messages.resetNoReadCurrent();
                        }else{
                            this.comments.resetNoReadCurrent();
                        }
                    },
                    minusNoRead: function(){
                        if(e(this.selectedTab()).index() == 0){
                            this.messages.minusNoRead();
                        }else{
                            this.comments.minusNoRead();
                        }
                    },
                    refreshNotify: function(){
                        if(e(this.selectedTab()).index() == 0){
                            this.messages.refreshNotify();
                        }else{
                            this.comments.refreshNotify();
                        }
                    },
                    messages: {
                        init: function(){
                        },
                        isInit: true,
                        type: type.messages,
                        skip: skip,
                        limit: limit,
                        filter: "",
                        noReaded: false,
                        notifyResponses: 0,
                        loadMoreVisible: false,
                        listTarget: "#fb_messages_list_view",
                        dataSource: new kendo.data.DataSource({ 
                            transport : {
                                read : {
                                    url : baseurl + "/rest/portal/responses",
                                    dataType : "json",
                                    data: {
                                        channel: type.messages,
                                        skip: skip,
                                        limit: limit,
                                        filter: filter,
                                        group_by: groupBy,
                                        current_user: vm.appSettings.currentAgent
                                    },
                                    type : "POST",
                                }
                            },
                            schema: {
                                data: "data",
                            },
                            requestStart: function(e) {
                                kendo.ui.progress($("#fb_messages_list_view"), true);
                            },
                            requestEnd: function(e) {
                                var that = this.parent();
                                var response = e.response;
                                if(response && !response.is_error){
                                    that.set("loadMoreVisible", response.total > response.data.length);
                                    that.notifyResponses = response.total_noread;
                                    var fbParent = that.parent();
                                    that.parent().notifyResponses = that.notifyResponses + (fbParent.comments || {notifyResponses: 0 }).notifyResponses;

                                    that.noReaded = that.notifyResponses > 0 ;
                                    that.parent().noReaded =  that.parent().notifyResponses > 0 ;
                                    that.refreshNotify();
                                }

                                kendo.ui.progress($("#fb_messages_list_view"), false);
                            }
                        }),
                        // event handler
                        change: function(e){
                            var that = this;
                            var selected = e.sender.select()[0];
                            if(!selected){
                                return;
                            }
                            that.selectedConversation = selected? e.sender.dataItem($(selected)): {};
                            that.selectedResponse = {
                                response: "--",
                                tags: []
                            };

                            this.updateConversationContent(that.facebook.messages.type);
                        },
                        submitFilter: function(event){
                            var filter = e(event.target).val() || "";
                            var filObj = this.facebook.messages.dataSource.transport.options.read.data.filter || {};
                            filObj.requester = filter;
                           
                            this.get("facebook.messages").dataSource.transport.options.read.data.filter = filObj;
                            this.get("facebook.messages").dataSource.read();
                        },
                        loadMore: function(event){
                            //var limit = this.email.dataSource.transport.options.read.data.limit;
                            this.facebook.messages.limit += 10;
                            this.facebook.messages.dataSource.transport.options.read.data.limit += this.facebook.messages.limit;
                            this.facebook.messages.dataSource.read();
                        },
                        // public function
                        updateFilter: function(isServer){
                            var that = this.parent().parent() || this;
                            var filObj = that.get("facebook.messages").dataSource.transport.options.read.data.filter || {};
                            var filSet = that.filterSettings.filter || {};

                            if(filObj.requester){
                                filSet.requester = filObj.requester;
                            }
                            
                            that.get("facebook.messages").dataSource.transport.options.read.data.filter = filSet;
//                            that.get("facebook.messages").dataSource.read();
                            isServer? that.get("facebook.messages").dataSource.read(): null;
                        },
                        updateGroupBy: function(isServer){
                            var that = this.parent().parent();
                            var group = that.appSettings.groupBy ;
                            var groupObj = that.get("facebook.messages").dataSource.transport.options.read.data.group_by || "";
                            groupObj= group;
                            that.get("facebook.messages").dataSource.transport.options.read.data.group_by = groupObj;
                            isServer? that.get("facebook.messages").dataSource.read(): null;
                        },
                        getType: function(){
                            return this.type;
                        },
                        resetNoReadCurrent: function(){
                            var listview = e(this.listTarget).data("kendoListView");

                            var selected = this.parent().parent().selectedConversation;
                            selectedItem = (selected && listview)? listview.dataItem(listview.element.find("[data-uid='"+selected.uid+"']")): null;
                            if(selectedItem){
                                selectedItem.is_read = true;
                                selectedItem.no_read = 0;
                                listview ? this.refresh(false, true) : null;
                            }
                            this.notifyResponses -= 1;
                            this.parent().notifyResponses -= 1;

                            this.noReaded = (this.notifyResponses >0) ;
                            this.parent().noReaded =  this.parent().notifyResponses > 0 ;
                            this.refreshNotify();
                            
                        },
                        minusNoRead: function(){
                            this.notifyResponses -= 1;
                            this.parent().notifyResponses -= 1;

                            this.noReaded = (this.notifyResponses >0) ;
                            this.parent().noReaded =  this.parent().notifyResponses > 0 ;
                            
                            this.refreshNotify();
                        },
                        refreshNotify: function(){
                            var that = this;
                            
                            //parent tab
                            var selectedTab = that.parent().parent().channelTabControl.getTabByName(n);
                            e(selectedTab).find(".badge").html(that.parent().notifyResponses);
                            that.parent().noReaded? e(selectedTab).find(".badge").show():e(selectedTab).find(".badge").hide() ;

                            //child tab
                            var selectedChildTab = e("#fb_tab_ctrl").find("ul.k-tabstrip-items").children("li:eq(0)");
                            e(selectedChildTab).find(".badge").html(that.notifyResponses);
                            that.noReaded? e(selectedChildTab).find(".badge").show():e(selectedChildTab).find(".badge").hide() ;
                        },
                        updateDataSource: function(data){
                            var  a = this;
                            return (a.lisView && data && Array.isArray(data))? a.lisView.setDataSource(
                                new kendo.data.DataSource({
                                    data: data
                                })
                            ):  undefined;
                        },
                        clearSelection: function(){
                            var listview = e(this.listTarget).data("kendoListView");
                            listview ? listview.clearSelection(): null;
                        },
                        refresh: function(isServer, isSelected, callback){
                            //console.log("refresh");
                            var that = this;
                            var listview = e(this.listTarget).data("kendoListView");

                            var selected = this.parent().parent().selectedConversation;

                            var fetch = function(result){
                                if(callback){
                                    callback();
                                }
                            };
                            if(listview){
                                if(isServer){
                                    listview.dataSource.read();
                                    fetch();
                                }else{
                                    listview.refresh();
                                    fetch();
                                    isSelected? listview.element.find("[data-uid='"+selected.uid+"']").addClass("k-state-selected"): null;
                                }
                            }
                        },
                    },
                    comments: {
                        init: function(){
                        },
                        isInit: true,
                        type: 21,
                        skip: skip,
                        limit: limit,
                        filter: "",
                        noReaded: false,
                        notifyResponses: 0,
                        loadMoreVisible: false,
                        listTarget: "#fb_comment_list_view",
                        dataSource: new kendo.data.DataSource({ 
                            transport : {
                                read : {
                                    url : baseurl + "/rest/portal/responses",
                                    dataType : "json",
                                    data: {
                                        channel: type.comment,
                                        skip: skip,
                                        limit: limit,
                                        filter: filter,
                                        group_by: groupBy,
                                        current_user: vm.appSettings.currentAgent
                                    },
                                    type : "POST",
                                }
                            },
                            schema: {
                                data: "data",
                            },
                            requestEnd: function(e) {
                                var that = this.parent();
                                var response = e.response;
                                if(response && !response.is_error){
                                    that.set("loadMoreVisible", response.total > response.data.length);
                                    
                                    that.notifyResponses = response.total_noread;
                                    var fbParent = that.parent();
                                    fbParent.notifyResponses = that.notifyResponses + (fbParent.messages || {notifyResponses: 0 }).notifyResponses;

                                    that.noReaded = that.notifyResponses > 0 ;
                                    that.parent().noReaded =  that.parent().notifyResponses > 0 ;
                                    that.refreshNotify();

                                }

                                kendo.ui.progress($("#fb_comment_list_view"), false);
                            }
                        }),
                        // even handler
                        change: function(e){
                            var that = this;
                            var selected = e.sender.select()[0];
                            if(!selected){
                                return;
                            }
                            selected = selected? e.sender.dataItem($(selected)): {};
                            that.selectedConversation = selected;
                            that.selectedResponse = {
                                response: "--",
                                tags: []
                            };

                            this.updateConversationContent(that.facebook.comments.type);
                        },
                        submitFilter: function(event){
                            var filter = e(event.target).val() || "";
                            var filObj = this.facebook.comments.dataSource.transport.options.read.data.filter || {};
                            filObj.requester = filter;
                            
                            this.get("facebook.comments").dataSource.transport.options.read.data.filter = filObj;
                            this.get("facebook.comments").dataSource.read();
                        },
                        loadMore: function(event){
                            //var limit = this.email.dataSource.transport.options.read.data.limit;
                            this.facebook.comments.limit += 10;
                            this.facebook.comments.dataSource.transport.options.read.data.limit += this.facebook.comments.limit;
                            this.facebook.comments.dataSource.read();
                        },
                        hide: function(event){
                            var parentTarget = e(event.currentTarget).parents("li");
                            var listview = $(this.conversationsListTarget).data("kendoListView");
                            var dataItem ;

                            listview ? (dataItem = listview.dataItem(parentTarget)): null;
                            if(!dataItem){
                                return;
                            }

                            var split = dataItem.thread_message_id.split("_");
                            var commentId = split.length > 2 ? split[1] + "_"+ split[2] : dataItem.thread_message_id;
                            var data = {
                                comment_id: commentId,
                                contact_info: dataItem.contact_info,
                                response_id: dataItem.id,
                                method: e(event.currentTarget).data("method"),
                                type: dataItem.id == dataItem.ticket_id ? "ticket": "responses",
                                ticket_id: dataItem.ticket_id
                            };

                            postData('/rest/ticket/hidden-facebook-comments',"POST",data, function(result){
                                if(result.is_error){
                                    //TODO:
                                } else {
                                    listview.dataSource.read();
                                }
                            });
                        },
                        like: function(event){
                           var parentTarget = e(event.currentTarget).parents("li");
                            var listview = $(this.conversationsListTarget).data("kendoListView");
                            var dataItem ;

                            listview ? (dataItem = listview.dataItem(parentTarget)): null;
                            if(!dataItem){
                                return;
                            }

                            var split = dataItem.thread_message_id.split("_");
                            var commentId = split.length > 2 ? split[1] + "_"+ split[2] : dataItem.thread_message_id;
                            var data = {
                                comment_id: commentId,
                                contact_info: dataItem.contact_info,
                                response_id: dataItem.id,
                                method: e(event.currentTarget).data("method"),
                                type: dataItem.id == dataItem.ticket_id ? "ticket": "responses",
                                ticket_id: dataItem.ticket_id
                            };

                            console.log(data)
                            postData('/rest/ticket/like-facebook-comments',"POST",data, function(result){
                                if(result.is_error){
                                    //TODO:
                                } else {
                                    listview.dataSource.read();
                                }
                            });
                        },
                        // public function
                        updateFilter: function(isServer){
                            var that = this.parent().parent() || this;
                            var filObj = that.get("facebook.comments").dataSource.transport.options.read.data.filter || {};
                            var filSet = that.filterSettings.filter || {} ;

                            if(filObj.requester){
                                filSet.requester = filObj.requester;
                            }
                            that.get("facebook.comments").dataSource.transport.options.read.data.filter = filSet;
//                            that.get("facebook.comments").dataSource.read();
                            isServer? that.get("facebook.comments").dataSource.read(): null;
                        },
                        updateGroupBy: function(isServer){
                            var that = this.parent().parent();
                            var group = that.appSettings.groupBy ;
                            var groupObj = that.get("facebook.comments").dataSource.transport.options.read.data.group_by || "";
                            groupObj= group;
                            that.get("facebook.comments").dataSource.transport.options.read.data.group_by = groupObj;
                            isServer? that.get("facebook.comments").dataSource.read(): null;
                        },
                        getType: function(){
                            return this.type;
                        },
                        resetNoReadCurrent: function(){
                            var listview = e(this.listTarget).data("kendoListView");

                            var selected = this.parent().parent().selectedConversation;
                            selectedItem = (selected && listview)? listview.dataItem(listview.element.find("[data-uid='"+selected.uid+"']")): null;
                            if(selectedItem){
                                selectedItem.is_read = true;
                                selectedItem.no_read = 0;
                                listview ? this.refresh(false, true) : null;
                            }
                            this.notifyResponses -= 1;
                            this.parent().notifyResponses -= 1;

                            this.noReaded = (this.notifyResponses >0) ;
                            this.parent().noReaded =  this.parent().notifyResponses > 0 ;
                            this.refreshNotify();
                        },
                        minusNoRead: function(){
                            this.notifyResponses -= 1;
                            this.parent().notifyResponses -= 1;

                            this.noReaded = (this.notifyResponses >0) ;
                            this.parent().noReaded =  this.parent().notifyResponses > 0 ;
                            
                            this.refreshNotify();
                        },
                        refreshNotify: function(){
                            var that = this;
                            
                            var selectedTab = that.parent().parent().channelTabControl.getTabByName(n);
                            e(selectedTab).find(".badge").html(that.parent().notifyResponses);
                            that.parent().noReaded? e(selectedTab).find(".badge").show():e(selectedTab).find(".badge").hide() ;

                            //child tab
                            var selectedChildTab = e("#fb_tab_ctrl").find("ul.k-tabstrip-items").children("li:eq(1)");
                            e(selectedChildTab).find(".badge").html(that.notifyResponses);
                            that.noReaded? e(selectedChildTab).find(".badge").show():e(selectedChildTab).find(".badge").hide() ;
                        },
                        updateDataSource: function(data){
                            var  a = this;
                            return (a.lisView && data && Array.isArray(data))? a.lisView.setDataSource(
                                new kendo.data.DataSource({
                                    data: data
                                })
                            ):  undefined;
                        },
                        clearSelection: function(){
                            var listview = e(this.listTarget).data("kendoListView");
                            listview ? listview.clearSelection(): null;
                        },
                        refresh: function(isServer, isSelected, callback){
                            var that = this;
                            var listview = e(this.listTarget).data("kendoListView");

                            var selected = this.parent().parent().selectedConversation;

                            var fetch = function(result){
                                if(callback){
                                    callback();
                                }
                            };
                            if(listview){
                                if(isServer){
                                    listview.dataSource.read();
                                    fetch();
                                }else{
                                    listview.refresh();
                                    fetch();
                                    isSelected? listview.element.find("[data-uid='"+selected.uid+"']").addClass("k-state-selected"): null;
                                }
                            }
                        }
                    },
                };
            vm.set(n, j);
        }(window.jQuery)
    }(),
    //channel sms
    function () {
        ! function(e, t) {
            var vm = appViewModel,
                filter = vm.get("sessionSettings.filter")? vm.get("sessionSettings.filter").toJSON(): null,
                groupBy = vm.get("sessionSettings.groupBy")? vm.get("sessionSettings.groupBy"): "requester",
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                listTarget = "#sms_list_view",
                type = 7,
                skip = 0,
                limit = 10,
                n = "sms",
                j = {
                    init: function(){
                        var that = this;
                        var url = baseurl + "/rest/portal/responses/";
                        $.ajax({
                            url: url,
                            method : "POST" ,
                            data: {
                                channel: type,
                                skip: skip,
                                limit: -1,
                                is_total: true
                            },
                            success: function(result) {
                                that.notifyResponses = result.total;
                                that.noReaded = (result && result.total >0);
                            },
                            async: false 
                        });
                    },
                    type: type,
                    skip: skip,
                    limit: limit,
                    filter: "",
                    noReaded: false,
                    notifyResponses: 0,
                    loadMoreVisible: false,
                    listTarget: listTarget,
                    dataSource: new kendo.data.DataSource({ 
                        transport : {
                            read : {
                                url : baseurl + "/rest/portal/responses",
                                dataType : "json",
                                data: {
                                    channel: type,
                                    skip: skip,
                                    limit: limit,
                                    filter: filter,
                                    group_by: groupBy,
                                    current_user: vm.appSettings.currentAgent
                                },
                                type : "POST",
                            }
                        },
                        schema: {
                            data: "data",
                        },
                        requestEnd: function(e) {
                            var response = e.response;
                            if(response && !response.is_error){
                                var that = this.parent();
                                
                                that.set("loadMoreVisible", response.total > response.data.length);
                                that.notifyResponses = response.total_noread;
                                that.noReaded = (that.notifyResponses >0) ;
                                
                                that.refreshNotify();

                            }

                            kendo.ui.progress($(listTarget), false);
                        }
                    }),
                    change: function(e){
                        var that = this;
                        var selected = e.sender.select()[0];
                        if(!selected){
                            return;
                        }
                        that.selectedConversation = selected? e.sender.dataItem($(selected)): {};
                        that.selectedResponse = {
                            response: "--",
                            tags: []
                        };

                        this.updateConversationContent(that.sms.type);
                    },
                    submitFilter: function(event){
                        var filter = e(event.target).val() || "";
                        var filObj = this.email.dataSource.transport.options.read.data.filter || {};
                        filObj.requester = filter;
                        
                        this.get("sms").dataSource.transport.options.read.data.filter = filObj;
                        this.get("sms").dataSource.read();
                    },
                    loadMore: function(event){
                        //var limit = this.email.dataSource.transport.options.read.data.limit;
                        this.sms.limit += 10;
                        this.sms.dataSource.transport.options.read.data.limit += this.email.limit;
                        this.sms.dataSource.read();
                    },
                    // public function
                    updateFilter: function(isServer){
                        var that = this.parent() || this;
                        var filObj = that.get(n).dataSource.transport.options.read.data.filter || {};
                        var filSet = that.filterSettings.filter || {};

                        if(filObj.requester){
                            filSet.requester = filObj.requester;
                        }
                        that.get("sms").dataSource.transport.options.read.data.filter = filSet;
//                        that.get("sms").dataSource.read();
                        isServer? that.get("sms").dataSource.read(): null;
                    },
                    updateGroupBy: function(isServer){
                        var that = this.parent();
                        var group = that.appSettings.groupBy ;
                        var groupObj = that.get(n).dataSource.transport.options.read.data.group_by || "";
                        groupObj= group;
                        that.get(n).dataSource.transport.options.read.data.group_by = groupObj;
                        isServer? that.get(n).dataSource.read(): null;
                    },
                    getType: function(){
                        return this.type;
                    },
                    resetNoReadCurrent: function(){
                        var listview = e(this.listTarget).data("kendoListView");
                        
                        var selected = this.parent().selectedConversation;
                        selectedItem = (selected && listview)? listview.dataItem(listview.element.find("[data-uid='"+selected.uid+"']")): null;
                        if(selectedItem){
                            selectedItem.is_read = true;
                            selectedItem.no_read = 0;
                            listview ? this.refresh(false, true) : null;
                        }
                        this.notifyResponses -= 1;
                        this.noReaded = this.notifyResponses > 0;
                        
                        this.refreshNotify();
                    },
                    refreshNotify: function(){
                        var that = this;

                        var selectedTab = that.parent().channelTabControl.getTabByName(n);
                        e(selectedTab).find(".badge").html(that.notifyResponses);
                        that.noReaded? e(selectedTab).find(".badge").show():e(selectedTab).find(".badge").hide() ;
                    },
                    updateDataSource: function(data){
                        var  a = this;
                        return (a.lisView && data && Array.isArray(data))? a.lisView.setDataSource(
                            new kendo.data.DataSource({
                                data: data
                            })
                        ):  undefined;
                    },
                    clearSelection: function(){
                        var listview = e(this.listTarget).data("kendoListView");
                        listview ? listview.clearSelection(): null;
                    },
                    refresh: function(isServer, isSelected, callback){
                        //console.log("sms refresh");
                        var that = this;
                        var listview = e(this.listTarget).data("kendoListView");
                        var selected = this.parent().selectedConversation;

                        var fetch = function(){
                            if(callback){
                                callback();
                            }
                        };
                        if(listview){
                            if(isServer){
                                listview.dataSource.read();
                                fetch();
                            }else{
                                listview.refresh();
                                fetch();
                                isSelected? listview.element.find("[data-uid='"+selected.uid+"']").addClass("k-state-selected"): null;
                            }
                        }
                    }
                };
            vm.set(n, j);
        }(window.jQuery)
    }(),
    //channel chat
    function () {
        ! function(e, t) {
            var vm = appViewModel,
                filter = vm.get("sessionSettings.filter")? vm.get("sessionSettings.filter").toJSON(): null,
                groupBy = vm.get("sessionSettings.groupBy")? vm.get("sessionSettings.groupBy"): "requester",
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                listTarget = "#chat_list_view",
                type = 3,
                skip = 0,
                limit = 10,
                n = "chat",
                j = {
                    init: function(){
                        var that = this;
                        var url = baseurl + "/rest/portal/responses/";
                        $.ajax({
                            url: url,
                            method : "POST" ,
                            data: {
                                channel: type,
                                skip: skip,
                                limit: -1,
                                is_total: true
                            },
                            success: function(result) {
                                that.notifyResponses = result.total;
                                that.noReaded = (result && result.total >0);
                            },
                            async: false 
                        });
                    },
                    type: type,
                    skip: skip,
                    limit: limit,
                    filter: "",
                    noReaded: false,
                    notifyResponses: 0,
                    loadMoreVisible: false,
                    listTarget: listTarget,
                    dataSource: new kendo.data.DataSource({ 
                        transport : {
                            read : {
                                url : baseurl + "/rest/portal/responses",
                                dataType : "json",
                                data: {
                                    channel: type,
                                    skip: skip,
                                    limit: limit,
                                    filter: filter,
                                    group_by: groupBy,
                                    current_user: vm.appSettings.currentAgent
                                },
                                type : "POST",
                            }
                        },
                        schema: {
                            data: "data",
                        },
                        requestEnd: function(e) {
                            var response = e.response;
                            if(response && !response.is_error){
                                var that = this.parent();
                                
                                that.set("loadMoreVisible", response.total > response.data.length);
                                that.notifyResponses = response.total_noread;
                                that.noReaded = (that.notifyResponses >0) ;
                                
                                that.refreshNotify();

                            }

                            kendo.ui.progress($(listTarget), false);
                        }
                    }),
                    change: function(e){
                        var that = this;
                        var selected = e.sender.select()[0];
                        if(!selected){
                            return;
                        }
                        that.selectedConversation = selected? e.sender.dataItem($(selected)): {};
                        that.selectedResponse = {
                            response: "--",
                            tags: []
                        };

                        this.updateConversationContent(that.get(n).type);
                    },
                    submitFilter: function(event){
                        var filter = e(event.target).val() || "";
                        var filObj = this.email.dataSource.transport.options.read.data.filter || {};
                        filObj.requester = filter;
                        
                        this.get(n).dataSource.transport.options.read.data.filter = filter;
                        this.get(n).dataSource.read();
                    },
                    loadMore: function(event){
                        this.chat.limit += 10;
                        this.chat.dataSource.transport.options.read.data.limit += this.email.limit;
                        this.chat.dataSource.read();
                    },
                    // public function
                    updateFilter: function(isServer){
                        var that = this.parent() || this;
                        var filObj = that.get(n).dataSource.transport.options.read.data.filter || {};
                        var filSet = that.filterSettings.filter || {};

                        if(filObj.requester){
                            filSet.requester = filObj.requester;
                        }
                        that.get(n).dataSource.transport.options.read.data.filter = filSet;
//                        that.get(n).dataSource.read();
                        isServer? that.get(n).dataSource.read(): null;
                    },
                    updateGroupBy: function(isServer){
                        var that = this.parent();
                        var group = that.appSettings.groupBy ;
                        var groupObj = that.get(n).dataSource.transport.options.read.data.group_by || "";
                        groupObj= group;
                        that.get(n).dataSource.transport.options.read.data.group_by = groupObj;
                        isServer? that.get(n).dataSource.read(): null;
                    },
                    getType: function(){
                        return this.type;
                    },
                    resetNoReadCurrent: function(){
                        var listview = e(this.listTarget).data("kendoListView");
                        
                        var selected = this.parent().selectedConversation;
                        selectedItem = (selected && listview)? listview.dataItem(listview.element.find("[data-uid='"+selected.uid+"']")): null;
                        if(selectedItem){
                            selectedItem.is_read = true;
                            selectedItem.no_read = 0;
                            listview ? this.refresh(false, true) : null;
                        }
                        this.notifyResponses -= 1;
                        this.noReaded = this.notifyResponses > 0;
                        
                        this.refreshNotify();
                    },
                    refreshNotify: function(){
                        var that = this;

                        var selectedTab = that.parent().channelTabControl.getTabByName(n);
                        e(selectedTab).find(".badge").html(that.notifyResponses);
                        that.noReaded? e(selectedTab).find(".badge").show():e(selectedTab).find(".badge").hide() ;
                    },
                    updateDataSource: function(data){
                        var  a = this;
                        return (a.lisView && data && Array.isArray(data))? a.lisView.setDataSource(
                            new kendo.data.DataSource({
                                data: data
                            })
                        ):  undefined;
                    },
                    clearSelection: function(){
                        var listview = e(this.listTarget).data("kendoListView");
                        listview ? listview.clearSelection(): null;
                    },
                    refresh: function(isServer, isSelected, callback){
                        //console.log("sms refresh");
                        var that = this;
                        var listview = e(this.listTarget).data("kendoListView");
                        var selected = this.parent().selectedConversation;

                        var fetch = function(){
                            if(callback){
                                callback();
                            }
                        };
                        if(listview){
                            if(isServer){
                                listview.dataSource.read();
                                fetch();
                            }else{
                                listview.refresh();
                                fetch();
                                isSelected? listview.element.find("[data-uid='"+selected.uid+"']").addClass("k-state-selected"): null;
                            }
                        }
                    }
                };
            vm.set(n, j);
        }(window.jQuery)
    }(),
    //channel comments
    function () {
        ! function(e, t) {
            var vm = appViewModel,
                filter = vm.get("sessionSettings.filter")? vm.get("sessionSettings.filter").toJSON(): null,
                groupBy = vm.get("sessionSettings.groupBy")? vm.get("sessionSettings.groupBy"): "requester",
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                listTarget = "#comment_list_view",
                type = 8,
                skip = 0,
                limit = 10,
                n = "comments",
                j = {
                    init: function(){
                        var that = this;
                        var url = baseurl + "/rest/portal/responses/";
                        $.ajax({
                            url: url,
                            method : "POST" ,
                            data: {
                                channel: type,
                                skip: skip,
                                limit: -1,
                                is_total: true
                            },
                            success: function(result) {
                                that.notifyResponses = result.total;
                                that.noReaded = (result && result.total >0);
                            },
                            async: false 
                        });
                    },
                    type: type,
                    skip: skip,
                    limit: limit,
                    filter: "",
                    noReaded: false,
                    notifyResponses: 0,
                    loadMoreVisible: false,
                    listTarget: listTarget,
                    dataSource: new kendo.data.DataSource({ 
                        transport : {
                            read : {
                                url : baseurl + "/rest/portal/responses",
                                dataType : "json",
                                data: {
                                    channel: type,
                                    skip: skip,
                                    limit: limit,
                                    filter: filter,
                                    group_by: groupBy,
                                    current_user: vm.appSettings.currentAgent
                                },
                                type : "POST",
                            }
                        },
                        schema: {
                            data: "data",
                        },
                        requestEnd: function(e) {
                            var response = e.response;
                            if(response && !response.is_error){
                                var that = this.parent();
                                
                                that.set("loadMoreVisible", response.total > response.data.length);
                                that.notifyResponses = response.total_noread;
                                that.noReaded = (that.notifyResponses >0) ;
                                
                                that.refreshNotify();
                            }

                            kendo.ui.progress($(listTarget), false);
                        }
                    }),
                    change: function(e){
                        var that = this;
                        var selected = e.sender.select()[0];
                        if(!selected){
                            return;
                        }
                        that.selectedConversation = selected? e.sender.dataItem($(selected)): {};
                        that.selectedResponse = {
                            response: "--",
                            tags: []
                        };

                        this.updateConversationContent(that.get(n).type);
                    },
                    submitFilter: function(event){
                        var filter = e(event.target).val() || "";
                        var filObj = this.email.dataSource.transport.options.read.data.filter || {};
                        filObj.requester = filter;
                        
                        this.get(n).dataSource.transport.options.read.data.filter = filter;
                        this.get(n).dataSource.read();
                    },
                    loadMore: function(event){
                        //var limit = this.email.dataSource.transport.options.read.data.limit;
                        this.comments.limit += 10;
                        this.comments.dataSource.transport.options.read.data.limit += this.email.limit;
                        this.comments.dataSource.read();
                    },
                    // public function
                    updateFilter: function(isServer){
                        var that = this.parent() || this;
                        var filObj = that.get(n).dataSource.transport.options.read.data.filter || {};
                        var filSet = that.filterSettings.filter || {} ;

                        if(filObj.requester){
                            filSet.requester = filObj.requester;
                        }
                        that.get(n).dataSource.transport.options.read.data.filter = filSet;
                        that.get(n).dataSource.read();
                        isServer? that.get(n).dataSource.read(): null;
                    },
                    updateGroupBy: function(isServer){
                        var that = this.parent();
                        var group = that.appSettings.groupBy ;
                        var groupObj = that.get(n).dataSource.transport.options.read.data.group_by || "";
                        groupObj= group;
                        that.get(n).dataSource.transport.options.read.data.group_by = groupObj;
                        isServer? that.get(n).dataSource.read(): null;
                    },
                    getType: function(){
                        return this.type;
                    },
                    resetNoReadCurrent: function(){
                        var listview = e(this.listTarget).data("kendoListView");
                        
                        var selected = this.parent().selectedConversation;
                        selectedItem = (selected && listview)? listview.dataItem(listview.element.find("[data-uid='"+selected.uid+"']")): null;
                        if(selectedItem){
                            selectedItem.is_read = true;
                            selectedItem.no_read = 0;
                            listview ? this.refresh(false, true) : null;
                        }
                        this.notifyResponses -= 1;
                        this.noReaded = this.notifyResponses > 0;
                        
                        this.refreshNotify();
                    },
                    refreshNotify: function(){
                        var that = this;

                        var selectedTab = that.parent().channelTabControl.getTabByName(n);
                        e(selectedTab).find(".badge").html(that.notifyResponses);
                        that.noReaded? e(selectedTab).find(".badge").show():e(selectedTab).find(".badge").hide() ;
                    },
                    updateDataSource: function(data){
                        var  a = this;
                        return (a.lisView && data && Array.isArray(data))? a.lisView.setDataSource(
                            new kendo.data.DataSource({
                                data: data
                            })
                        ):  undefined;
                    },
                    clearSelection: function(){
                        var listview = e(this.listTarget).data("kendoListView");
                        listview ? listview.clearSelection(): null;
                    },
                    refresh: function(isServer, isSelected, callback){
                        //console.log("sms refresh");
                        var that = this;
                        var listview = e(this.listTarget).data("kendoListView");
                        var selected = this.parent().selectedConversation;

                        var fetch = function(){
                            if(callback){
                                callback();
                            }
                        };
                        if(listview){
                            if(isServer){
                                listview.dataSource.read();
                                fetch();
                            }else{
                                listview.refresh();
                                fetch();
                                isSelected? listview.element.find("[data-uid='"+selected.uid+"']").addClass("k-state-selected"): null;
                            }
                        }
                    }
                };
            vm.set(n, j);
        }(window.jQuery)
    }(),
    // message setting
    function () {
        ! function(e, t) {
            var vm = appViewModel,
                preEnter = vm.get("sessionSettings.isPressEnter")? vm.get("sessionSettings.isPressEnter") : false;
                l = e.map,
                c = e.each,
                d = e.trim,
                u = e.extend,
                n = "messageSetting",
                
                j = {
                    updateHeight: function(heightAvalable){
                        var parentHeight = $(".content_column_wrapper").height();
                        var height = "calc(100% - 235px - "+heightAvalable+ "px)";
                        e(".app_conversation_content").css("height", height);
                        this.parent().scrollToEnd();
                    },
                    files: [],
                    onSelected: function(e){
                        var parent = $(e.target).closest("li");
                        var listview = $(this.conversationsListTarget).data("kendoListView");
                        listview? listview.select(parent): null;
                    },
                    onListViewSelected: function(event){
                        var selected = event.sender.select()[0];
                        var selected = selected? event.sender.dataItem($(selected)): {};
                        this.set("selectedResponse", selected);
                        
                        // select channel
                        var lastChannel = this.selectedResponse.last_channel_value ||  this.selectedResponse.channel_value || -1;
                        
                        $("#response_channel").val(lastChannel).trigger("change");
                        
                        // select assignee
                        if(this.selectedResponse.assignee){
                            var assignee = this.selectedResponse.group+ "_" + this.selectedResponse.assignee._id;
                            $("#group_assignee").val(assignee).trigger("change");
                        }else{
                            $("#group_assignee").val(this.selectedResponse.group).trigger("change");
                        }
                        this.messageSetting.status = this.selectedResponse.status.toString();
                        this.set("messageSetting.enableComment", this.selectedResponse.status != 4);
                        
                        if("1 2 3 4".indexOf(this.messageSetting.status) == -1){
                            this.messageSetting.status = this.selectedResponse.status = 1;
                            $("#ticket-status").data("kendoDropDownList").select(this.selectedResponse.status-1)
                        }
                        
                        this.messageSetting.tags = this.selectedResponse.tags?this.selectedResponse.tags.map(function(tag){
                            return tag.name;
                        }).join(","): "";
                    },
                    // files or image
                    upload: {
                        upload_type: {
                            file: ".jpg .jpeg .png .gif .doc .docx .xls .xlsx .pptx .ppt .pdf",
                            image: ".jpg .jpeg .png .gif"
                        },
                        type: "file",
                        onSelect: function(e) {
                            var that = this;
                            $.each(e.files, function () {
                                var extention = that.messageSetting.upload.upload_type[that.messageSetting.upload.type]
                                // check file extention
                                if (extention.indexOf(this.extension.toLowerCase()) === -1) {
                                    if(that.messageSetting.upload.type == "file"){
                                        $.notify($.t( "messages:common.extension_files_upload" ), 'warn');
                                    }else{
                                        $.notify(app.data.lng.extension_image_upload, 'warn');
                                    }
                                    e.preventDefault();
                                    return;
                                }
                                // check file size
                                if(this.size > MAX_FILE_SIZE){
                                     $.notify($.t( "messages:common.max_file_size_limit" ), 'warn');
                                    e.preventDefault();
                                    return;
                                }
                            });
                        },
                        onProgress: function(e){
                             //console.log("progress");
                        },
                        onRemove: function(e){
                            var file = e.files[0];
                            if(file == undefined){
                                e.preventDefault();
                                return;
                            }
                            var selected_file = this.messageSetting.files.filter(function(uploaded_file){
                               return uploaded_file.originalname == file.name;
                            })[0];

                            if(selected_file == undefined){
                                e.preventDefault();
                                return;
                            }
                            e.data = { uploaded_file_name: selected_file.name };
                        },
                        onSuccess: function(e){
                            this.messageSetting.updateHeight(e.sender.wrapper[0].clientHeight);
                            var result = e.response;
                            if (e.operation == "remove") {
                                if( !result.is_error ){
                                    var new_files = this.messageSetting.files.filter(function(uploaded_file){
                                       return uploaded_file.name != result.data.name;
                                    });
                                    this.set("messageSetting.files", new_files);
                                }
                            }
                            else if (e.operation == "upload") {
                                if( !result.is_error ){
                                    this.messageSetting.files.push(result.data);
                                    $.notify($.t( "messages:common.upload_note_message" ), "warn");
                                } else {
                                    $.notify($.t( "messages:common.upload_failed_title" ), "error");
                                }
                            }
                        },
                        onComplete: function(e) {
                            //console.log("complete",e);
                        }
                    },
                    // message
                    message: "",
                    isStartSend: false,
                    isPressEnter: preEnter,
                    pressEnter:function(e){
                        if( (e.type != "keypress" || kendo.keys.ENTER == e.keyCode) && this.messageSetting.isPressEnter){
                            $("#hidden_control").focus();
                            e.preventDefault();
                            this.messageSetting.message = $(e.target).val();
                            
                            !this.messageSetting.isStartSend? this.messageSetting.sendMessage(): null;
                        }
                    },
                    addFile: function(e){
                        this.messageSetting.upload.type  = "file";
                        this.messageSetting.showDialog();
                    },
                    addImage: function(e){
                        this.messageSetting.upload.type  = "image"; 
                        this.messageSetting.showDialog();
                    },
                    showDialog: function(){
                        var accept = "*";
                        if(this.upload.type == "image"){
                            accept = "image/*";
                        }
                        e(".upload_file input[type='file']").attr("accept", accept).click();
                    },
                    pressEnterChange: function(e){
                        var that = this;
                    },
                    // status
                    status: "1",
                    enableComment: true,
                    statusDatasource: [],
                    //fb user
                    fbUser: null,
                    displayFbUser: "none",
                    fbUserDatasource: new kendo.data.DataSource({ 
                        data: []
                    }),
                    // send message
                    sendMessage: function(){
                        var msgSetting =  this.messageSetting || this;
                        msgSetting.isStartSend = true;
                        
                        var group_assignee = $("#group_assignee").select2("data");
                        group_assignee = group_assignee? group_assignee[0]: null;
                        group_assignee = group_assignee? group_assignee.id : null;
                        group_assignee = group_assignee? group_assignee.split("_") : null;

                        if(msgSetting.isStartSend && !msgSetting.parent().selectedResponse || !msgSetting.parent().selectedConversation){
                            return;
                        }
                        if(msgSetting.parent().selectedResponse.status == "3" && !group_assignee){
                            $.notify(lng.mes_solved, "warning");
                            return ;
                        }
                        var that = this;
                        var id =  msgSetting.parent().selectedResponse.ticket_id;
                        if(msgSetting.files.length > 0 && !msgSetting.message){
                            $(".input-control").notify(lng.comment_required).focus();
                            return ;
                        }
                        var channel_response = $("#response_channel").select2("data");
                        
                        channel_response = channel_response ?  channel_response[0]: {};
                        channel_response = {
                            id: channel_response.id,
                            type: channel_response.type
                        };

                        
                        var data = {
                            "ticket" : {
                                id: id,
                                tags: msgSetting.tags,
                                status: msgSetting.parent().selectedResponse.status,
                                files: msgSetting.files.toJSON? msgSetting.files.toJSON() :  msgSetting.files,
                                response_type: channel_response
                            } 
                        };
                        if(group_assignee){
                            data.ticket.group_id = group_assignee[0];
                            if(group_assignee[1]){
                                data.ticket.assignee_id = group_assignee[1];
                            }
                        }
                        if(msgSetting.message && msgSetting.message.trim() != ""){
                            data.ticket.comment = msgSetting.message;
                            if(data.ticket.response_type.type == -1){
                                data.ticket.is_public = false;
                            }
                            else{
                                if(data.ticket.response_type.type == "Facebook" && msgSetting.fbUser){
                                    data.ticket.fb_user_id = msgSetting.fbUser;
                                }
                            }
                        }
                        function complete(){
                            var clear = true;
                            if(log_info.role <= 1){
                                clear = false;
                            }else if(data.ticket.assignee_id){
                                 data.ticket.assignee_id == current_user_id? clear = false: null;
                            }else if(data.ticket.group_id ){
                                var groups = log_info.group.map(function(group){
                                    return group.group_id;
                                });
                                if(group.inArray(data.ticket.group_id)){
                                    clear = false;
                                }
                            }

                            clear? msgSetting.parent().resetSelectedConversations(): msgSetting.parent().conversationsRefresh() ;
                        }
                        kendo.ui.progress($(".chat"), true);
                        $.ajax({
                            url: "/api/ticket/modify/"+ id,
                            dataType: "json",
                            method: "PUT",
                            data: data,
                            success: function(result){
                                console.log("save message result");
                                msgSetting.message = "";
                                
                                var childs = e(".upload_file").find("ul.k-upload-files").children();
                                $.each(childs, function(item){
                                    e(this).remove();
                                });
                                msgSetting.fbUser = "";
                                msgSetting.files = [];
                                //e(".upload_file input[type='file']").getKendoUpload().files = [];
                                $(".input-control").val("");
                                complete();
                            },
                            error: function(){
                                $.notify("Cant not replay response", "error");
                            },
                            complete: function(){
                                msgSetting.isStartSend = false;
                                kendo.ui.progress($(".chat"), false);
                                $(".input-control").focus();
                            }
                        });
                    },
                    
                    // taggings
                    isVisibleEditTags: false,
                    showEditTags: function(event){
                        var editWindown = e("#editTags").data("kendoWindow");
                        editWindown? editWindown.center().open(): null;
                        
                        $('#tags').importTags(this.messageSetting.tags);
                        this.messageSetting.isVisibleEditTags = true;
                    },
                    editTags: function(event){
                        var tags = this.messageSetting.tags = $('#tags').val();
                        var that = this;
                        var msgSetting =  this.messageSetting || this;
                        var id =  msgSetting.parent().selectedResponse.ticket_id;
                        
                        var data = {
                            "ticket" : {
                                id: id,
                                tags: tags
                            } 
                        };
                        
                        kendo.ui.progress($("body"), true);
                        $.ajax({
                            url: "/api/ticket/modify/"+ id,
                            dataType: "json",
                            method: "PUT",
                            data: data,
                            success: function(result){
                                console.log("save tags result");
                                msgSetting.parent().conversationsRefresh();
                            },
                            error: function(){
                                $.notify("Cant not edit tags response", "error");
                            },
                            complete: function(){
                                kendo.ui.progress($("body"), false);
                                var editWindown = e("#editTags").data("kendoWindow");
                                editWindown? editWindown.close(): null;
                            }
                        });
                    },
                    closeEditTags: function(event){
                        // close edit window
                        var editWindown = e("#editTags").data("kendoWindow");
                        editWindown? editWindown.close(): null;
                    },
                    tags: "",
                };
            vm.set(n, j);
        }(window.jQuery)
    }();
}())

function ticketChange(ticket){
    appViewModel.ticketChange(ticket);
}

function postData(url, method, data, callback, options) {
    options = options || {};
    if (options.loading_effect == true) {
        kendo.ui.progress($("body"), true);
    }
    $.ajax({
        type: method,
        url: url,
        cache: false,
        dataType : "json",
        data: data,
        success: callback,
        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
            alert(textStatus);
        },
        complete : function() {
            if (options.loading_effect == true) {
                $(".bg_black").hide();
                kendo.ui.progress($("body"), false);
            }
        },
        async: (options.async || true),
    });
}
function initApp(){
    // close window
    $(window).bind('beforeunload', function(event) {
        appViewModel.updateAppSettings();
    });
    // tootip
    $(document).tooltip({
        selector: '[data-toggle="tooltip"]',
        container: '#'+app_name,
        html:true,
    });
    $("body").tooltip({
        selector: '.addon-item',
        container: 'body',
        html:true,
    });
    $('body').popover({
        selector: '[data-popover="response"]',
        template: '<div class="popover popover-response" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>',
        container: '#'+ app_name,
        trigger: "click",
        html:true,
    });
    
    $('.filter-menu').find('li').click(function (e) {
        if(!$(e.target).hasClass("btn-dropdown") && !$(e.target).hasClass("filter-control") 
           && !$(e.target).hasClass("k-i-calendar") && $(e.target).parents(".custom-date").length === 0){
            $(this).parents(".dropdown").removeClass("open").find(".dropdown-menu .dropdown").removeClass("open");
        }
    });
    
    $('.dropdown-menu').find('.btn-dropdown').click(function (e) {
        if(!$(this).parent().hasClass("open")){
            $(".filter-dropdown").find(".dropdown-menu .dropdown").removeClass("open");
        }
        
        $(this).parent().toggleClass("open");
        e.stopPropagation();
    });
    
    $(document).click(function (e) {
        if (!$(e.target).hasClass("filter-btn") 
            && $(e.target).parents(".filter-dropdown").length === 0 && $(e.target).parents("k-calendar-container").length === 0 ) 
        {
            $(".filter-dropdown").removeClass("open").find(".dropdown-menu .dropdown").removeClass("open");
        }
    });
    $( '#tags' ).tagsInput({
        'height': '100px',
        'width': 'calc(100% - 10px)',
        'interactive': true,
        'onRemoveTag': onTagsChanged,
        'onAddTag': onTagsChanged,
        'defaultText': $.t("ticket.add_tag"),
        'removeWithBackspace' : true,
//        'delimiter': [',']
    });
    function onTagsChanged(tag){
        var tags = $('#tags').val().trim().replace(/ +/g, ',');
        if (tags) {
            tags = $.unique(tags.split(',')).sort();
            $('#tags').importTags(tags.join(","));
        }
    }
    appViewModel.channelTabControl.select(0);
    appViewModel.refreshTicketField();
    $("#from_date").data("kendoDatePicker").max(appViewModel.filterSettings.toDate);
    $("#to_date").data("kendoDatePicker").min(appViewModel.filterSettings.fromDate);
    iziHelpTicket.addListener("onChange", ticketChange);
}

appViewModel.init();
$("#"+app.data.name+" .body_menu2").show();//show content
kendo.bind($("#"+app_name), appViewModel);
//appViewModel.getAppSettings();
initApp();
