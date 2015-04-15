/*
 * Copyright (c) 2015 Institute of the Czech National Corpus
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

/// <reference path="../ts/declarations/jquery.d.ts" />
/// <reference path="../ts/declarations/typeahead.d.ts" />
/// <reference path="../ts/declarations/dynamic.d.ts" />
/// <reference path="../ts/declarations/document.d.ts" />

/// <amd-dependency path="vendor/typeahead" />

import $ = require('jquery');
import conf = require('conf');


/**
 *
 */
enum Visibility {
    VISIBLE, HIDDEN
}

/**
 *
 */
export interface CorplistItem {
    id?: string;
    name: string;
    type: string;
    corpus_id: string;
    canonical_id: string;
    subcorpus_id: string;
    corpora: Array<string>;
    description: string;
    featured: number;
    user_item: boolean;
    size: any;
}

/**
 *
 */
export interface CorplistItemClick {
    (corpId:string, corpName:string): void;
}

/**
 *
 */
export interface Options {

    /**
     * form's action attribute; if omitted then form's current one is used
     */
    formTarget?:string;

    /**
     * GET or POST; if omitted then form's current method is used
     */
    submitMethod?:string;

    /**
     * Using custom action disables implicit form submission which means
     * formTarget and submitMethod options have no effect unless you use
     * them directly in some way.
     */
    itemClickAction?:CorplistItemClick;

    /**
     * A HTML class to be used for widget's wrapping container.
     * If omitted then 'corplist-widget' is used.
     */
    widgetClass?:string;

    /**
     *
     * @param widget
     */
    onHide?:(widget:Corplist)=>void;

    /**
     *
     * @param widget
     */
    onShow?:(widget:Corplist)=>void;
}

/**
 *
 * @param select
 * @returns {Array<CorplistItem>}
 */
function fetchDataFromSelect(select:HTMLElement):Array<CorplistItem> {
    var elm:JQuery = $(select),
        ans:Array<CorplistItem> = [];

    elm.find('option').each(function () {
        var itemData = $(this).data('item');
        ans.push(itemData);
    });
    return ans;
}

/**
 *
 */
export interface WidgetTab {
    show():void;
    hide():void;
    getFooter():JQuery;
}


interface SearchResponse {
    name: string;
    favorite: boolean;
    canonical_id: string;
    raw_size: number;
    path: string;
    desc: string;
    id: string;
    size: number;
}

/**
 *
 */
export class WidgetMenu {

    widget:Corplist;

    menuWrapper:JQuery;

    searchBox:Search;

    favoriteBox:Favorites;

    funcMap:{[name:string]: WidgetTab};

    currentBoxId:string;

    static SEARCH_WIDGET_ID:string = 'search';
    static MY_ITEMS_WIDGET_ID:string = 'my-corpora';

    static TAB_KEY = 9;

    /**
     *
     * @param widgetWrapper
     */
    constructor(widget:Corplist) {
        this.widget = widget;
        this.menuWrapper = $('<div class="menu"></div>');
        $(this.widget.getWrapperElm()).append(this.menuWrapper);
        this.funcMap = {};
    }

    /**
     *
     * @param ident
     * @returns {*}
     */
    getTabByIdent(ident:string):WidgetTab {
        return this.funcMap[ident];
    }

    /**
     *
     */
    reset():void {
        var self = this;
        this.menuWrapper.find('a').each(function () {
            $(this).removeClass('current');
            self.getTabByIdent($(this).data('func')).hide();
        });
    }

    /**
     *
     * @param trigger
     */
    setCurrent(trigger:HTMLElement):void;
    setCurrent(trigger:string):void;
    setCurrent(trigger:any) {
        var triggerElm:HTMLElement,
            newActiveWidget:WidgetTab;

        if (typeof trigger === 'string') {
            triggerElm = $(this.menuWrapper).find('a[data-func="' + trigger + '"]').get(0);

        } else {
            triggerElm = trigger;
        }

        this.reset();
        $(triggerElm).addClass('current');
        newActiveWidget = this.getTabByIdent($(triggerElm).data('func'));
        newActiveWidget.show();
        this.widget.setFooter(newActiveWidget.getFooter());
        this.currentBoxId = $(triggerElm).data('func');
    }

    getCurrent():WidgetTab {
        return this.getTabByIdent(this.currentBoxId);
    }

