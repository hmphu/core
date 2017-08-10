{
    init:()=>{
        this.query = '';
        this.params = {};
//        this.currentModelName = 'index';
//        this.currentModel = {
//            parent: this,
//        };
//       
        this.viewModel = this.getViewModel();
        this.templates = this.app_data.templates;
//        this.route('category_view', {id: '57fb1e163ca110d619109fd1'});
        this.route('index');
        this.master = {
            orderByList:[
                {id: 1, text: this.app_data.lng.translates.latest_first},
                {id: 2, text: this.app_data.lng.translates.latest_last},
                {id: 3, text: this.app_data.lng.translates.alphabe},
            ],
            categories:{
                url: "app/wiki/category?limit=15",
                mapping:{
                    text: 'title',
                    id: '_id'
                }
            },
            sections:{
                url: "app/wiki/sect-opts?limit=15",
                mapping:{
                    id:"_id",
                    text: "title",
                    options: {
                        name: 'sections',
                        id: '_id',
                        text: 'title'
                    }
                }
            },
            agents:{
                url: "people/user?suspened=0&role=agent-admin&limit=15",
                mapping:{
                    id:"_id",
                    text: "name"
                }
            }
//            sections:{
//                url: "app/wiki/section?limit=15",
//                mapping:{
//                    id:"_id",
//                    text: "title"
//                }
//            }
        };
    },
    getCategoryModel:()=>{
        var that = this;
        var CategoryModel = function(){
            this.parent = that;
        };
    },
    search: ()=>{
        this.route('search', {query: this.query});
        this.query = '';
    },
    toggleNav:false,
    showMenu:false,
    route:(routeName, params)=>{
        this.currentModel = null;
        this.params = params = params || {};
        this.showMenu = false;
        switch(routeName){
            case 'index':
                this.currentModelName = 'index';
                this.currentModel= this.getIndexModel();
                break;
            case 'search':
                this.currentModelName = 'search';
                this.currentModel = this.getSearchModel( params );
                break;
            case 'report':
                this.currentModelName = 'report';
                this.currentModel = this.getReportModel();
                break;
            case 'category_view':
                this.currentModelName = 'category_view';
                this.currentModel = this.getViewCateModel(params? params.id: undefined);
                break;
            case 'category_edit':
                this.currentModelName = 'category_edit';
                this.currentModel = this.getEditCateModel(params);
                break;
            case 'section_view':
                this.currentModelName = 'section_view';
                this.currentModel = this.getViewSectionModel(params? params.id: undefined);
                break;
            case 'section_edit':
                this.currentModelName = 'section_edit';
                this.currentModel = this.getEditSectionModel(params);
                break;
            case 'article_view':
                this.currentModelName = 'article_view';
                this.currentModel = this.getViewArticleModel(params? params.id: undefined)
                break;
            case 'article_edit':
                this.currentModelName = 'article_edit';
                this.currentModel = this.getEditArticleModel(params);
                break;
            default:
                this.currentModelName = 'index';
                this.currentModel= this.getIndexModel();
                break;
        }
    },
    getViewModel: ()=>{
        var that = this;
        var ViewModel = function(){
            this.parent = that;
            
            this.activate = (model)=>{
                this.model = model;
                if(this.model && this.model.initData){
                    return this.model.initData();
                }
                return true;
            };
        };
        return new ViewModel;
    },
    getSectionModel: (cate, load_more)=>{
        var that = this;
        var SectionModel = function(){
            this.cate = cate;
            this.limit = 15;
            this.canLoadMore = false;
            this.isLoadMore = !load_more;
            this.initData = ()=>{
                return new Promise((resolve)=>{
                    if(load_more){
                        that.http.fetch(`app/wiki/section?cat_id=${cate._id}&limit=${this.limit + 1}`).then(sections =>{
                            this.canLoadMore = sections.length > this.limit;
                            if(sections.length > this.limit){
                                sections.pop();
                            }
                            this.sections = sections.map(sect=>{
                                that.http.fetch(`app/wiki/article?sect_id=${sect._id}&limit=5`).then(articles =>{
                                    sect.articles = articles;
                                });
                                return sect;
                            });
                            resolve();
                        }).catch(ex=>{
                            resolve();
                        });
                    }else{
                        that.http.fetch(`app/wiki/section?cat_id=${cate._id}&limit=5`).then(sections =>{
                            this.sections = sections.map(sect=>{
                                that.http.fetch(`app/wiki/article?sect_id=${sect._id}&limit=5`).then(articles =>{
                                    sect.articles = articles;
                                });
                                return sect;
                            });
                            resolve();
                        }).catch(ex=>{
                            resolve();
                        });
                    }
                });
            };
            this.activate = ()=>{
                return this.initData();
            }
            
            this.loadMore = (skip, limit)=>{
                skip = skip || (this.sections.length == 0 ? 0: this.sections.length);
                that.http.fetch(`app/wiki/section?cat_id=${this.cate._id}&skip=${skip}&limit=${this.limit + 1}`).then(sections =>{
                    this.canLoadMore = sections.length > this.limit;
                    if(sections.length > this.limit){
                        sections.pop();
                    }
                    sections = sections.map(sect=>{
                        that.http.fetch(`app/wiki/article?sect_id=${sect._id}&limit=5`).then(articles =>{
                            sect.articles = articles;
                        });
                        return sect;
                    });
                    
                    this.sections = this.sections.concat(sections);
                });
            };
        };
        
        return new SectionModel;
    },
    getIndexModel:()=>{
        var that = this;
        var ViewIndex = function(){
            this.parent = that;
            this.initData = ()=>{
                return new Promise((resolve)=>{
                    Promise.all([
                        that.http.fetch('app/wiki/category'),
                        that.http.fetch('app/wiki/article?limit=5')
                    ]).then((results)=>{
                        this.categories = results[0].map(cat=>{
                            cat.open = false;
                            cat.sections = that.getSectionModel(cat);
                            return cat;
                        });
                        this.recentArticles = results[1];
                        resolve();
                    }, (ex)=>{
                        resolve();
                    });
                });
            };
        };
        
        ViewIndex.prototype = {};
        
        return new ViewIndex;
    },
    getSearchModel:(params)=>{
        var that = this;
        var ViewSearch = function(){
            this.parent = that;
            this.query = params.query;
            this.initData = ()=>{
                return new Promise((resolve)=>{
                    Promise.all([
                        that.http.fetch(`app/wiki/article?text_search=${params.query}`),
                        that.http.fetch('app/wiki/article?limit=5')
                    ]).then((results)=>{
                        this.articles = results[0];
                        this.recentArticles = results[1];
                        resolve();
                    }, (ex)=>{
                        resolve();
                    });
                });
            };
        };
        
        ViewSearch.prototype = {};
        
        return new ViewSearch;
    },
    getReportModel: ()=>{
        var that = this;
        var ViewStats = function(){
            this.parent = that;
            this.agent;
            this.initData = ()=>{
//                var self = this;
//                window.loadChart = (type)=>{
//                    self.getChartData(type);
//                }
                return true;
            };

            this.getChartData = (type, user_id)=>{
                that.http.fetch(`app/wiki/report/${type}/${user_id || ''}`).then(data=>{
                    this.generateChart(`#chart`, data);
                }).catch(ex=>{
                    console.log(ex);
                });
            };
            this.generateChart = (target, data)=>{
                var options = {
                    bindto: target,
                    data: {
                        json: data,
                        keys: {
                            x: 'search', // it's possible to specify 'x' when category axis
                            value: ['count'],
                        },
                        labels: {
                            format: (v) =>{
                                return v? `${v}`:''
                            }
                        },
                        type: 'bar'
                    },
                    axis: {
                        x: {
                            type: 'category'
                        },
                        y: {
                            padding: { bottom: 0},
                            min:0
                        }
                    },
                    grid: {
                        x: { show:true },
                        y: { show:true }
                    },
                    legend: { show: false },
                    tooltip: { show: false }
                };
                that.c3.generate(options);
            };

            this.agentChanged = (evt)=>{
                if(evt.detail && evt.detail.value && evt.detail.value._id){
                    this.agent = evt.detail.value._id;
                    this.getChartData('user', this.agent);
                }
            };
        };
        ViewStats.prototype = {
        };
        return new ViewStats;
    },
    getViewCateModel:(cate_id)=>{
        var that = this;
        var ViewCategory = function(){
            this.parent = that;
            this.initData = ()=>{
                return new Promise((resolve)=>{
                    that.http.fetch(`app/wiki/category/${cate_id}`).then(cate =>{
                        cate.sections = that.getSectionModel(cate, true);
                        cate.open = true;
                        this.cate = cate;
                        resolve();
                    }).catch(ex=>{
                        console.log(ex);
                        resolve();
                    });
                });
            };
        };
        ViewCategory.prototype = {};
        
        return new ViewCategory;
    },
    getViewSectionModel:(sect_id)=>{
        var that = this;
        
        var ViewSectionModel = function(){
            this.canLoadMore = false;
            this.limit = 15;
            this.initData = ()=>{
                that.http.fetch(`app/wiki/section/${sect_id}`).then(section =>{
                    this.section = section;
                    that.params.cate_id = this.section.category_id._id;
                });
                that.http.fetch(`app/wiki/article?sect_id=${sect_id}&limit=${this.limit + 1}`).then(articles =>{
                    this.canLoadMore = articles.length > this.limit;
                    if(articles.length > this.limit){
                        articles.pop();
                    }
                    this.articles = articles;
                });
            }
            
            this.loadMore = (skip, limit)=>{
                skip = skip || (this.articles.length == 0 ? 0: this.articles.length);
                that.http.fetch(`app/wiki/article?sect_id=${sect_id}&skip=${skip}&limit=${this.limit + 1}`).then(articles =>{
                    this.canLoadMore = articles.length > this.limit;
                    if(articles.length > this.limit){
                        articles.pop();
                    }
                    this.articles =  this.articles.concat(articles);
                    
                });
            };
        };
        
        return new ViewSectionModel;
    },
    getViewArticleModel:(art_id)=>{
        var that = this;
        var ViewArticleModel = function(){
            this.imageType = "jpg jpeg png gif"
            this.initData = ()=>{
                that.http.fetch(`app/wiki/article/${art_id}`).then(article =>{
                    this.art = article;
                });
            }
            this.isImage = (file)=>{
                return (file && this.imageType.indexOf(file.split('.').pop()) != -1)
            };
        };
        
        return new ViewArticleModel;
    },
    getEditCateModel:(params)=>{
        var that = this;
        var EditCategory = function(){
            this.parent = that;
            this.cate = {};
            this.initData = ()=>{
                if(params.id){
                    that.http.fetch(`app/wiki/category/${params.id}`).then(cate =>{
                        this.cate = cate;
                    }).catch(ex=>{

                    });
                }
            };

            this.save = ()=>{
                that.http.post(`app/wiki/category/${this.cate._id || ''}`, this.cate, this.cate._id? 'put':'post').then(result=>{
                    if(result.errors){
                        return that.errors.showServerErrors(result.errors, '#edit-category');
                    }
                    that.notify.notifier(that.app_data.lng.messages.save_cate_success, 'success');
                    setTimeout(()=>{
                        that.route('category_view', {id: result._id});
                    }, 150);
                }).catch(ex=>{
                    
                });
            }
            
            this.remove = ()=>{
                that.http.post(`app/wiki/category/${this.cate._id}`, {}, 'delete').then(result=>{
                    if(result.errors){
                        return that.errors.showServerErrors(result.errors);
                    }
                    that.notify.notifier(that.app_data.lng.messages.remove_cate_success, 'success');
                    setTimeout(()=>{
                        that.route('index');
                    }, 150);
                }).catch(ex=>{
                    
                });
            }
        };
        
        return new EditCategory;
    },
    getEditSectionModel:(params)=>{
        var that = this;
        var EditSection = function(){
            this.parent = that;
            this.sect = {};
            this.initData = ()=>{
                if(params.id){
                    that.http.fetch(`app/wiki/section/${params.id}`).then(sect =>{
                        this.sect = sect;
                        if(typeof this.sect.category_id == 'object'){
                            this.sect.category_id = this.sect.category_id._id;
                        }
                        this.sect.order_by = this.sect.order_by || 1;
                        this.cate_id = sect.category_id;
                    }).catch(ex=>{

                    });
                }else{
                    that.http.fetch(`app/wiki/category?limit=1`).then(result =>{
                        if(result.length == 0){
                            that.notify.notifier(that.app_data.lng.messages.add_section, 'warn');
                            setTimeout(()=>{
                                that.route('index');
                            }, 250);
                            return;
                        }
                        this.sect.category_id = params.cate_id;
                        this.sect.order_by = 1;
                    }).catch(ex=>{

                    });
                }
            };
            
            this.save = ()=>{
                that.http.post(`app/wiki/section/${this.sect._id || ''}`, this.sect, this.sect._id? 'put':'post').then(result=>{
                    if(result.errors){
                        return that.errors.showServerErrors(result.errors, '#edit-section');
                    }
                    that.notify.notifier(that.app_data.lng.messages.save_sect_success, 'success');
                    setTimeout(()=>{
                        // redicrect to current category
                        that.route('category_view', {id: this.sect.category_id});
                    }, 150);
                }).catch(ex=>{
                    
                });
            }
            
            this.remove = ()=>{
                that.http.post(`app/wiki/section/${this.sect._id}`, {}, 'delete').then(result=>{
                    if(result.errors){
                        return that.errors.showServerErrors(result.errors);
                    }
                    that.notify.notifier(that.app_data.lng.messages.remove_sect_success, 'success');
                    setTimeout(()=>{
                        
                        // redicrect to odl category
                        that.route('category_view', {id: this.cate_id});
                    }, 150);
                }).catch(ex=>{
                    
                });
            }
        };
        
        return new EditSection;
    },
    getEditArticleModel:(params)=>{
        var that = this;
        var EditArticle = function(){
            this.parent = that;
            this.art = { files : []};
            this.accept_file = "image/gif, image/jpeg, image/png, text/plain, application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-powerpointtd, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword, application/vnd.oasis.opendocument.text, application/vnd.oasis.opendocument.spreadsheet"
            this.initData = ()=>{
                if(params.id){
                    that.http.fetch(`app/wiki/article/${params.id}`).then(art =>{
                        this.art = art;
                        if(typeof this.art.section_id == 'object'){
                            this.cate_id = this.art.section_id.category_id;
                            this.art.section_id = this.art.section_id._id;
                        }
                        art.oldFiles = art.files;
                        art.files = [];
                        this.section_id = art.section_id;
                    }).catch(ex=>{

                    });
                }else{
                    that.http.fetch(`app/wiki/section?limit=1`).then(result =>{
                        if(result.length == 0){
                            that.notify.notifier(that.app_data.lng.messages.add_article, 'warn');
                            setTimeout(()=>{
                                that.route('index');
                            }, 250);
                        }
                        else{
                            this.cate_id = params.cate_id;
                            this.art.section_id = params.sect_id;
                        }
                    }).catch(ex=>{
                        console.log(ex);
                    });
                    
                }
            };
            
            this.save = ()=>{
                if(this.art.files && this.art.files.length > 0){
                    var formData = new FormData();
                    formData.append('content', this.art.content);
                    formData.append('title', this.art.title);
                    formData.append('section_id', this.art.section_id);
                    if(this.art.files.length > 0){
                        this.art.files.forEach( file=>{
                            formData.append('attachments', file);
                        });
                    }
                    
                    if(this.art.oldFiles && this.art.oldFiles.length > 0){
                        this.art.oldFiles.forEach( file=>{
                            formData.append('old_files', file);
                        });
                    }
                    
                    that.http.postFormData(`app/wiki/article/${this.art._id || ''}`, formData, this.art._id? 'put': 'post').then(result=>{
                        if(result.errors){
                            that.errors.showServerErrors(result.errors, '#edit-article')
                            return;
                        }
                        that.notify.notifier(that.app_data.lng.messages.save_art_success, 'success');
                        setTimeout(()=>{
                            that.route('section_view', {id: this.art.section_id});
                        }, 150);
                    }).catch(ex=>{

                    });
                }else{
                    that.http.post(`app/wiki/article/${this.art._id || ''}`, this.art, this.art._id? 'put': 'post').then(result=>{
                        if(result.errors){
                            that.errors.showServerErrors(result.errors, '#edit-article')
                            return;
                        }
                        that.notify.notifier(that.app_data.lng.messages.save_art_success, 'success');
                        setTimeout(()=>{
                            that.route('section_view', {id: this.art.section_id});
                        }, 150);
                    }).catch(ex=>{

                    });
                }
            }
            
            this.removeFile = (file, index)=>{
                that.http.post(`app/wiki/article/${this.art._id}/file/${file}`,{}, 'delete').then(result =>{
                    if(result.errors){
                        that.errors.showServerErrors(result.errors);
                    }
                    this.art.oldFiles.splice(index, 1);
                    that.notify.notifier(that.app_data.lng.messages.file_remove_success, 'success');
                }).catch(ex=>{

                });
            }
            
            this.remove = ()=>{
                that.http.post(`app/wiki/article/${this.art._id}`, {}, 'delete').then(result=>{
                    if(result.errors){
                        return that.errors.showServerErrors(result.errors);
                    }
                    that.notify.notifier(that.app_data.lng.messages.remove_art_success, 'success');
                    setTimeout(()=>{
                        // redirect to old section
                        that.route('section_view', {id: this.section_id});
                    }, 150);
                }).catch(ex=>{
                    
                });
            }
        };
        
        return new EditArticle;
    }
}
