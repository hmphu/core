String.prototype.capitalizeFirst = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

// cache DOM elements
var app_id = document.getElementById(app.data.name);
var template_list = app.data.tpl_data.template_list;

var html_tmpl= '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html><head>#meta# #style#</head><body {{attributes}} style="width: 100%!important; margin: 0; padding: 0;">#content#</body></html>';

initApp();
function setTimeFormat( format ){

    var objectFormat ={};

    if(format === "12"){
         objectFormat =  {
            LT: "h:mm A",
            LTS: "h:mm:ss A",
            L: "MM/DD/YYYY",
            l: "M/D/YYYY",
            LL: "MMMM Do YYYY",
            ll: "MMM D YYYY",
            LLL: "MMMM Do YYYY LT",
            lll: "MMM D YYYY LT",
            LLLL: "dddd, MMMM Do YYYY LT",
            llll: "ddd, MMM D YYYY LT"
        };
    }else{
         objectFormat =  {
            LT: "HH:mm",
            LTS: "HH:mm:ss",
            L: "MM/DD/YYYY",
            l: "M/D/YYYY",
            LL: "MMMM Do YYYY",
            ll: "MMM D YYYY",
            LLL: "MMMM Do YYYY LT",
            lll: "MMM D YYYY LT",
            LLLL: "dddd, MMMM Do YYYY LT",
            llll: "ddd, MMM D YYYY LT"
        };
    }

    moment.locale( current_locale,{
        longDateFormat : objectFormat
    } );
}

function initApp(){
    $(app_id).css("height", "100%");
    //$(app_id).css("width", "100%");


    $(".slide_email_tmpl").html($.apps.render_layout(app.data.name,"tpl_img_slider", {
        template_list: template_list,
        app_name: app.data.name
    }));

    $(".slide_email_tmpl").slick({
        centerMode : true,
        vertical: true,
        slidesToShow: 3,
        verticalSwiping: true,
        focusOnSelect : true,
        prevArrow : '<button type="button" class="slick-prev"> <span class="glyphicon glyphicon-chevron-down"></span></button>',
        nextArrow : '<button type="button" class="slick-next"> <span class="glyphicon glyphicon-chevron-up"></span></button>',
    });

    CKEDITOR.config.fullPage = true;
    CKEDITOR.config.allowedContent = true;
    CKEDITOR.config.width = "99%";
//    CKEDITOR.config.height = "100%";
     CKEDITOR.config["min-height"] = "800px";
    CKEDITOR.replace( 'editor_content', {
            language: current_locale,
//            height: "100%",
//            width: "99%"
    } );

}

$("span[data-href]").bind("click", function(e){
    e.preventDefault();
    var url = "/apps/assets/"+ app.data.name+"/" + $(this).data("href")+"?_="+Date.now();
    getEmailTemplate(url);
});

function getEmailTemplate(url){
    //template_preview.src = url;
    kendo.ui.progress($(app_id), true);
    $.get(url,{}, function(data, status){
        CKEDITOR.instances.editor_content.setData(data);
        $("#apply").removeAttr("disabled");//enable apply template

    }, "html").fail(function() {
        alert( "error" );
    }).always(function() {
         kendo.ui.progress($(app_id), false);
    });
}

var editor = document.getElementById("editor_content");


$("#edit_template").click(function(e){
    e.preventDefault();
    var url = baseurl + "/rest/settings/channel-email/get-html-mail";
    kendo.ui.progress($("body"), true);
    $.ajax({
        type: 'GET',
        url: url,
        async: true,
        cache: false,
        dataType : "json",
        success: function(result){
            var message = "";
            if( result.is_error ){
                $.each(result.errors, function(key, value){
                   $.notify(value || app.data.load_tmpl_error, "error");
                });
            }
            else if(!result.data){
                message= app.data.load_tmpl_error;
                 $.notify(message, "error");
            }
            else{
                 CKEDITOR.instances.editor_content.setData(result.data);
                message = app.data.lng.load_tmpl_success;
                $("#apply").removeAttr("disabled");//enable apply template
                $.notify(message, "success");
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
            $.notify(app.data.load_tmpl_error, "error");
        },
        complete: function(xhr){
            kendo.ui.progress($("body"), false);
        }
    });
});

$("#apply").click(function(e){
    e.preventDefault();
    applyTemplate();
});




function applyTemplate(){
    var tmpl = getHtmlFromEditor();
    kendo.ui.progress($("body"), true);

    var url = baseurl+ "/rest/settings/channel-email/update-html-mail";
    $.ajax({
        type: 'POST',
        url: url,
        async: true,
        cache: false,
        dataType : "json",
        data: {
            html_mail: tmpl
        },
        success: function(result){
            var message = "";
            if( result.is_error ){
                $.each(result.errors, function(key, value){
                   $.notify(value, "error");
                });
            }
            else if(!result.data){
                message= app.data.apply_error;
                 $.notify(message, "error");
            }
            else{
                message = app.data.lng.apply_success;
                $.notify(message, "success");
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
            $.notify(app.data.apply_error, "error");
        },
        complete: function(xhr){
            kendo.ui.progress($("body"), false);
        }
    });
}

CKEDITOR.getFullHTMLContent = function(editor){
	var cnt = "";
	editor.once('contentPreview', function(e){
        //console.log(e);
		cnt = e.data.dataValue;
		return false;
	});
	editor.execCommand('preview');

	return cnt;
}
function getHtmlFromEditor(){
    var iframe = document.getElementById("template_preview");
    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write(CKEDITOR.instances.editor_content.getData());
    doc.close();

    return doc.documentElement.outerHTML;

}