    /**
     *
     * @param searchBox
     * @param favoriteBox
     */
    init(searchBox:Search, favoriteBox:Favorites):void {
        var self = this;
        this.menuWrapper.append('<a data-func="my-corpora">my list</a> | <a data-func="search">search</a>');
        this.favoriteBox = favoriteBox;
        this.searchBox = searchBox;
        this.funcMap[WidgetMenu.MY_ITEMS_WIDGET_ID] = this.favoriteBox; // TODO attributes vs. this map => redundancy & design flaw
        this.funcMap[WidgetMenu.SEARCH_WIDGET_ID] = this.searchBox;
        this.setCurrent(WidgetMenu.MY_ITEMS_WIDGET_ID);

        this.menuWrapper.find('a').on('click', function (e:any) {
            self.setCurrent(e.currentTarget);
        });

        $(window.document).on('keyup.quick-actions', function (e:JQueryEventObject) {
            if (self.currentBoxId === WidgetMenu.MY_ITEMS_WIDGET_ID
                    && e.keyCode == WidgetMenu.TAB_KEY) {
                self.setCurrent(WidgetMenu.SEARCH_WIDGET_ID);
            }
        });
    }
}

/**
 *
 */
export class Search implements WidgetTab {

    pageModel:model.FirstFormPage;

    widgetWrapper:HTMLElement;

    itemClickCallback:CorplistItemClick;

    wrapper:HTMLElement;

    srchField:HTMLElement;

    bloodhound:Bloodhound<string>;  // Typeahead's suggestion engine

    /**
     *
     * @param widgetWrapper
     */
    constructor(pageModel:model.FirstFormPage, widgetWrapper:HTMLElement, itemClickCallback:CorplistItemClick) {
        this.pageModel = pageModel;
        this.widgetWrapper = widgetWrapper;
        this.itemClickCallback = itemClickCallback;
        this.wrapper = window.document.createElement('div');
        $(this.widgetWrapper).append(this.wrapper);
    }

    show():void {
        $(this.wrapper).show();
        $(this.srchField).focus();
    }

    hide():void {
        $(this.wrapper).hide();
    }

    private initLabels():void {
        var div = window.document.createElement('div'),
            self = this;

        $(this.wrapper).append(div);
        $(div).addClass('labels');
        $.each(conf.corporaLabels, function (i, item) {
            var link = window.document.createElement('a');
            $(div).append(link);
            $(link).append(item[0]).addClass('keyword');
            if (item[2] === 1) {
                $(link).addClass('featured');
                $(link).attr('title', 'featured'); // TODO translation

            } else if (item[2] === 2) {
                $(link).addClass('favorite');
                $(link).attr('title', 'favorite'); // TODO translation
            }
            $(link).attr('data-srchkey', item[1]);
            $(link).on('click', function () {
                $(self.srchField).val('#' + $(link).data('srchkey'));
                // this forces Typeahead to act like if user changed input manually
                $(self.srchField).trigger('input');
                $(self.srchField).focus();
            });
            if (i < conf.corporaLabels.length - 1) {
                $(div).append(' ');
            }
        });
    }

