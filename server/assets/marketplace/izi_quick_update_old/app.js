$(document).ready(function() {
    $("#"+app.data.name).css({
        height : "calc(100% - 50px)",
        "overflow-y" : "auto"
    });
    window.translate = app.data.lng.translate;

    var _t = app.data.lng.translate,
        _m = app.data.lng.message;

    function _LocalData() {
        var _local_data = {};

        this.val = function(name, value) {
            if (value !== undefined) {
                _local_data[name] = value;
            }
            return _local_data[name];
        };
    };

    $("#tab_account").kendoTabStrip({
        animation:  {
            open: {
                effects: "fadeIn"
            }
        }
    });

    $(".quick_update_area").show();

    //view
    (function() {

        window.localData = new _LocalData();

        localData.val("filter-date_type", $("#view-tab .fitler-type.value").kendoDropDownList({
            dataSource: [{
                text : _t.add_time,
                value : "add_time"
            }, {
                text : _t.updated_time,
                value : "upd_time"
            }, {
                text : _t.solved_date,
                value : "solved_date"
            }],
            dataTextField: "text",
            dataValueField: "value"
        }).data("kendoDropDownList"));

        localData.val("filter-from_date", $("#view-tab .from-date.value").kendoDatePicker({
            format : date_format_string,
            value : moment().add(-1, "month").toDate(),
            change : function(e) {
                var cur_data = this.value();
                if (cur_data !== null) {
                    localData.val("filter-to_date").min(cur_data);
                    localData.val("filter-from_date-val", moment(cur_data).format("MM-DD-YYYY"));
                    var max_data = localData.val("filter-to_date").value();
                    if (max_data !== null && max_data < cur_data) {
                        localData.val("filter-to_date").value(cur_data);
                    }
                } else {
                    localData.val("filter-to_date").min(new Date(1900, 0, 1));
                    this.value("");
                    localData.val("filter-from_date-val", null);
                }
            }
        }).data("kendoDatePicker"));

        localData.val("filter-to_date", $("#view-tab .to-date.value").kendoDatePicker({
            format : date_format_string,
            value : new Date(),
            change : function(e) {
                var cur_data = this.value();
                if (cur_data !== null) {
                    localData.val("filter-from_date").max(cur_data);
                    localData.val("filter-to_date-val", moment(cur_data).format("MM-DD-YYYY"));
                    var min_data = localData.val("filter-from_date").value();
                    if (min_data !== null && min_data > cur_data) {
                        localData.val("filter-from_date").value(cur_data);
                    }
                } else {
                    localData.val("filter-from_date").max(new Date(2099, 11, 31));
                    this.value("");
                    localData.val("filter-to_date-value", null);
                }
            }
        }).data("kendoDatePicker"));

        localData.val("filter-status", $("#view-tab .filter .stat.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "text",
            dataValueField: "value"
        }).data("kendoDropDownList"));

        localData.val("update-status", $("#view-tab .update .stat.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "text",
            dataValueField: "value"
        }).data("kendoDropDownList"));

        localData.val("filter-agent", $("#view-tab .filter .agent.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "text",
            dataValueField: "value",
            optionLabel: "-"
        }).data("kendoDropDownList"));

        localData.val("filter-group", $("#view-tab .filter .group.value").kendoDropDownList({
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

        localData.val("filter-organization", $("#view-tab .filter .organization.value").kendoDropDownList({
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
            $("#view-tab .filter .requester.value").select2({
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
                $("#view-tab .filter .requester.value").select2("val", selected.id, true);
            }
        };
        initRequesterFilter();
        localData.val("filter-requester", $("#view-tab .filter .requester.value"));

        localData.val("filtered-organization", $("#view-tab .filter .organization-filter-field").kendoListView({
            dataSource : [],
            template:  $("#" + app.data.name + "_tpl_filtered_organization").html()
        }).data("kendoListView"));

        localData.val("filtered-requester", $("#view-tab .filter .requester-filter-field").kendoListView({
            dataSource : [],
            template:  $("#" + app.data.name + "_tpl_filtered_requester").html()
        }).data("kendoListView"));

        //update
        localData.val("update-group", $("#view-tab .update .group.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "name",
            dataValueField: "id",
            optionLabel: "-",
            change : function() {
                var agent_source = localData.val("agent-source");
                var group_id = this.value();

                var dataSource = new kendo.data.DataSource({
                    data : agent_source.filter(function(item) {
                        return item.groups.indexOf(group_id) != -1;
                    })
                });
                localData.val("update-assignee").setDataSource(dataSource);

            }
        }).data("kendoDropDownList"));

        localData.val("update-assignee", $("#view-tab .update .assignee.value").kendoDropDownList({
            dataSource: [],
            dataTextField: "text",
            dataValueField: "value",
            optionLabel: "-"
        }).data("kendoDropDownList"));

        localData.val("table-custom-field", $("#view-tab .update .table-custom-setting").kendoListView({
            template: $("#" + app.data.name + "_tpl_custom_setting_row").html()
        }).data("kendoListView"));

        localData.val("table-ticket", $("#view-tab .select .table-ticket").kendoListView({
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

                var updateDataSource = new kendo.data.DataSource({
                    data : result.data.TicketStatus.filter(function(item) {
                        return item.value > 0 && item.value < 4;
                    })
                });

                localData.val("filter-status").setDataSource(filterDataSource);
                localData.val("update-status").setDataSource(updateDataSource);

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

                localData.val("update-group").setDataSource(new kendo.data.DataSource({
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

        function loadCs() {
            if (!localData.val("filter-group").value()) {
                $("#view-tab .update .table-cs-container").hide(500);
            } else {
                $("#view-tab .update .table-cs-container").show(400);
            }
            postData("/rest/app/query/custom-settings/group", "post", {
                group: localData.val("filter-group").value()
            }, function(result) {

                if (result.is_error) {
                    for (var i in result.errors) {
                        var errors = result.errors[i].map(function(err) {
                            return _m[err];
                        });
                        $.notify(errors.join(","), "error");
                    }
                } else {
                    var master_type = result.data.CustomFieldType;
                    var data = result.data.custom_settings;
                    localData.val("update-cs", data);

                    var dataSource = new kendo.data.DataSource({
                        data : data.map(function(item) {
                            var type = "text";
                            if (item.type == master_type.Checkbox) {
                                type = "checkbox";
                            } else if (item.type == master_type.Text_area) {
                                type = "textarea";
                            }
                            return {
                                name : item.name,
                                field_key : item.field_key,
                                type : type
                            };
                        })
                    });
                    localData.val("table-custom-field").setDataSource(dataSource);

                    data.forEach(function(item) {
                        var selector = $("#view-tab .table-custom-setting .cs-" + item.field_key);
                        if (item.type == master_type.Drop_down) {
                            localData.val("cs-" + item.field_key, selector.kendoDropDownList({
                                dataSource: item.default_value,
                                dataTextField: "key",
                                dataValueField: "value",
                                optionLabel : "-"
                            }).data("kendoDropDownList"));
                            localData.val("cs-" + item.field_key + "-type", "dropdown");
                        } else if (item.type == master_type.Date) {
                            localData.val("cs-" + item.field_key, selector.kendoDatePicker({
                                format : date_format_string,
                            }).data("kendoDatePicker"));
                            localData.val("cs-" + item.field_key + "-type", "date");
                        } else if (item.type == master_type.Checkbox) {
                            localData.val("cs-" + item.field_key,  selector);
                            localData.val("cs-" + item.field_key + "-type", "checkbox");
                        } else if (item.type == master_type.Numeric) {
                            localData.val("cs-" + item.field_key,  selector.kendoNumericTextBox({
                                format : "n0",
                                min : 0
                            }).data("kendoNumericTextBox"));
                            localData.val("cs-" + item.field_key + "-type", "numeric");
                        }  else if (item.type == master_type.Decimal) {
                            localData.val("cs-" + item.field_key,  selector.kendoNumericTextBox({
                                min : 0
                            }).data("kendoNumericTextBox"));
                            localData.val("cs-" + item.field_key + "-type", "decimal");
                        } else if (item.type == master_type.Text_area) {
                            localData.val("cs-" + item.field_key,  selector);
                            localData.val("cs-" + item.field_key + "-type", "multi-text");
                        } else {
                            localData.val("cs-" + item.field_key,  selector);
                            localData.val("cs-" + item.field_key + "-type", "text");
                        }
                    });
                }
            });
        }


        function loadTicket(is_clear) {
            if (localData.val("loading-ticket")) {
                return;
            }
            localData.val("loading-ticket", true);
            if (localData.val("total-ticket") == undefined || is_clear) {
                localData.val("total-ticket", 0);
                $("#view-tab .select .act-more .item_per_page").val(10);
            }

            var skip = localData.val("total-ticket"),
                limit = $("#view-tab .select .act-more .item_per_page").val();

            var requester = localData.val("filter-requester").select2("val");

            postData("/rest/app/query/tickets", "post", {
                type : "view",
                date_type : localData.val("filter-date_type").value(),
                from_date : localData.val("filter-from_date-val"),
                to_date : localData.val("filter-to_date-val"),
                status : localData.val("filter-status").value(),
                requester : requester,
                organization : localData.val("filter-organization").value(),
                group : localData.val("filter-group").value(),
                assignee : localData.val("filter-agent").value(),
                date_format : "MM-DD-YYYY",
                skip : skip,
                limit: limit
            }, function(result) {
                if (result.is_error) {
                    for (var i in result.errors) {
                        var errors = result.errors[i].map(function(err) {
                            return _m[err];
                        });
                        $.notify(errors.join(","), "error");
                    }
                } else {

                    if (is_clear) {
                        localData.val("table-ticket").setDataSource(new kendo.data.DataSource({
                            data : []
                        }));
                        localData.val("filtered-requester-source", {});
                        localData.val("filtered-organization-source", {});
                        $("#view-tab .select .button-actions .act-select_all").prop("checked", false);
                    }

                    if (!localData.val("filtered-requester-source")) {
                        localData.val("filtered-requester-source", {});
                    }
                    if (!localData.val("filtered-organization-source")) {
                        localData.val("filtered-organization-source", {});
                    }

                    var new_data = result.data.map(function(item) {
                        var add_t_text = moment(item.add_time).fromNow(),
                            add_t_value = moment(item.add_time).format(server_date_format_string + " HH:mm");

                        var row = {
                            id : item.id,
                            subject : item.subject,
                            status_num : item.status,
                            status_name : _t.enums["status_" + item.status],
                            add_text : add_t_text,
                            add_value : add_t_value,
                            description : item.description
                        };


                        if (item.requester) {
                            localData.val("filtered-requester-source")[item.requester.id] = item.requester;
                        }
                        if (item.organization) {
                            localData.val("filtered-organization-source")[item.organization.id] = item.organization;
                        }
                        return row;
                    });

                    var dataSource = new kendo.data.DataSource({
                        data : (localData.val("table-ticket").dataSource.data() || []).map(function(item) {
                            return {
                                id : item.id,
                                subject : item.subject,
                                status_num : item.status,
                                status_name : item.status_name,
                                add_text : item.add_text,
                                add_value : item.add_value,
                                description : item.description
                            };
                        }).concat(new_data)
                    });

                    localData.val("table-ticket").setDataSource(dataSource);

                    var total = localData.val("total-ticket", localData.val("total-ticket") + result.data.length);
                    var remain = result.total - total;
                    if (remain > 0) {
                        $("#view-tab .select .act-more .number").html(remain);
                        $("#view-tab .select .act-more").show();
                    } else {
                        $("#view-tab .select .act-more").hide();
                    }
                    $("#view-tab .ticket-counter .counter").html("(" + total + ")");
                    if (!is_clear) {
                        $("#view-tab .select .table-ticket-container").scrollTop(99999);
                    }

                    //filtered-requester
                    var requester_source = [];
                    var object_requester_source = localData.val("filtered-requester-source");
                    for (var i in object_requester_source) {
                        requester_source.push(object_requester_source[i]);
                    }
                    var filtered_requester_source = new kendo.data.DataSource({
                        data : requester_source
                    });
                    localData.val("filtered-requester").setDataSource(filtered_requester_source);

                    //filtered-organization
                    var organization_source = [];
                    var object_organization_source = localData.val("filtered-organization-source");
                    for (var i in object_organization_source) {
                        organization_source.push(object_organization_source[i]);
                    }
                    var filtered_organization_source = new kendo.data.DataSource({
                        data : organization_source
                    });
                    localData.val("filtered-organization").setDataSource(filtered_organization_source);
                }
                localData.val("loading-ticket", false);
            });
        }

        //filter
        $("#view-tab .filter .button-actions .act-filter").click(function() {
            loadCs();
            loadTicket(true);
        });

        $("#view-tab .filter .button-actions .act-clear").click(function() {
            localData.val("table-ticket").setDataSource(new kendo.data.DataSource({
                data : []
            }));
            localData.val("table-custom-field").setDataSource(new kendo.data.DataSource({
                data : []
            }));
            $("#view-tab .ticket-counter .counter").html("(0)");
            $("#view-tab .select .act-more").hide();

        });

        $("#view-tab .filter .organization-filter-field").on("click", ".filtered-organization-item", function() {
            var org_id = $(this).data("id");
            localData.val("filter-organization").select(function(item) {
                return item.value == org_id;
            });
            loadTicket(true);
        });

        $("#view-tab .filter .requester-filter-field").on("click", ".filtered-requester-item", function() {
            var requester = {
                id : $(this).data("id"),
                text : $(this).data("display_name")
            };
            localData.val("filter-requester").select2('destroy');
            initRequesterFilter(requester);
            loadTicket(true);
        });

        //update
        $("#view-tab .act-for-update.button-actions .act-clear").click(function() {
            $("#view-tab .select .table-ticket input[type=checkbox]:enabled:checked").prop("checked", false);
        });

        $("#view-tab .act-for-update.button-actions .act-update").click(function() {
            var selected = $("#view-tab .select .table-ticket input[type=checkbox]:enabled:checked");
            var list_id = [];
            for (var i = 0; i < selected.length; i++) {
                list_id.push($(selected[i]).data("id"));
            }
            if (!list_id.length) {
                return;
            }
            var data = {
                id_tickets : list_id,
                comment : $("#view-tab .update .comment.value").val(),
                filter_group : localData.val("filter-group").value(),
                group : localData.val("update-group").value(),
                assignee : localData.val("update-assignee").value(),
                status : localData.val("update-status").value(),
                custom_settings : {},
                date_format : "MM-DD-YYYY"
            };

            if (localData.val("filter-group").value()) {

                var cs_list = localData.val("update-cs") || [];
                var selected_items = $("#view-tab .update .table-custom-setting .list-custom-item .cs-select:checked"),
                    selected_field_key = {};

                for (var i = 0; i < selected_items.length; i++) {
                    var field_key = $(selected_items[i]).data("field-key");
                    if (field_key) {
                        selected_field_key[field_key] = true;
                    }
                }

                cs_list.forEach(function(item) {
                    if (!selected_field_key[item.field_key]) {
                        return;
                    }
                    var name = "cs-" + item.field_key;
                    var type = name + "-type";
                    var new_data = {
                        id : item.id,
                        field_key : item.field_key,
                        type : item.type
                    };
                    if (localData.val(type) == "date") {
                        new_data.value = localData.val(name).value();
                        if (new_data.value !== null) {
                            new_data.value = moment(new_data.value).format("MM-DD-YYYY");
                        } else {
                            new_data.value = "";
                        }
                    } else if (["text", "multi-text"].indexOf(localData.val(type)) != -1) {
                        new_data.value = localData.val(name).val();
                    } else if (localData.val(type) == "checkbox") {
                        new_data.value = localData.val(name).prop("checked")?"checked":"unchecked";
                    } else {
                        new_data.value = localData.val(name).value();
                    }

                    data.custom_settings[item.field_key] = new_data;
                });
            }

            postData("/rest/app/update/tickets", "PUT", data, function(result) {
                if (result.is_error) {
                    for (var i in result.errors) {
                        var errors = result.errors[i].map(function(err) {
                            return _m[err];
                        });
                        $.notify(errors.join(","), "error");
                    }
                } else {
                    $.notify(result.data.success.length + " " + _m.ticket_s_has_been_updated_success, "success");
                    loadTicket(true);
                    loadCs();
                }
            });

        });

        $("#view-tab .act-for-update.button-actions .act-export-single").click(function() {
            var selected = $("#view-tab .select .table-ticket input[type=checkbox]:enabled:checked");
            var list_id = [];
            for (var i = 0; i < selected.length; i++) {
                list_id.push($(selected[i]).data("id"));
            }
            if (!list_id.length) {
                return;
            }

            postData("/rest/app/export/tickets", "post", {
                type : "single",
                id_tickets : list_id
            }, function(result) {
                if (!result.is_error) {
                    window.open(result.data, "_blank");
                }
            });
        });

        $("#view-tab .act-for-update.button-actions .act-export-multi").click(function() {
            var selected = $("#view-tab .select .table-ticket input[type=checkbox]:enabled:checked");
            var list_id = [];
            for (var i = 0; i < selected.length; i++) {
                list_id.push($(selected[i]).data("id"));
            }
            if (!list_id.length) {
                return;
            }

            postData("/rest/app/export/tickets", "post", {
                type : "multi",
                id_tickets : list_id
            }, function(result) {
                if (!result.is_error) {
                    window.open(result.data, "_blank");
                }
            });

        });

        //select

        $("#view-tab .select .act-more .item_per_page").click(function(e) {
            e.stopPropagation();
        });
        $("#view-tab .select .act-more .item_per_page").keydown(function(e) {
            if (e.keyCode == 13) {
                if ($(this).val().length == 0) {
                    $(this).val(10);
                }
                loadTicket();
            }
            var number = (e.keyCode >= 95 && e.keyCode <= 105) || (e.keyCode >= 48 && e.keyCode <= 57);
            var remove = e.keyCode == 8 || e.keyCode == 46;

            if ((number && !e.shiftKey) || remove) {
            } else {
                e.preventDefault();
            }
        });

        $("#view-tab .select .top-button-actions .act-select_all").change(function() {
            var checked = $(this).prop("checked");
            $("#view-tab .select .table-ticket .ticket-row input[type=checkbox]:enabled").prop("checked", checked);
        });

        $("#view-tab .select .button-actions .act-more").click(function() {
            loadTicket();
        });

        $("#view-tab .select .table-ticket").on("click", ".ticket-row", function(e) {
            var selector = $(this).find("input:enabled");
            selector.prop("checked", ! selector.prop("checked"));
        });

        $("#view-tab .select .table-ticket").on("click", ".ticket-row input", function(e) {
            e.stopPropagation();
        });

        $("#view-tab .select .table-ticket").on("click", ".ticket-row .subject", function(e) {
            window.open("/ticket/" + $(this).data("id"), "_blank");
            $(this).removeClass("text-blue").addClass("text-purple");
            e.stopPropagation();
        });

    })();

    //overdue tab
    (function() {

        var localData = new _LocalData();

        localData.val("table-ticket", $("#overdue-tab .ticket-table").kendoGrid({
            dataSource : [],
            height: "500px",
            columns: [{
                field : "subject",
                headerTemplate : "<span class='table-title'>" + _t.subject + "</span>",
                width: "300px"
            }, {
                field: "description",
                headerTemplate : "<span class='table-title'>" + _t.description + "</span>",
            }, {
                field: "due_date",
                headerTemplate : "<span class='table-title'>" + _t.due_date + "</span>",
                width: "150px"
            }, {
                field: "add_time",
                headerTemplate : "<span class='table-title'>" + _t.add_time + "</span>",
                width: "150px"
            }],
            rowTemplate : $("#" + app.data.name + "_tpl_overdue_ticket_row").html(),
            pageable: {
                pageSize: 10,
                change : function(e) {
                    loadOverdueTicket(e.index);
                }
            },
        }).data("kendoGrid"));

        loadOverdueTicket();

        $("#overdue-tab .ticket-table").on("click", ".ticket-row", function() {
            var id = $(this).data("ticket-id");
            if (id) {
                window.open("/ticket/" + id, '_blank');
            }
        });

        $("#overdue-tab .button-actions .act-reload").click(function() {
            loadOverdueTicket();
        });

        function loadOverdueTicket(page) {
            var page = page || 1;
            postData("/rest/app/query/tickets", "post", {
                type : "overdue",
                skip : (page - 1) * 10,
                limit : 10
            }, function(result) {
                if (result.is_error) {
                    for (var i in result.errors) {
                        var errors = result.errors[i].map(function(err) {
                            return _m[err];
                        });
                        $.notify(errors.join(","), "error");
                    }
                } else {
                    var dataSource = new kendo.data.DataSource({
                        data : result.data.map(function(item) {
                            var due_time = item.due_time || 0;
                            var due_date = moment(item).hour(due_time / 60).minute(due_time % 60);
                            var add_time = moment(item.add_time);

                            return {
                                id : item.id,
                                subject : item.subject,
                                description : item.description,
                                status_num : item.status + 1,
                                status_name : _t.enums["status_" + item.status],
                                due_date_text : due_date.fromNow(),
                                due_date_value : due_date.format(server_date_format_string + " HH:mm"),
                                add_time_text : add_time.fromNow(),
                                add_time_value : add_time.format(server_date_format_string + " HH:mm")
                            };
                        }),
                        pageSize: 10,
                        page : page,
                        serverPaging: true,
                        schema: {
                            total: function(res) {
                                return result.total;
                            }
                        }
                    });
                    localData.val("table-ticket").setDataSource(dataSource);
                }
            });
        }

    })();


    //report
    (function() {
        var localData = new _LocalData();

        localData.val("table-cs", $("#report-tab .filter .table-cs").kendoListView({
            template: $("#" + app.data.name + "_tpl_check_custom_setting_row").html()
        }).data("kendoListView"));

        localData.val("filter-ticket-type", $("#report-tab .filter .value.ticket-type").kendoDropDownList({
            dataSource: [{
                text : _t._voip_,
                value : null
            }],
            dataTextField: "text",
            dataValueField: "value"
        }).data("kendoDropDownList"));

        localData.val("filter-date-type", $("#report-tab .filter .value.date-type").kendoDropDownList({
            dataSource: [{
                text : '-',
                value : ""
            }, {
                text : _t.add_time,
                value : "add_time"
            }, {
                text : _t.updated_time,
                value : "upd_time"
            }, {
                text : _t.solved_date,
                value : "solved_date"
            }],
            dataTextField: "text",
            dataValueField: "value"
        }).data("kendoDropDownList"));

        localData.val("filter-month", $("#report-tab .filter .value.select-month").kendoDatePicker({
            format : "MMMM yyyy",
            start : "year",
            depth : "year",
            value : moment().date(1).toDate(),
        }).data("kendoDatePicker"));

        postData("/rest/app/query/custom-settings/group", "post", {
            type : "query-all"
        }, function(result) {
            if (result.is_error) {
                for (var i in result.errors) {
                    var errors = result.errors[i].map(function(err) {
                        return _m[err];
                    });
                    $.notify(errors.join(","), "error");
                }
            } else {
                var master_type = result.data.CustomFieldType;
                var data = result.data.custom_settings;

                var dataSource = new kendo.data.DataSource({
                    data : data.map(function(item) {
                        var type_name = "text";
                        if (item.type == master_type.Checkbox) {
                            type_name = "checkbox";
                        } else if (item.type == master_type.Text_area) {
                            type_name = "textarea";
                        }

                        return {
                            name : item.name,
                            field_key : item.field_key,
                            type : type_name
                        };
                    })
                });
                localData.val("table-cs").setDataSource(dataSource);


                data.forEach(function(item) {

                    var selector = $("#report-tab .table-cs .cs-" + item.field_key);
                    localData.val("cs-" + item.field_key + "-info", item);

                    if (item.type == master_type.Drop_down) {
                        localData.val("cs-" + item.field_key, selector.kendoDropDownList({
                            dataSource: item.default_value,
                            dataTextField: "key",
                            dataValueField: "value",
                            optionLabel : "-"
                        }).data("kendoDropDownList"));
                        localData.val("cs-" + item.field_key + "-type", "dropdown");
                    } else if (item.type == master_type.Date) {
                        localData.val("cs-" + item.field_key, selector.kendoDatePicker({
                            format : date_format_string,
                        }).data("kendoDatePicker"));
                        localData.val("cs-" + item.field_key + "-type", "date");
                    } else if (item.type == master_type.Checkbox) {
                        localData.val("cs-" + item.field_key,  selector);
                        localData.val("cs-" + item.field_key + "-type", "checkbox");
                    } else if (item.type == master_type.Numeric) {
                        localData.val("cs-" + item.field_key,  selector.kendoNumericTextBox({
                            format : "n0",
                            min : 0
                        }).data("kendoNumericTextBox"));
                        localData.val("cs-" + item.field_key + "-type", "numeric");
                    }  else if (item.type == master_type.Decimal) {
                        localData.val("cs-" + item.field_key,  selector.kendoNumericTextBox({
                            min : 0
                        }).data("kendoNumericTextBox"));
                        localData.val("cs-" + item.field_key + "-type", "decimal");
                    } else if (item.type == master_type.Text_area) {
                        localData.val("cs-" + item.field_key,  selector);
                        localData.val("cs-" + item.field_key + "-type", "multi-text");
                    } else {
                        localData.val("cs-" + item.field_key,  selector);
                        localData.val("cs-" + item.field_key + "-type", "text");
                    }
                });
            }
        });

        $("#report-tab .filter .button-actions .act-report").click(function() {

            var selected = $("#report-tab .filter .table-cs input:checked.select");
            var data = [];
            for (var i = 0; i < selected.length; i++) {
                var field_key = $(selected[i]).data("field-key"),
                    name = "cs-" + field_key,
                    type = localData.val(name + "-type");
                var cs_info = localData.val(name + "-info");

                var item = {
                    id : cs_info.id,
                    type : cs_info.type,
                    field_key : cs_info.field_key
                };

                if (type == "date") {
                    item.value = localData.val(name).value();
                    if (item.value !== null) {
                        item.value = moment(item.value).format("MM-DD-YYYY");
                    } else {
                        item.value = "";
                    }
                } else if (["text", "multi-text"].indexOf(type) != -1) {
                    item.value = localData.val(name).val();
                } else if (type == "checkbox") {
                    item.value = localData.val(name).prop("checked")?"checked":"unchecked";
                } else {
                    item.value = localData.val(name).value();
                }
                data.push(item);
            }

            var month = localData.val("filter-month").value();
            if (month !== null) {
                month = moment(month).format("MM-DD-YYYY");
            }

            postData("/rest/app/report/tickets", "POST", {
                date_format : "MM-DD-YYYY",
                custom_settings : data,
                ticket_type : localData.val("filter-ticket-type").value(),
                date_type : localData.val("filter-date-type").value(),
                month : month
            }, function(result) {
                if (result.is_error) {
                    for (var i in result.errors) {
                        var errors = result.errors[i].map(function(err) {
                            return _m[err];
                        });
                        $.notify(errors.join(","), "error");
                    }
                } else {
                    loadChart(result.data);
                }
            });

        });

        function loadChart(data) {

            if (localData.val("bar-chart")) {
                localData.val("bar-chart").destroy();
                localData.val("bar-chart", null);
            }

            var date_array = [];
            for (var i = 1; i <= data.date.day_of_month; i++) {
                date_array.push(_t.date_ + i);
            }

            localData.val("bar-chart", $("#report-tab .report .bar-chart").kendoChart({
                title: {
                    text: _t.report_ticket
                },
                legend: {
                    position: "top"
                },
                series: [{
                    type: "column",
                    field : "count"
                }],
                valueAxis: {
                    labels: {
                        format: "{0}"
                    },
                    line: {
                        visible: false
                    },
                    axisCrossingValue: 0
                },
                categoryAxis: {
                    categories: date_array,
                    line: {
                        visible: false
                    }
                },
                tooltip: {
                    visible: true,
                    format: "{0}",
                    template: "#= value #"
                }
            }).data("kendoChart"));

            localData.val("bar-chart").setDataSource(new kendo.data.DataSource({
                data : data.report
            }));
        }


    })();

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
