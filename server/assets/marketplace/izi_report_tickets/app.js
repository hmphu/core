/*jshint quotmark: true*/
$(document).ready(function() {
    var _t = app.data.lng;

    var data_report = null;
    var is_custom = false;
    
    function _LocalData() {
        var _local_data = {};

        this.val = function(name, value) {
            if (value !== undefined) {
                _local_data[name] = value;
            }
            return _local_data[name];
        };
    };
    
    window.localData = new _LocalData();
    
    $("#series").kendoDropDownList({});
    $.ajax({
        type: 'GET',
        url: baseurl + "/rest/report/get/list?is_app=1" ,
        success: function(result) {
            if(!result.is_error){
                data_report = result.data;
                $("#reports").kendoDropDownList({
                    dataTextField: "title",
                    dataValueField: "_id",
                    optionLabel: "-",
                    dataSource: result.data,
                    select : function(e) {
                        var item = this.dataItem(e.item.index());

                        $("#series").kendoDropDownList({
                            dataTextField: "legend",
                            dataValueField: "_id",
                            optionLabel: "-",
                            dataSource: item.data_series,
                        });
                    }
                });
            }else{
                alert("Error get data report.");
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus);
        }
    });

    function placeholder(element) {
        return $("<li class='list-item' id='placeholder'>Drop Here!</li>");
    };
    
    //Custom Report
    localData.val("filter-date_type", $(".fitler-type.value").kendoDropDownList({
            dataSource: [{
                text : app.data.lng.add_time,
                value : "add_time"
            }, {
                text : app.data.lng.updated_time,
                value : "upd_time"
            }, {
                text : app.data.lng.solved_date,
                value : "solve_date"
            }],
            dataTextField: "text",
            dataValueField: "value"
    }).data("kendoDropDownList"));

    var time_arr_from = [];
    for(var i = 0; i <= 23; i++){
        time_arr_from[time_arr_from.length] = {
            text : i + ":00:00",
            value : i
        };
    }
    
    var time_arr_to = [];
    for(var i = 0; i <= 23; i++){
        time_arr_to[time_arr_to.length] = {
            text : i + ":59:59",
            value : i
        };
    }
    
    localData.val("time_from_value_custom", $("#time_from_value_custom").kendoDropDownList({
            dataSource: time_arr_from,
            dataTextField: "text",
            dataValueField: "value",
            select: function(e) {
                var text = e.item.text();
                if(text != '-'){
                    var val = parseInt(text.split(':')[0]);

                    var arr_tmp = [];
                    for(var i = val ; i < 24; i++){
                        arr_tmp[arr_tmp.length] = {
                            text : i + ":59:59",
                            value : i
                        };
                    }
                    var dataSource = new kendo.data.DataSource({
                        data : arr_tmp
                    });
                    localData.val("time_to_value_custom").setDataSource(dataSource);
                }
            }
    }).data("kendoDropDownList"));

    
    localData.val("time_to_value_custom", $("#time_to_value_custom").kendoDropDownList({
            dataSource: time_arr_to,
            dataTextField: "text",
            dataValueField: "value",
            select: function(e) {
            }
    }).data("kendoDropDownList"));

    $("#time_to_value_custom").data("kendoDropDownList").value(23);
    $("#time_to_value_custom").data("kendoDropDownList").trigger("change");
    
    localData.val("time_from_value", $("#time_from_value").kendoDropDownList({
            dataSource: time_arr_from,
            dataTextField: "text",
            dataValueField: "value",
            select: function(e) {
                var text = e.item.text();
                if(text != '-'){
                    var val = parseInt(text.split(':')[0]);

                    var arr_tmp = [];
                    for(var i = val ; i < 24; i++){
                        arr_tmp[arr_tmp.length] = {
                            text : i + ":59:59",
                            value : i
                        };
                    }
                    var dataSource = new kendo.data.DataSource({
                        data : arr_tmp
                    });
                    localData.val("time_to_value").setDataSource(dataSource);
                }
            }
    }).data("kendoDropDownList"));
 
    localData.val("time_to_value", $("#time_to_value").kendoDropDownList({
            dataSource: time_arr_to,
            dataTextField: "text",
            dataValueField: "value",
            select: function(e) {
            }
    }).data("kendoDropDownList"));

    $("#time_to_value").data("kendoDropDownList").value(23);
    $("#time_to_value").data("kendoDropDownList").trigger("change");
    
     function startChange() {
        var startDate = start.value(),
        endDate = end.value();
        if (startDate) {
            startDate = new Date(startDate);
            startDate.setDate(startDate.getDate());
            end.min(startDate);
        } else if (endDate) {
            start.max(new Date(endDate));
        } else {
            endDate = new Date();
            start.max(endDate);
            end.min(endDate);
        }
    }
    
    function endChange() {
        
        var endDate = end.value(),
        
        startDate = start.value();
        
        if (endDate) {
            endDate = new Date(endDate);
            endDate.setDate(endDate.getDate());
            start.max(endDate);
        } else if (startDate) {
 	      end.min(new Date(startDate));
        } else {
            endDate = new Date();
            start.max(endDate);
            end.min(endDate);
        }
    }
    
    var start = $("#rp_from_date").kendoDatePicker({
        format : date_format_string,
        change: startChange
    }).data("kendoDatePicker");
    
    var end = $("#rp_to_date").kendoDatePicker({
        format : date_format_string,
        change: endChange
    }).data("kendoDatePicker");
    
    start.max(end.value());
    end.min(start.value());
    
    
    $.ajax({
        type: 'GET',
        url: baseurl + "/api/group-assignee" ,
        success: function(result) {
            if(!result.is_error){
                $(".assignee.value").select2({
                    placeholder: "-",
                    data: result.data,
                    allowClear: true,
                    escapeMarkup: function (m) {
                        return m;
                    }
                });
            }else{
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus);
        }
    });

        localData.val("filter-status", $(".stat.value").kendoDropDownList({
            optionLabel: "-",
            dataSource: [],
            dataTextField: "text",
            dataValueField: "value"
        }).data("kendoDropDownList"));

        localData.val("filter-agent", $(".agent.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "text",
            dataValueField: "value",
            optionLabel: "-"
        }).data("kendoDropDownList"));

        localData.val("filter-group", $(".group.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "name",
            dataValueField: "id",
            optionLabel: "-",
            change : function() {
                var agent_source = localData.val("agent-source");
                var group_id = this.value();

                var assignee = [];

                if (group_id != "no-group") {
                    assignee = [{
                        value : "no-agent",
                        text : _t._no_assignee_,
                        groups : []
                    }];

                    if (group_id) {
                        assignee = assignee.concat(agent_source.filter(function(item) {
                            return item.groups.indexOf(group_id) != -1;
                        }));
                    } else {
                        assignee = assignee.concat(agent_source);
                    }
                }

                var dataSource = new kendo.data.DataSource({
                    data : assignee
                });
                localData.val("filter-agent").setDataSource(dataSource);

            }
        }).data("kendoDropDownList"));

        localData.val("filter-organization", $(".organization.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "text",
            dataValueField: "value",
            optionLabel: "-",
        }).data("kendoDropDownList"));

        function initRequesterFilter(selected) {
            var data = [{
                id : "",
                text : ""
            }];
            if (selected) {
                data.push(selected);
            }
            $(".requester.value").select2({
                data : data,
                placeholder: "-",
                allowClear: true,
                width: "100%",
                multiple: false,
                ajax: {
                    url: "/rest/requesters/query",
                    dataType: 'json',
                    method : "post",
                    delay: 250,
                    data: function (params) {
                        return {
                            display_name : params.term,
                            suspended : false,
                            select : {
                                display_name : true,
                            },
                            organization : localData.val("filter-organization").value(),
                            skip : 0,
                            limit : 50
                        };
                    },
                    processResults: function (result, page) {
                        if (!result.is_error) {
                            return {
                                results : result.data.map(function(item) {
                                    return {
                                        id : item.id,
                                        text : item.display_name
                                    };
                                }),
                                text : "text"
                            };
                        }
                    },
                    cache: true
                }
            }).on("change", function(e) {
                var val = $(this).select2("val");
                if (!val) {
                    loadTicket(false);
                }
            });
            if (selected) {
                $(".requester.value").select2("val", selected.id, true);
            }
        };
        initRequesterFilter();
        localData.val("filter-requester", $(".requester.value"));

        localData.val("filtered-organization", $(".organization-filter-field").kendoListView({
            dataSource : [],
            template:  $("#" + app.data.name + "_tpl_filtered_organization").html()
        }).data("kendoListView"));

        localData.val("filtered-requester", $(".requester-filter-field").kendoListView({
            dataSource : [],
            template:  $("#" + app.data.name + "_tpl_filtered_requester").html()
        }).data("kendoListView"));

        localData.val("table-custom-field", $(".table-custom-setting").kendoListView({
            template: $("#" + app.data.name + "_tpl_custom_setting_row").html()
        }).data("kendoListView"));

        localData.val("table-ticket", $(".table-ticket").kendoListView({
            dataSource: [],
            template:  $("#" + app.data.name + "_tpl_view_ticket_row").html()
        }).data("kendoListView"));

        //load ajax data
        postData("/api/general/enums", "POST", {
            types : ["TicketStatus"]
        }, function(result) {
            if (result.is_error) {
                for (var i in result.errors) {
                    var errors = result.errors[i].map(function(err) {
                        return _m[err];
                    });
                    $.notify(errors.join(","), "error");
                }
            } else {
                var filterDataSource = new kendo.data.DataSource({
                    data : result.data.TicketStatus.filter(function(item) {
                        return item.value < 4;
                    })
                });

                localData.val("filter-status").setDataSource(filterDataSource);

            }
        });

        postData("/rest/users", "get", null, function(result) {
            if (result.is_error) {
                for (var i in result.errors) {
                    var errors = result.errors[i].map(function(err) {
                        return _m[err];
                    });
                    $.notify(errors.join(","), "error");
                }
            } else {
                var data = [null];
                var cur_user;
                result.data.forEach(function(item) {
                    var text = item.display_name;
                    var value = item.id;
                    if (item.id == current_user_id) {
                        cur_user = {
                            text : _t._me_,
                            value : value,
                            groups : item.groups
                        };
                    } else {
                        data.push({
                            text : text,
                            value : value,
                            groups : item.groups
                        });
                    }
                });
                data[0] = cur_user;
                var dataSource = new kendo.data.DataSource({
                    data : [{
                        value : "no-agent",
                        text : _t._no_assignee_,
                        groups : []
                    }].concat(data)
                });

                localData.val("filter-agent").setDataSource(dataSource);

                localData.val("agent-source", data);
            }
        });

        postData("/rest/groups", "get", null, function(result) {
            if (result.is_error) {
                for (var i in result.errors) {
                    var errors = result.errors[i].map(function(err) {
                        return _m[err];
                    });
                    $.notify(errors.join(","), "error");
                }
            } else {
                var data = result.data;

                localData.val("filter-group").setDataSource(new kendo.data.DataSource({
                    data : [{
                        id : "no-group",
                        name : _t._no_group_
                    }].concat(data)
                }));
            }
        });

        postData("/rest/organizations/owner", "get", null, function(result) {
            if (result.is_error) {
            } else {
                var dataSource = new kendo.data.DataSource({
                    data : [{
                        text : _t._no_organization_,
                        value : "no-organization"
                    }].concat(result.data.map(function(item, index) {
                        return {
                            value : item.id,
                            text : item.name
                        };
                    }))
                });
                localData.val("filter-organization").setDataSource(dataSource);
            }
        });
    //End custom report

    $('input[type=radio][name=custom_report]').change(function() {
        if (this.value == 'report_with_id') {
            is_custom = false;
            $(".report_by_id").show();
            $(".report_custom").hide();
        }
        else if (this.value == 'custom') {
            is_custom = true;
            $(".report_by_id").hide();
            $(".report_custom").show();
        }
    });
    
    $(".template_pdf").hide();
    $("#export_type").kendoDropDownList({
        //dataSource: ["PDF", "Excel","CSV"],
        dataSource: ["Excel","CSV"],
        index: 0,
        select: function(e) {
            var text = e.item.text();
            if(text != "PDF"){
                $(".template_pdf").hide();
            }else{
                $(".template_pdf").show();
            }
        }
    });

    var setDataFileType = function(text){
        if(text == "single"){
            $("#template").kendoDropDownList({
                    dataSource: template_source.single,
                    index: 0,
                    select: function(e) {
                    }
            });
        }else{
             $("#template").kendoDropDownList({
                    dataSource: template_source.multi,
                    index: 0,
                    select: function(e) {
                    }
            });
        }
    };

    $("#export_file_type").kendoDropDownList({
        dataSource: [{name: "Single", value : "single"} ,{name: "Multi", value : "multi"}],
        dataTextField: "name",
        dataValueField: "value",
        index: 0,
        select: function(e) {
            var item = this.dataItem(e.item.index());
           setDataFileType(item.value);
        }
    });


    var template_source = {};
    var getTemplate = function(){
        $.ajax({
            type: 'GET',
            url: baseurl + "/rest/apps/report-template",
            success: function(result) {
                if(!result.is_error){
                    template_source = result.data;
                    setDataFileType($("#export_file_type").val());
                }else{
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                console.log(textStatus);
            }
        });
    };

    var all_colum = [];
    var setColumnView = function(){
        $.ajax({
            type: 'GET',
            url: baseurl + "/api/general/list/app_include_columns" ,
            success: function(result) {
               if(!result.is_error){
                   var html = '',html1 = '';
                   for(var i =0; i < result.data.columns_not_include.length; i++){
                       html += '<li class="list-item" id="'+ result.data.columns_not_include[i].value +'">' + result.data.columns_not_include[i].text + '</li>';
                       all_colum [all_colum .length] = result.data.columns_not_include[i];
                   }
                   $('#not_include_columns').append(html);
                   html ='';
                   for(var i =0; i < result.data.columns_include.length; i++){
                       html += '<li class="list-item" id="' + result.data.columns_include[i].value + '" style="">' + result.data.columns_include[i].text + '<input class="add_fields" type="hidden" name="formats" value="' + result.data.columns_include[i].value + '"></li>';

                        html1 += '<input id="' + result.data.columns_include[i].value + '_value" class=" input_title title_fields" type="text" name="title" placeholder="' + result.data.columns_include[i].text + '" />';
                       
                       all_colum [all_colum .length] = result.data.columns_include[i];
                   }

                   $("#title_columns").html(html1);
                   $('#include_columns').append(html);

               }else{
               }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                console.log(textStatus);
            }
        });

        $("#not_include_columns").kendoSortable({
            connectWith: "#include_columns",
            placeholder: placeholder,
            cursor: "url('/img/grab.cur'), default",
            end: function(e) {
                 var item=$(e.item);
                 var id=item[0].id;
                 var isClass=$("#"+id.replace(".", "\\.")).find("input");
                 if(isClass.length>0){
                     isClass.remove();
                 }
                //prevent first item to be placed at the end of the list
                if(e.newIndex == 2 && e.oldIndex == 0) {
                    e.preventDefault();
                }
            }
        });

        $("#include_columns").kendoSortable({
            connectWith: "#not_include_columns",
            placeholder: placeholder,
            cursor: "url('/img/grab.cur'), default",
            end: function(e) {
                 var ids=document.getElementsByName('formats');
                 if(ids.length<20 || e.action == 'remove'){
                     var item=$(e.item);
                     var id=item[0].id;
                     if(e.action == 'receive'){
                        $("#"+id.replace(".", "\\.")).append('<input class="add_fields" type="hidden" name="formats" value="'+id+'"/>' );
                     }

                     var html = "";
                     var arr_title = [];
                     setTimeout(function(){
                         //Save all value of title
                         $(".title_fields").each(function() {
                             arr_title[arr_title.length] = {
                                 id : $(this).attr('id'),
                                 value : $(this).val()
                             };
                         });

                         //Add new title 
                         $(".add_fields").each(function() {
                            var field_value = "";
                            for(var i = 0; i < arr_title.length; i++){
                                if(arr_title[i].id == $(this).val() + '_value'){
                                    field_value = arr_title[i].value;
                                }
                            }

                            var title_tmp = "";
                            for(var j =0; j < all_colum.length; j++){
                                if(all_colum[j].value == $(this).val()){
                                    title_tmp = all_colum[j].text;
                                }
                            }
                            html += '<input id="' + $(this).val() + '_value" class="input_title title_fields" type="text" name="title" placeholder="' + title_tmp + '" value="' + (field_value != '' ? field_value : '') + '"/>';
                         }); 
                         $("#title_columns").html(html);
                     }, 300)

                    //prevent first item to be placed at the end of the list
                    if(e.newIndex == 2 && e.oldIndex == 0) {
                        e.preventDefault();
                    }
                 }else{
                     e.preventDefault();
                 }
            }
        });
    };

    //Contructor app
    setColumnView();
    getTemplate();

    $('#btn_preview').click(function() {
            var data_post = {
                is_prev : true,
                title : $('#txt_title').val(),
                footer_txt : $('#txt_footer').val(),
                footer_align : $('#footer-align').val(),
                page_size : $('#page-size').val(),
                template : $("#template").val(),
                locale : template_source.locale,
                template_type : $("#export_file_type").val()
        };
        kendo.ui.progress($(".main-content"), true);
        $.ajax({
            type: 'GET',
            url: baseurl + "/rest/apps/prev_app_report" + "?q=" + encodeURIComponent(JSON.stringify(data_post)),
            success: function(result) {
                if(!result.data.err){
                    kendo.ui.progress($(".main-content"), false);
                    var link = document.createElement("a");
                    document.body.appendChild(link);
                    link.href = result.data.link;
                    link.target = "_blank";
                    link.click();
                    document.body.removeChild(link);
                }else{
                    alert("Error report.");
                    kendo.ui.progress($(".main-content"), false);
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                kendo.ui.progress($(".main-content"), false);
                console.log(textStatus);
            }
        });
    });

    $('#btn_export').click(function() {
        if(($("#time_from_value").val() == '-' && parseInt($("#time_to_value").val()) >= 0) ||
           ($("#time_to_value").val() == '-' && parseInt($("#time_from_value").val()) >= 0) ||
           parseInt($("#time_from_value").val()) > parseInt($("#time_to_value").val())){
            alert( app.data.lng.time_alert);
            return;
        }
        var data_post = {
                title : $('#txt_title').val(),
                footer_txt : $('#txt_footer').val(),
                footer_align : $('#footer-align').val(),
                page_size : $('#page-size').val(),
                file_type : $('#export_type').val(),
                template_type : $("#export_file_type").val(),
                template : $("#template").val(),
                locale : template_source.locale,
                orientation : $("#orientation").val()
        };

        if(is_custom){
            if($('#rp_from_date').val() === '' || $('#rp_to_date').val() === ''){
                alert( app.data.lng.alert_date);
                return;
            }
            data_post.is_custom = 1;
            data_post.from_date = $('#rp_from_date').val();
            data_post.to_date = $('#rp_to_date').val();
            
            data_post.date_type = localData.val("filter-date_type").value();
            data_post.status = localData.val("filter-status").value();
            data_post.requester = localData.val("filter-requester").select2("val");
            data_post.organization = localData.val("filter-organization").value();
            data_post.group = localData.val("filter-group").value();
            data_post.assignee = localData.val("filter-agent").value();
            data_post.date_format = server_date_format_string;
            
            data_post.time_from_value = localData.val("time_from_value_custom").value();
            data_post.time_to_value = localData.val("time_to_value_custom").value();
            
        }else{
            if($('#reports').val() === '' || $('#series').val() === ''){
                alert( app.data.lng.alert);
                return;
            }
            data_post.is_custom = 0;
            data_post.time_from_value = localData.val("time_from_value").value();
            data_post.time_to_value = localData.val("time_to_value").value();
            data_post.series_id = $('#series').val();
            data_post.report_id = $('#reports').val();
        }
        
        var arr_columns = [];
        
        $(".title_fields").each(function() {
            var s1 = [], s2 = [];
            s1 = $(this).attr('id').split('_value');
            s2 = s1[0].split('rqt_');

            arr_columns[arr_columns.length] = {
                is_requester_field : s2.length > 1 ? "true" : "false",
                id : s2.length > 1 ? s2[1] : s2[0],
                title: $(this).val() || $(this).attr("placeholder")
            };
            for(var j =0; j < all_colum.length; j++){
                if(all_colum[j].value == arr_columns[arr_columns.length - 1].id && all_colum[j].type){
                    arr_columns[arr_columns.length - 1].type = all_colum[j].type;
                }
            }
        });

        data_post.columns = arr_columns;
        kendo.ui.progress($(".main-content"), true);
        $.ajax({
            type: 'POST',
            cache: false,
            dataType : "json",
            timeout : 0,
            data: data_post,
            url: baseurl + "/rest/apps/get_app_report",
            success: function(result) {
                if(!result.data.err){
                    kendo.ui.progress($(".main-content"), false);
                    var link = document.createElement("a");
                    document.body.appendChild(link);
                    link.href = result.data.link;
                    link.target = "_blank";
                    link.click();
                    document.body.removeChild(link);
                }else{
                    alert("Error report.");
                    kendo.ui.progress($(".main-content"), false);
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                kendo.ui.progress($(".main-content"), false);
                console.log(textStatus);
            }
        });
    });
    
    function postData(url, method, data, callback) {
        kendo.ui.progress($(".main-content"), true);
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
                kendo.ui.progress($(".main-content"), false);
            }
        });
    };
    
});   