    private initTypeahead():void {
        var self = this;
        var remoteOptions:Bloodhound.RemoteOptions<string> = {
            'url' : self.pageModel.getConf('rootURL') + 'corpora/ajax_list_corpora?query=%QUERY'
        };
        var bhOptions:Bloodhound.BloodhoundOptions<string> = {
            datumTokenizer: function(d) {
                return Bloodhound.tokenizers.whitespace(d.name);
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: remoteOptions,
            limit: 100 // TODO configurable
        };
        this.bloodhound = new Bloodhound(bhOptions);
        this.bloodhound.initialize();

        var options:Twitter.Typeahead.Options = {
            name: 'corplist',
            hint: true,
            highlight: true,
            minLength: 2
        };


        $(this.srchField).typeahead(options, {
            displayKey : 'name',
            source : this.bloodhound.ttAdapter(),
            templates: {
                suggestion: function (item:SearchResponse) {
                    var ans,
                        link = window.document.createElement('a');

                    ans = $('<p>' + item.name + ' <span class="num">(size: ~' + item.raw_size + ')</span> </p>'); // TODO translate

                    if (item.favorite) {
                        $(link).addClass('is-fav');

                    } else {
                        $(link).addClass('not-fav');
                    }
                    $(link)
                        .attr('title', 'In my favorites? (click to change)') // TODO translate
                        .append('<img src="' + conf.staticUrl + 'img/transparent_16x16.gif" />')
                        .on('click', function (event:JQueryEventObject) {
                            var reqData:any = {},
                                favState:boolean;

                            event.preventDefault();
                            event.stopPropagation();
                            if ($(link).hasClass('is-fav')) {
                                $(link).removeClass('is-fav').addClass('not-fav');
                                favState = false;

                            } else {
                                $(link).removeClass('not-fav').addClass('is-fav');
                                favState = true;
                            }
                            reqData[item.canonical_id] = favState;

                            self.pageModel.ajax('set_favorite_corp',
                                {
                                    method : 'POST',
                                    data : {'data': JSON.stringify(reqData)},
                                    success : function () {
                                        self.bloodhound.clearRemoteCache();

                                    },
                                    error : function () {
                                        self.bloodhound.clearRemoteCache();
                                        self.pageModel.showMessage('error', 'Failed to (un)set item as favorite');
                                    }
                                }
                            );

                            return false;
                        });
                    ans.append(link);
                    return ans;
                }
            }
        });

        $(this.srchField).on('typeahead:selected', function (x, suggestion:{[k:string]:any}) {
            self.itemClickCallback(suggestion['id'], suggestion['name']);
        });
    }

    /**
     *
     */
    init():void {
        var jqWrapper = $(this.wrapper),
            inputWrapper = window.document.createElement('div');

        this.initLabels();
        this.srchField = window.document.createElement('input');
        $(this.srchField)
            .addClass('corp-search')
            .attr('type', 'text')
            .attr('placeholder', '#label or name');
        jqWrapper.append(inputWrapper);
        $(inputWrapper).append(this.srchField).addClass('srch-box');
        this.initTypeahead();
        this.hide();
    }

    /**
     *
     * @returns {}
     */
    getFooter():JQuery {
        return $();
    }
}

/**
 *
 */
export class Favorites implements WidgetTab {

    pageModel:model.FirstFormPage;

    widgetWrapper:HTMLElement;

    data:Array<CorplistItem>;

    wrapper:HTMLElement;

    itemClickCallback:CorplistItemClick;

    /**
     *
     * @param widgetWrapper
     */
    constructor(pageModel:model.FirstFormPage, widgetWrapper:HTMLElement, data:Array<CorplistItem>,
                itemClickCallback?:CorplistItemClick) {
        this.pageModel = pageModel;
        this.widgetWrapper = widgetWrapper;
        this.data = data;
        this.itemClickCallback = itemClickCallback;
        this.wrapper = window.document.createElement('table');
        $(this.wrapper).addClass('favorite-list')
            .append('<tr><th colspan="2">' + this.pageModel.translate('favorite items') + '</th></tr>');
        $(this.widgetWrapper).append(this.wrapper);
    }

    containsItem(item:CorplistItem) {
        for (var i = 0; i < this.data.length; i += 1) {
            console.log(this.data[i]);
            if (this.data[i].id == item.id) {
                return true;
            }
        }
        return false;
    }

    generateItemUrl(itemData):string {
        var rootPath = this.pageModel.createActionUrl('/first_form'),
            params = ['corpname=' + itemData.corpus_id];

        if (itemData.type === 'subcorpus') {
            params.push('usesubcorp=' + itemData.subcorpus_id);
        }
        if (itemData.type === 'aligned_corpora') {
            for (var i = 0; i < itemData.corpora.length; i++) {
                params.push('sel_aligned=' + itemData.corpora[i].corpus_id);
            }
        }
        return rootPath + '?' + params.join('&');
    }

    /**
     *
     */
    init() {
        var jqWrapper = $(this.wrapper),
            self = this;

        $.each(this.data, function (i, item) {
            var isFeatured = false; //item.featured; TODO
            jqWrapper.append('<tr><td><a class="' + (isFeatured ? 'corplist-item featured' : 'corplist-item') + '"'
                + ' title="' + item.description + '"'
                + ' href="' + self.generateItemUrl(item)
                + '" data-id="' + item.corpus_id + '">' + item.name + '</a></td>'
                + '<td class="num">~' + item.size + '</td></tr>'); // TODO translate
        });

        jqWrapper.find('a.corplist-item').each(function() {
            $(this).on('click', function (e:Event) {
                if (typeof self.itemClickCallback === 'function') {
                    self.itemClickCallback($(e.currentTarget).data('id'), $(e.currentTarget).data('name'));
                    e.stopPropagation();
                    e.preventDefault();
                }
            });
        });
    }

