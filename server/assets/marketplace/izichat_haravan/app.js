// js
var app_id = '#' + app.data.name;
var script_tag_id = $.apps.get_param(app.secret, app.params.script_tag_id);
var is_connecting = false; // prevent multi click

// delegate event click : hide detail order
$(app_id).delegate('.disconnect-chat', 'click', function() {
    // progress
    $(this).html($(this).html() + '...');

    if (script_tag_id) {
        var option_request = {
            request_opts : {
                host : $.apps.get_param(app.secret, app.params.api_domain),
                port : 443,
                path : '/admin/script_tags/' + script_tag_id + '.json',
                method : 'DELETE',
                headers : {
                    'Authorization' : 'Basic #param.api_key#'
                }
            },
            is_https : true
        };

        $.apps.fetch_data(app.data.name, option_request, function(data) {
            $('.btn-connect', app_id).show().html(app.data.lng.text.connect);
            $('.btn-connect', app_id).addClass('connect-chat').removeClass('disconnect-chat');
        });
    }
});

$(app_id).delegate('.connect-chat', 'click', function() {
    if (is_connecting === false) {
        is_connecting = true;

        $.ajax({
            type: 'GET',
            url: '/rest/chat/widget-code',
            async: true,
            cache: false,
            dataType : "json",
            success: function(result){

                if (result && result.is_error == false) {
                    var body = result.data.replace( /<script\b[^>]*>(.*?)<\/script>/i, "$1" );
                    var post_data = {
                        "script_tag": {
                          "event": "onload",
                          "body": body
                        }
                    };

                    var option_request = {
                        request_opts : {
                            host : $.apps.get_param(app.secret, app.params.api_domain),
                            port : 443,
                            path : '/admin/script_tags.json',
                            method : 'POST',
                            headers : {
                                'Authorization' : 'Basic #param.api_key#',
                                'Content-Type': 'application/json'
                            }
                        },
                        is_https : true,
                        post_data: post_data
                    };

                    // progress
                    $(this).html($(this).html() + '...');

                    $.apps.fetch_data(app.data.name, option_request, function(data) {
                        // turn-off flag
                        is_connecting = false;

                        if (data && data.script_tag) {
                            var parameters = {};
                            parameters['script_tag_id'] = data.script_tag.id;
                            script_tag_id = data.script_tag.id;

                            // update value parameter in file json
                            $.ajax({
                                type: 'PUT',
                                url: '/api/app/modify/parameters',
                                async: true,
                                cache: false,
                                dataType : "json",
                                data: {app_name: app.data.name, parameters: parameters},
                                success: function(result){
                                    if (result && result.is_error == false) {

                                    } else {

                                    }

                                    $('.btn-connect', app_id).show().html(app.data.lng.text.disconnect);
                                    $('.btn-connect', app_id).removeClass('connect-chat').addClass('disconnect-chat');
                                },
                                error: function(XMLHttpRequest, textStatus, errorThrown)
                                {
                                    $.notify(textStatus, "error");
                                }
                            });
                        }
                    });

                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
                $.notify(textStatus, "error");
            }
        });
    }
});

if (app_id) {
    var option_request = {
        request_opts : {
            host : $.apps.get_param(app.secret, app.params.api_domain),
            port : 443,
            path : '/admin/script_tags.json',
            method : 'GET',
            headers : {
                'Authorization' : 'Basic #param.api_key#'
            }
        },
        is_https : true
    };

    $.apps.fetch_data(app.data.name, option_request, function(data) {
        var is_connected = false;

        if (data && data.script_tags && data.script_tags.length > 0) {
            for (var i in data.script_tags) {
                if (data.script_tags[i].id == script_tag_id) {
                    is_connected = true;
                    break;
                }
            }
        }

        if (is_connected) {
            $('.btn-connect', app_id).show().html(app.data.lng.text.disconnect);
            $('.btn-connect', app_id).removeClass('connect-chat').addClass('disconnect-chat');
        } else {
            $('.btn-connect', app_id).show().html(app.data.lng.text.connect);
            $('.btn-connect', app_id).addClass('connect-chat').removeClass('disconnect-chat');
        }
    });
}
