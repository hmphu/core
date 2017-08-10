{
    init: ()=>{
        this.forum = {};
        this.isShowPopup = false;
        this.comment = "";
        this._t= this.app_data.lng.translations || {};
        this._m= this.app_data.lng.messages || {};
        this.master = {
            forumAuths : {
                url: "",
                mapping:{
                    id: "_id",
                    text: "username"
                }
            }
        };
        this.profile = null;
    },
    search : async (params) => {
//        console.log(this.ticket);
        let url = this.ticket.fields[this.app_params.custom_field];
        this.url = url;
        if(!url){
            this.domain = null;
            return;
        }
        this.posterName= this.ticket.fields[this.app_params.poster_name] ;
        //  create an anchor element (note: no need to append this element to the document)
        var link = document.createElement('a');

        //  set href to any path
        link.setAttribute('href', url);
        this.domain = link.hostname;

        this.master.forumAuths.url = `${this.app_params.api_url}forum/setting/${this.me._id}?owner_id=${this.me.branding.ed_user}&domain=${this.domain}`;
        this.http.fetch(`${this.app_params.api_url}forum/master?name=${this.domain}`, "GET").then(result=>{
            if (!result || result.errors) {
                return;
            }

            this.forum = result[0];
//
            // get first comment
            this.http.fetch(`first-ticket-comments/${this.ticket._id}`).then(result=>{
                if(result || !result.error){
                    this.firstComment = result;
                }
            });
        });
    },
    refresh : async () => {
        this.search();
    },
    showPopup : () => {
        if(false /*this.forum.is_allow_frame*/){
            this.isShowPopup = true;
        }else{
            var w = 900;
            var h = 500;
            var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;  
            var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;  

            var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;  
            var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;  

            var left = ((width / 2) - (w / 2)) + dualScreenLeft;
            var top = ((height / 2) - (h / 2)) + dualScreenTop;
            var newWindow = window.open(this.url, "myWindow", 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
            if (window.focus) {
                newWindow.focus();
            }
        }
    },
    ticketChanged : async (newValue) => {
        this.ticket = newValue || {};
        this.refresh();
    },
    profileChanged: (evt)=>{
        var value = evt.detail.value;
        this.profile = value;
//        if(value){
//            this.errors.resetFormGroup(document.getElementById('form-profile').parentElement);
//        }
    },
    changedToggled : () => {
        this.refresh();
    },
    quote:()=>{
        if(this.firstComment){
            let quoteStr = `[QUOTE="${this.posterName || ''}"]${this.firstComment.content}[/QUOTE]\n`;
            this.comment = quoteStr + this.comment;
        }
    },
    validatePost: ()=>{
        var errors = {};
        if(!this.profile){
            errors['forum-profile'] = [this._m.profile_required];
        };

        if(!this.comment || this.comment == ''){
            errors['forum-post-comtent'] = [this._m.content_required];
        };

        return errors;
    },
    post: ()=>{
        var errors = this.validatePost();
        if(Object.keys(errors).length > 0){
            this.errors.showClientErrors('#forum-app-ticket', errors);
            console.log(errors);
            return;
        }else{
            this.errors.clearFormErrors('#forum-app-ticket');
        }

        var data = {
            domain: this.profile.domain,
            provider_data: {
                message: this.comment,
                url: this.url,
                username: this.profile.username,
                password: this.profile.password,
                user_id: this.me._id,
                owner_id : this.me.branding.ed_user_id
            }
        };

        this.http.post(`${this.app_params.api_url}forum/comment`, data).then(result=>{

            if(result.errors){
                this.errors.showServerErrors(result.errors);
                this.showPopup();
                this.comment = "";
                return;
            }

            this.notify.notifier(this._m.post_success, "success");
            this.events.publish("izi-set-ticket-content", {content: this.comment,ticket_id: this.ticket._id});
            this.comment = "";
        });
    }
}