    show():void {
        $(this.wrapper).show();
    }

    hide():void {
        $(this.wrapper).hide();
    }

    getFooter():JQuery {
        return $('<span>' + this.pageModel.translate('hit [Tab] to start a search') + '</span>');
    }
}

/**
 *
 */
export class StarSwitch {

    pageModel:model.FirstFormPage;

    triggerElm:HTMLElement;

    itemId:string;

    constructor(pageModel:model.FirstFormPage, triggerElm:HTMLElement) {
        this.pageModel = pageModel;
        this.triggerElm = triggerElm;
        this.itemId = $(this.triggerElm).data('item-id');
    }

    setItemId(id:string):void {
        this.itemId = id;
        $(this.triggerElm).attr('data-item-id', id);
    }

    getItemId():string {
        return this.itemId;
    }

    setStarState(state:boolean):void {
        if (state === true) {
            $(this.triggerElm)
                .attr('src', this.pageModel.createStaticUrl('img/starred_24x24.png'))
                .addClass('starred');

        } else {
            $(this.triggerElm)
                .attr('src', this.pageModel.createStaticUrl('img/starred_24x24_grey.png'))
                .removeClass('starred');
        }
    }

    isStarred():boolean {
        return $(this.triggerElm).hasClass('starred');
    }
}


/**
 *
 */
export class StarComponent {

    favoriteItemsTab:Favorites;

    pageModel:model.FirstFormPage;

    starSwitch:StarSwitch;

    /**
     *
     */
    onAlignedCorporaAdd = (corpname:string) => {
        var currPageItem = this.extractItemFromPage(0);
        console.log('StarComponent detected added aligned corpora: ', corpname); // TODO
    };

    /**
     *
     */
    onAlignedCorporaRemove = (corpname:string) => {
        var currPageItem = this.extractItemFromPage(0);
        console.log('StarComponent detected removed aligned corpora: ', corpname); // TODO
    };

    /**
     *
     */
    onSubcorpChange = (subcname:string) => {
        var newItem:CorplistItem;

        this.starSwitch.setStarState(false);
        newItem = this.extractItemFromPage(1);
        console.log('new subc: ', subcname);
        console.log('new item: ', newItem);
    };

    /**
     *
     * @param favoriteItemsTab
     * @param pageModel
     */
    constructor(favoriteItemsTab:Favorites, pageModel:model.FirstFormPage) {
        this.favoriteItemsTab = favoriteItemsTab;
        this.pageModel = pageModel;
        this.starSwitch = new StarSwitch(this.pageModel, $('#mainform div.starred img').get(0));
    }

    /**
     *
     * @param flag
     */
    setFavorite(flag:number) {
        var self = this,
            prom:JQueryXHR,
            newItem:CorplistItem,
            message:string,
            postDispatch:(data:any)=>void;


        if (flag === 1) {
            newItem = this.extractItemFromPage(flag);
            prom = $.ajax(this.pageModel.getConf('rootPath') + 'user/set_favorite_item',
                {method: 'POST', data: newItem, dataType: 'json'});
            message = self.pageModel.translate('item added to favorites');
            postDispatch = function (data) {
                self.starSwitch.setItemId(data.id);
            };

        } else {
            prom = $.ajax(this.pageModel.getConf('rootPath') + 'user/unset_favorite_item',
                {method: 'POST', data: {id: self.starSwitch.getItemId()}, dataType: 'json'});
            message = self.pageModel.translate('item removed from favorites');
            postDispatch = function (data) {
                self.starSwitch.setItemId(null);
            };
        }

        prom.then(
            function (data) {
                if (!data.error) {
                    self.pageModel.showMessage('info', message);
                    postDispatch(data);

                } else {
                    self.pageModel.showMessage('error', self.pageModel.translate('failed to update item'));
                }
            },
            function (err) {
                self.pageModel.showMessage('error', self.pageModel.translate('failed to update item'));
            }
        );
    }

