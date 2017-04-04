/*global logger*/
/*
 MetaGrid
 ========================

 @file      : MetaGrid.js
 @version   : 1.0.0
 @author    : Herman Geldenhuys
 @date      : 9/12/2016
 @copyright : Herman Geldenhuys
 @license   : Apache 2

 Documentation
 ========================
 Describe your widget here.
 */

declare const mx;
declare const mxui;
declare const define;
declare const dojo;
declare const require;

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/text!MetaGrid/widget/template/MetaGrid.html",
    "MetaGrid/lib/history",
    "MetaGrid/lib/xpath",
    "MetaGrid/lib/aggregate"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, widgetTemplate, History, XPath, Aggregate) {
    "use strict";

    // Declare widget's prototype.
    return declare("MetaGrid.widget.MetaGrid", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        gridNode: null,
        refreshButtonNode: null,
        historyNode: null,
        xpathNode: null,
        entityName: "",
        entityNameAttribute: {},
        pageOfNode: null,
        totalPagesNode: null,
        firstButtonNode: null,
        previousButtonNode: null,
        nextButtonNode: null,
        lastButtonNode: null,

        // Parameters configured in the Modeler.
        xpath: "",
        xpathAttribute: {},
        systemColumns: "",
        systemColumnsAttribute: {},
        systemColumnsDefault: true,
        associations: "",
        associationsAttribute: {},
        associationsDefault: true,
        noDataMessage: "No data found",
        offset: 0,
        offsetAttribute: {},
        offsetDefault: 0,
        showXPath: false,
        showXPathAttribute: {},
        showXPathDefault: false,
        limit: 20,
        limitAttribute: {},
        limitDefault: 20,
        pageSize: 0,
        pageSizeAttribute: {},
        pageSizeDefault: 5,
        showAggregateFooter: false,
        showAggregateFooterAttribute: {},
        showAggregateFooterDefault: false,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        currentPage: 0,

        sortAttr: 'id',
        sortDirection: 'asc',

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {

            this._updateRendering();
            this._setupEvents();

            this.history = new History(this.historyNode);
            this.xpathInstance = new XPath(this.xpathNode, false);
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {

            this._contextObj = obj;
            this._attributes = [];

            this._fetchAttributes(['xpath', 'systemColumns', 'associations',
                'offset', 'limit', 'entityName', 'showXPath', 'pageSize',
                'showAggregateFooter']);

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function() {},

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function() {},

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {},

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
            this._stopProgress();
        },


        //Start progress animation & Gray-out screen
        _startProgress: function() {
            if (!this.progressId) {
                this.progressId = mx.ui.showProgress();
                //mx.ui.showUnderlay();
            }
        },

        //Stop progress animation & Gray-out screen
        _stopProgress: function() {
            if (this.progressId) {
                //mx.ui.hideUnderlay();
                mx.ui.hideProgress(this.progressId);
                this.progressId = undefined;
            }
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function(e) {
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        navigateToReference: function(ids, reference, evt) {
            this._startProgress();
            this.sortAttr = 'id';
            this.sortDirection = 'asc';
            let criteria='';
            if (ids.length > 0) {
                criteria=`id='${ids.join("' or id='")}'`;
            }
            this.xpathInstance.addXpath(reference, criteria);
            mx.data.get({
                guids: ids,
                filter: {
                    sort: this.sortAttr=='id'?[]:[[this.sortAttr, this.sortDirection]],
                    offset: this.offsetAttribute.get(),
                    amount: this.limitAttribute.get()
                },
                callback: dojo.hitch(this, this._renderGrid),
                error: dojo.hitch(this, function (error) {
                    this._stopProgress();
                    console.error(error);
                })
            });
        },

        getOtherEntityForReference: function(entity, reference) {
            if (entity.getSelectorEntity(reference) != entity.getEntity())
                return entity.getSelectorEntity(reference);
            let entities = Object.keys(mx.meta.getMap());
            for (var i=0; i<entities.length;i++) {
                var lookup = mx.meta.getMap()[entities[i]];
                if (lookup.getEntity() != entity.getEntity())
                    if (lookup.getReferenceAttributes().indexOf(reference) > -1)
                        return lookup.getEntity();
            }
        },

        generateHeader: function (headerRow, columns, entity, systemColumns) {
            var header = mxui.dom.create('th', {class: "meta-grid-header"}, '#');
            dojo.place(header, headerRow);
            if (this.systemColumnsAttribute.get()) {
                var header = mxui.dom.create('th', {class: "meta-grid-header"}, 'id');
                dojo.place(header, headerRow);
            }
            for (var index = 0; index < columns.length; index++) {

                var title = columns[index],
                    tooltip = entity.getAttributeType(title),
                    isReference = ['ObjectReference', "ObjectReferenceSet"].indexOf(tooltip)>-1,
                    isAssociation = title.split('.').length > 1,
                    isSortColumn = this.sortAttr==title,
                    a = isAssociation ? title.split('.').reverse()[0] : mxui.dom.create('a', {'class':'sort-header ' +
                        (isSortColumn?(this.sortDirection):'')}, title),
                    header = mxui.dom.create('th', {
                        class: "meta-grid-header",
                        title: tooltip?(tooltip + (isReference?`:${this.getOtherEntityForReference(entity,title)}`:'')):"Referenced"
                    }, a);

                if (!isAssociation)
                    dojo.connect(a, 'onclick', dojo.hitch(this, function(column, evt) {

                        if (this.sortAttr!==column) {
                            this.sortDirection = 'asc';
                            this.sortAttr = column;
                        } else if (this.sortDirection == 'asc') {
                            this.sortDirection = 'desc';
                        } else {
                            this.sortDirection = 'asc';
                        }

                        this.skipHistory = true;
                        this.refreshData();
                    }, columns[index]));

                if (this.systemColumnsAttribute.get()
                    || (systemColumns.indexOf(title) == -1)) {
                    dojo.place(header, headerRow);
                }
            }
            if (this.systemColumnsAttribute.get()) {
                if (entity.hasSuperEntities()) {
                    var header = mxui.dom.create('th', {class: "meta-grid-header meta-grid-super-header",title:"Generalization"}, 'super()');
                    dojo.place(header, headerRow);
                }
                if (entity.hasSubEntities()) {
                    var header = mxui.dom.create('th', {class: "meta-grid-header meta-grid-sub-header", title:"Specialization"}, 'sub()');
                    dojo.place(header, headerRow);
                }
            }

            return header;
        },

        // Does the query to the server and triggers the _renderGrid, using either xpath or guids
        _fetchDataForGrid: function (guids, xpath, overrideEntity) {
            this._startProgress();

            mx.data.get({
                xpath: xpath,
                guids: guids,
                filter: {
                    sort: this.sortAttr=='id'?[]:[[this.sortAttr, this.sortDirection]],
                    offset: this.offsetAttribute.get(),
                    amount: this.limitAttribute.get()
                },
                callback: dojo.hitch(this, dojo.hitch(this, function(overrideEntity, objects, aggregates) {
                    this.xpathInstance.setCriteria('');
                    this._renderGrid(objects, aggregates, overrideEntity);

                }, overrideEntity)),
                error: dojo.hitch(this, function (error) {
                    this._stopProgress();
                    console.error(error);
                })
            });
        },

        // Generates super/sub entity links
        _generateGenLinks: function(entities, entityClass, tableRow, guid, index) {
            var cellDiv = mxui.dom.create('div', {class: "meta-grid-cell-div", title:"Cast"});
            for (let index=0; index<entities.length; index++) {
                var div = mxui.dom.create('div', {class:"meta-grid-"+entityClass}, entities[index]);
                dojo.place(div, cellDiv);
                dojo.connect(div, "onclick", dojo.hitch(this, this._fetchDataForGrid,
                    null, '//' + entities[index] + '[id=\'' + guid + '\']', entities[index]));
            }
            var cell = mxui.dom.create('td', {class: "meta-grid-cell meta-grid-col-" + index + " meta-attr-id"}, cellDiv);
            dojo.place(cell, tableRow);
        },

        _updatePage: function(pageNumber?) {
            if (pageNumber!=undefined)
                this.currentPage = pageNumber;
            var rows = this.gridNode.querySelectorAll("tr.meta-grid-row");

            for (var index = 0; index < rows.length; index++) {
                var row = rows[index],
                    from = (this.currentPage*this.pageSizeAttribute.get()),
                    to = from + parseInt(this.pageSizeAttribute.get());
                row.style.display = ((index >= from) && (index < to))?'':'none';
            }
            this.totalPages = Math.ceil(rows.length/this.pageSizeAttribute.get());
            this.pageOfNode.innerHTML = this.currentPage+1;
            this.totalPagesNode.innerHTML = this.totalPages;
        },

        getEntityNameIfAtRootLevel() {
            return this.entityName //HasEntityName attribute configured
                && (this.history.level()==0) //Evaluate only when at root level
                && this.entityNameAttribute.get(); //Return this value
        },

        _renderLines: function (objects, entityName, overrideEntity, columns, entity, aggregates, headerRow, tbody) {
            let systemColumns = ['changedDate', 'createdDate', 'System.owner', 'System.changedBy'],
                odd = true,
                columnIndex = columns.length,
                objectMap = mx.meta.getMap(),
                objectKeys = Object.keys(objectMap);

            for (var idx = 0; idx < objectKeys.length; idx++) {
                var key = objectKeys[idx],
                    objectEntity = objectMap[key];

                dojoArray.forEach(objectEntity.getReferenceAttributes(), dojo.hitch(this, function (association, aidx) {
                    if (objectEntity.getSelectorEntity(association) === entityName) {
                        if (systemColumns.indexOf(association) > -1)
                            return;
                        if (columns.indexOf(association) == -1)
                            columns.push(association);
                        var possibleSuperEntity = this.foreignReferences[association];
                        if (objectEntity.getSuperEntities().indexOf(possibleSuperEntity) == -1)
                            this.foreignReferences[association] = objectEntity.getEntity();
                    }
                }));
            }

            this.generateHeader(headerRow, columns, entity, systemColumns);

            for (var objectIndex = 0; objectIndex < objects.length; objectIndex++) {
                let object = objects[objectIndex],
                    row = mxui.dom.create('tr', {class: "meta-grid-row " + (odd ? "odd" : "even"), index: objectIndex + 1});
                dojo.place(row, tbody);
                odd = !odd;

                var cell = mxui.dom.create('td', {class: "meta-grid-cell meta-grid-col-0 meta-attr-number"}, mxui.dom.create('div', {class: "meta-grid-cell-div"}, (objectIndex + 1)+''));
                dojo.place(cell, row);

                if (this.systemColumnsAttribute.get()) {
                    cell = mxui.dom.create('td', {class: "meta-grid-cell meta-grid-col-0 meta-attr-id"}, mxui.dom.create('div', {class: "meta-grid-cell-div"}, object.getGuid()));
                    dojo.place(cell, row);
                }

                for (var colIndex = 0; colIndex < columns.length; colIndex++) {
                    var name = columns[colIndex],
                        date = object.isDate(name) ? (new Date(object.get(name))) : null,
                        attr = object.get(name),
                        classes = "meta-grid-cell meta-grid-col-" + colIndex + "meta-attr-" + name,
                        tooltip = attr,
                        selectorEntity = this.getOtherEntityForReference(entity, name);

                    if (this.foreignReferences[name] && (entity.getEntity() !== entity.getSelectorEntity(name))) {
                        attr = mxui.dom.create('div', {
                            class: "meta-grid-reference-other " + name,
                            title: "Retrieve " + name
                        }, this._renderAssociation(this.foreignReferences[name]));
                        dojo.connect(attr, "onclick", dojo.hitch(this, function (xpath, reference, evt) {
                            this.xpathInstance.addXpath(reference);
                            let name = reference.split('.')[0];
                            this.sortAttr = 'id';
                            this.sortDirection = 'asc';
                            this.refreshData = dojo.hitch(this, this._fetchDataForGrid, null, xpath, this.foreignReferences[name]);
                            this._fetchDataForGrid(null, xpath, this.foreignReferences[name]);
                        }, '//' + this.foreignReferences[name] + '[' + name + "=" + object.getGuid() + "]", `${name}/${this.foreignReferences[name]}`));

                    } else if (date && !!object.get(name)) {
                        attr = date.getFullYear() + '/' + date.getMonth() + '/' + date.getDay() + ' '
                            + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.'
                            + date.getMilliseconds();
                        classes += ' meta-grid-date';
                        tooltip = date.toISOString();
                    } else if (object.isNumeric(name)) {
                        attr = attr.toString();
                        classes += " meta-grid-numeric";
                    } else if (object.isBoolean(name)) {
                        attr = attr ? "true" : "false";
                    } else if (object.isPassword(name)) {
                        tooltip = 'Hidden password';
                        attr = "*****";
                    } else if (object.isObjectReferenceSet(name) && attr.length) {
                        var result = mxui.dom.create('div', {class: "meta-grid-reference-set"});
                        dojo.place(this._renderAssociation(attr.length + ' record' + (attr.length > 1 ? 's' : '')), result);
                        attr = result;
                        this.refreshData = dojo.hitch(this, this.navigateToReference, object.get(name), `${name}/${selectorEntity}`);
                        dojo.connect(attr, "onclick", this.refreshData);
                    } else if (object.isObjectReference(name) && attr) {
                        var id = attr;
                        attr = mxui.dom.create('div', {class: "meta-grid-reference"}, this._renderAssociation(attr));
                        this.refreshData = dojo.hitch(this, this.navigateToReference, [id], `${name}/${selectorEntity}`);
                        dojo.connect(attr, "onclick", this.refreshData);
                    }
                    if ((attr == null) || (attr == undefined))
                        attr = mxui.dom.create('div', {class: "meta-grid-empty"}, "empty");

                    if (this.systemColumnsAttribute.get()
                        || (systemColumns.indexOf(name) == -1)) {
                        var cell = mxui.dom.create('td', {class: classes}, mxui.dom.create('div', {
                            class: "meta-grid-cell-div " + entity.getAttributeType(name),
                            title: tooltip
                        }, attr));
                        dojo.place(cell, row);
                    }
                }

                if (this.systemColumnsAttribute.get()) {
                    if (entity.hasSuperEntities()) {
                        columnIndex++;
                        this._generateGenLinks(entity.getSuperEntities(), 'super', row, object.getGuid(), columnIndex);
                    }

                    if (entity.hasSubEntities()) {
                        columnIndex++;
                        this._generateGenLinks(entity.getSubEntities(), 'sub', row, object.getGuid(), columnIndex);
                    }
                }
            }
        },

        _renderGrid: function(objects, aggregates, overrideEntity) {

            this._stopProgress();
            dojo.empty(this.gridNode);

            var table = mxui.dom.create('table', {class:'meta-grid-table' + (objects.length==1?' single':'') }),
                thead = mxui.dom.create('thead', {class:"meta-grid-thead"}),
                tbody = mxui.dom.create('tbody', {class:"meta-grid-tbody"}),
                headerRow = mxui.dom.create('tr', {class:"meta-grid-header-row"});

            this.aggregate = new Aggregate(table);
            dojo.place(table, this.gridNode);
            dojo.place(thead, table);
            dojo.place(tbody, table);
            dojo.place(headerRow, thead);
            this.foreignReferences = {};

            let entityNameDefault = objects.length?objects[0].getEntity():"!dead end!";

            let entityName = this.getEntityNameIfAtRootLevel() || overrideEntity || entityNameDefault

            this.xpathInstance.setPathLevel(this.history.level());

            if (!this.skipHistory)
                this.history.addHistory(entityName, dojo.hitch(this, this._renderGrid, objects, aggregates, overrideEntity), this);
            this.skipHistory = false;

            if (objects.length > 0) {
                let entity = mx.meta.getMap()[entityName],
                    columns = this.associationsAttribute.get() ? entity.getAttributes() : entity.getAttributesWithoutReferences();
                this._renderLines(objects, entityName, overrideEntity, columns, entity, aggregates, headerRow, tbody);
                if (this.showAggregateFooterAttribute.get())
                    this.aggregate.renderFooter(objects, columns, this.foreignReferences, entity, this.systemColumnsAttribute);

                this._updatePage(0);
                this.gridNode.scrollLeft = 0;
            } else {
                this.gridNode.innerHTML = "<div class='meta-grid-no-data'>" + this.noDataMessage + "</div>";
            }

        },

        _renderAssociation: function(id) {
            return mxui.dom.create('a', {class:"meta-grid-ref-link"}, id + " ");
        },

        // Attach events to HTML dom elements
        _setupEvents: function() {
            if (!this.buttonEvent) {
                this.buttonEvent =
                    dojo.connect(this.refreshButtonNode, "onclick", dojo.hitch(this, this._updateRendering));

                dojo.connect(this.firstButtonNode, 'onclick', dojo.hitch(this, function(event) {
                    this.currentPage = 0;
                    this._updatePage();
                }));
                dojo.connect(this.previousButtonNode, 'onclick', dojo.hitch(this, function(event) {
                    if (this.currentPage > 0) {
                        this.currentPage -= 1;
                        this._updatePage();
                    }
                }));
                dojo.connect(this.nextButtonNode, 'onclick', dojo.hitch(this, function(event) {
                    if (this.currentPage < this.totalPages-1) {
                        this.currentPage += 1;
                        this._updatePage();
                    }
                }));
                dojo.connect(this.lastButtonNode, 'onclick', dojo.hitch(this, function(event) {
                    this.currentPage = this.totalPages-1;
                    this._updatePage();
                }));
            }
        },

        // Rerender the interface.
        _updateRendering: function() {

            if (this._contextObj !== null) {
                this.history.flush();
                this.xpathInstance.flush();
                this.xpathInstance.setShow(this.showXPathAttribute.get());
                this.xpathInstance.addXpath(this.xpathAttribute.get());
                if (this.xpathAttribute.get()) {
                    this.refreshData = dojo.hitch(this, this._fetchDataForGrid, null, this.xpathAttribute.get());
                    this._fetchDataForGrid(null, this.xpathAttribute.get());
                } else {
                    this.domNode.innerHTML = '';
                }
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        // Handle validations.
        _handleValidation: function(validations) {
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.xpath);

            if (this.readOnly) {
                validation.removeAttribute(this.xpath);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.xpath);
            }
        },

        // Clear validations.
        _clearValidations: function() {
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function(message) {
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this.domNode, this._alertDiv);
        },

        // Add a validation.
        _addValidation: function(message) {
            this._showError(message);
        },

        _fetchAttributes: function(attributes) {
            if (this._contextObj && (attributes.length)) {
                var attribute = attributes.pop();

                // Optional attributes
                if (!this[attribute]) {
                    this[attribute+"Attribute"] = {
                        get: dojo.hitch(this, function (defaultValue) {
                            return defaultValue;
                        }, this[attribute+"Default"]),
                        set: function () {}
                    }
                } else if (this[attribute].indexOf('/') == -1) {
                    this._createAttribute(this._contextObj, attribute);
                } else {
                    var parts = this.codeAttribute.split('/'),
                        attribute = parts.pop();
                    this._contextObj.fetch(this[attribute+'Object'].path, dojo.hitch(this, function (attribute, path, object) {
                        this._createAttribute(object, attribute, path);
                    }, attribute. parts.join('/')));
                }
                this._fetchAttributes(attributes);
                // Finished parsing attributes, can render now..
            } else if (this._contextObj) {
                this._resetSubscriptions();
                this._updateRendering();
            }
        },

        // Helper method to create attribute
        _createAttribute: function (object, attribute, path) {
            var attributeObject = {
                get: function() {
                    return this.object.get(this.attribute);
                },
                set: function(value) {
                    return this.object.set(this.attribute, value);
                },
                path: '',
                attribute:'',
                object:{}
            };
            attributeObject.path = path;
            attributeObject.attribute = this[attribute];
            attributeObject.object = object;
            this[attribute+'Attribute'] = attributeObject;
            this._attributes.push(attributeObject);
        },

        // Reset subscriptions.
        _resetSubscriptions: function() {
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this._handles.push(this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid) {
                        this._updateRendering();
                    })
                }));

                this._handles.push(this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.xpath,
                    callback: dojoLang.hitch(this, function(guid, attr, attrValue) {
                        this._updateRendering();
                    })
                }));

                this._handles.push(this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                }));
            }
        }
    });
});

require(["MetaGrid/widget/MetaGrid"], function() {
    "use strict";
});