    /**
     * Based on passed arguments, the method infers whether they match corpus user object, subcorpus
     * user object or aligned corpora user object.
     *
     * @param corpus_id regular identifier of a corpus
     * @param subcorpus_id name of a subcorpus
     * @param aligned_corpora list of aligned corpora
     * @returns an initialized CorplistItem or null if no matching state is detected
     */
    private inferItemCore(corpus_id:string, subcorpus_id:string, aligned_corpora:Array<string>):CorplistItem {
        var ans:CorplistItem;

        if (corpus_id) {
            ans = {
                id: null, name: null, type: null, corpus_id: null, canonical_id: null,
                subcorpus_id: null, corpora: null, description: null, featured: null,
                size: null, user_item: null
            };
            ans.corpus_id = corpus_id; // TODO canonical vs. regular
            ans.canonical_id = corpus_id;

            if (subcorpus_id) {
                ans.type = 'subcorpus';
                ans.subcorpus_id = subcorpus_id;
                ans.id = ans.corpus_id + ':' + ans.subcorpus_id;
                ans.name = ans.id; // TODO

            } else if (aligned_corpora.length > 0) {
                ans.type = 'aligned_corpora';
                ans.id = [ans.corpus_id].concat(aligned_corpora).join('+');
                ans.name = ans.id; // TODO
                ans.corpora = aligned_corpora;

            } else {
                ans.type = 'corpus';
                ans.id = ans.canonical_id;
                ans.name = ans.canonical_id;
            }
            return ans;

        } else {
            return null;
        }
    }

    /**
     * According to the state of the current query form, this method creates
     * a new CorplistItem instance with proper type, id, etc.
     */
    extractItemFromPage(userItemFlag:number):CorplistItem {
        var corpName:string,
            subcorpName:string = null,
            alignedCorpora:Array<string> = [],
            item:CorplistItem;

        corpName = this.pageModel.getConf('corpname');
        if ($('#subcorp-selector').length > 0) {
            subcorpName = $('#subcorp-selector').val();
        }
        $('fieldset.parallel .parallel-corp-lang:visible').each(function () {
            alignedCorpora.push($(this).find('input[type="hidden"][name="sel_aligned"]').val());
        });
        item = this.inferItemCore(corpName, subcorpName, alignedCorpora);
        item.featured = userItemFlag;
        return item;
    }

    /**
     *
     */
    init():void {
        var self = this;

        $('#mainform .starred img').on('click', function (e) {
            if (!self.starSwitch.isStarred()) {
                self.starSwitch.setStarState(true);
                self.setFavorite(1);

            } else {
                self.starSwitch.setStarState(false);
                self.setFavorite(0);
            }
        });

        this.pageModel.registerOnSubcorpChangeAction(this.onSubcorpChange);
        this.pageModel.registerOnAddParallelCorpAction(this.onAlignedCorporaAdd);
        this.pageModel.registerOnRemoveParallelCorpAction(this.onAlignedCorporaRemove);
    }
}


/**
 *
 */
export class Corplist {

    selectElm:HTMLElement;

    jqWrapper:JQuery;

    triggerButton:HTMLElement;

    options:Options;

    widgetWrapper:HTMLElement;

    private data:Array<CorplistItem>;

    private pageModel:model.FirstFormPage;

    private visible:Visibility;

    private widgetClass:string;

    private currCorpname:string;

    private currCorpIdent:string;

    private hiddenInput:HTMLElement;

    private parentForm:HTMLElement;

    private mainMenu:WidgetMenu;

    searchBox:Search;

    favoritesBox:Favorites;

    private footerElm:HTMLElement;

    onHide:(widget:Corplist)=>void;

    onShow:(widget:Corplist)=>void;


    onItemClick:CorplistItemClick = (corpusId:string, corpusName:string) => {
        $(this.hiddenInput).val(corpusId);
        this.setButtonLabel(corpusName);

        if (this.options.itemClickAction) {
            this.options.itemClickAction.call(this, corpusId);

        } else {
            if (this.options.formTarget) {
                $(this.parentForm).attr('action', this.options.formTarget);
            }
            if (this.options.submitMethod) {
                $(this.parentForm).attr('method', this.options.submitMethod);
            }
            $(this.parentForm).submit();
        }
    };

    /**
     *
     * @param options
     */
    constructor(options:Options, data:Array<CorplistItem>, pageModel:model.FirstFormPage, parentForm:HTMLElement) {
        this.options = options;
        this.data = data;
        this.pageModel = pageModel;
        this.parentForm = parentForm;
        this.currCorpIdent = pageModel.getConf('corpname');
        this.currCorpname = pageModel.getConf('humanCorpname');
        this.visible = Visibility.HIDDEN;
        this.widgetClass = this.options.widgetClass ? this.options.widgetClass : 'corplist-widget';
        this.onHide = this.options.onHide ? this.options.onHide : null;
        this.onShow = this.options.onShow ? this.options.onShow : null;
    }

    /**
     *
     * @param contents
     */
    setFooter(contents:JQuery) {
        $(this.footerElm).empty().append(contents);
    }

    /**
     *
     */
    onButtonClick = (e:Event) => {
        this.switchComponentVisibility();
        e.preventDefault();
        e.stopPropagation();
    };

    /**
     *
     */
    bindOutsideClick():void {
        var self = this;

        $(window.document).bind('click', function (event) {
            self.switchComponentVisibility(Visibility.HIDDEN);
        });

        $(this.widgetWrapper).on('click', function (e:Event) {
            e.stopPropagation();
        });
    }

    /**
     *
     * @param state
     */
    private switchComponentVisibility(state?:Visibility) {
        if (state === Visibility.HIDDEN || state === undefined && this.visible === Visibility.VISIBLE) {
            this.visible = Visibility.HIDDEN;
            $(this.widgetWrapper).hide();
            if (typeof this.onHide === 'function') {
                this.onHide.call(this, this);
            }

        } else if (state === Visibility.VISIBLE || state === undefined && this.visible === Visibility.HIDDEN) {
            this.visible = Visibility.VISIBLE;
            $(this.widgetWrapper).show();
            // even if the tab is 'current' we call this to make sure it is initialized properly
            this.mainMenu.getCurrent().show();
            if (typeof this.onShow === 'function') {
                this.onShow.call(this, this);
            }
        }
    }

    /**
     *
     */
    public hide():void {
        this.switchComponentVisibility(Visibility.HIDDEN);
    }

    /**
     *
     */
    public show():void {
        this.switchComponentVisibility(Visibility.VISIBLE);
    }

    /**
     *
     */
    private buildWidget() {
        var jqSelectBoxItem = $(this.selectElm);

        this.triggerButton = window.document.createElement('button');
        $(this.triggerButton).attr('type', 'button').text(this.currCorpname);
        jqSelectBoxItem.replaceWith(this.triggerButton);

        this.widgetWrapper = window.document.createElement('div');
        $(this.triggerButton).after(this.widgetWrapper);

        this.hiddenInput = window.document.createElement('input');
        $(this.hiddenInput).attr({
            'type': 'hidden',
            'name': jqSelectBoxItem.attr('name'),
            'value': this.currCorpIdent
        });
        $(this.widgetWrapper).append(this.hiddenInput);

        this.jqWrapper = $(this.widgetWrapper);
        this.jqWrapper.addClass(this.widgetClass);

        // main menu
        this.mainMenu = new WidgetMenu(this);

        // search func
        this.searchBox = new Search(this.pageModel, this.jqWrapper.get(0), this.onItemClick);
        this.searchBox.init();

        this.favoritesBox = new Favorites(this.pageModel, this.widgetWrapper, this.data);
        this.favoritesBox.init();

        this.footerElm = window.document.createElement('div');
        $(this.footerElm).addClass('footer');
        $(this.widgetWrapper).append(this.footerElm);

        // menu initialization
        this.mainMenu.init(this.searchBox, this.favoritesBox);

        this.jqWrapper.css({
            position: 'absolute'
        });

        this.bindOutsideClick();
        $(this.triggerButton).on('click', this.onButtonClick);
        this.switchComponentVisibility(Visibility.HIDDEN);
    }

    /**
     *
     */
    setButtonLabel(label:string) {
        $(this.triggerButton).text(label);
    }

    /**
     *
     * @param selectElm
     */
    bind(selectElm:HTMLElement):void {
        this.selectElm = selectElm;
        this.buildWidget();
    }

    getWrapperElm():HTMLElement {
        return this.widgetWrapper;
    }
}

/**
 *
 * @param selectElm
 * @param options
 */
export function create(selectElm:HTMLElement, pageModel:model.FirstFormPage, options:Options):Corplist {
    var corplist:Corplist,
        data:Array<CorplistItem>;

    data = fetchDataFromSelect(selectElm);
    corplist = new Corplist(options, data, pageModel, $(selectElm).closest('form').get(0));
    corplist.bind(selectElm);
    return corplist;
}


/**
 *
 * @param pageModel
 * @returns {StarComponent}
 */
export function createStarComponent(corplistWidget:Corplist, pageModel:model.FirstFormPage):StarComponent {
    var component:StarComponent;

    component = new StarComponent(corplistWidget.favoritesBox, pageModel);
    component.init();
    return component;
}