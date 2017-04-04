define(["dojo/_base/array"], function (dojoArray) {
    "use strict";
    return (function () {
        function Aggregate(domNode) {
            this.domNode = domNode;
        }
        Aggregate.prototype._sum = function (objects, attribute) {
            if (!objects.length)
                return '';
            var result = mx.parser.parseValue('0.0', 'decimal');
            dojoArray.forEach(objects, function (object) {
                var val = mx.parser.parseValue(object.get(attribute) + '', 'decimal');
                if (!isNaN(val) && (val !== null))
                    result = result.plus(val);
            });
            return mx.parser.formatValue(result, 'decimal');
        };
        Aggregate.prototype._avg = function (objects, attribute) {
            if (!objects.length)
                return '';
            var result = mx.parser.parseValue('0.0', 'decimal');
            dojoArray.forEach(objects, function (object) {
                var val = mx.parser.parseValue(object.get(attribute) + '', 'decimal');
                if (!isNaN(val) && (val !== null))
                    result = result.plus(val);
            });
            return mx.parser.formatValue(result / objects.length, 'decimal');
        };
        Aggregate.prototype._min = function (objects, attribute) {
            if (!objects.length)
                return '';
            var result = '';
            dojoArray.forEach(objects, function (object) {
                var decimal = mx.parser.parseValue(object.get(attribute) + '', 'decimal');
                if (isNaN(decimal) || (decimal == null))
                    return;
                if (result == '')
                    result = decimal;
                if (result > decimal)
                    result = decimal;
            });
            return result == '' ? '' : mx.parser.formatValue(result, 'decimal');
        };
        Aggregate.prototype._max = function (objects, attribute) {
            if (!objects.length)
                return '';
            var result = '';
            dojoArray.forEach(objects, function (object) {
                var decimal = mx.parser.parseValue(object.get(attribute) + '', 'decimal');
                if (isNaN(decimal) || (decimal == null))
                    return;
                if (result == '')
                    result = decimal;
                if (result < decimal)
                    result = decimal;
            });
            return result == '' ? '' : mx.parser.formatValue(result, 'decimal');
        };
        Aggregate.prototype._placeValuesInFooter = function (elementClass, avg, max, min, sum, title) {
            dojo.place(mxui.dom.create('td', { class: "meta-grid-aggregate meta-grid-avg meta-grid-" + elementClass, title: title ? title : "avg" }, avg + ''), this.avgFooter);
            dojo.place(mxui.dom.create('td', { class: "meta-grid-aggregate meta-grid-max meta-grid-" + elementClass, title: title ? title : "max" }, max + ''), this.maxFooter);
            dojo.place(mxui.dom.create('td', { class: "meta-grid-aggregate meta-grid-min meta-grid-" + elementClass, title: title ? title : "min" }, min + ''), this.minFooter);
            dojo.place(mxui.dom.create('td', { class: "meta-grid-aggregate meta-grid-sum meta-grid-" + elementClass, title: title ? title : "sum" }, sum + ''), this.sumFooter);
        };
        Aggregate.prototype.renderFooter = function (objects, columns, foreignReferences, entity, systemColumnsAttribute) {
            this.avgFooter = mxui.dom.create('tr', { class: "meta-grid-footer meta-grid-avg" });
            this.maxFooter = mxui.dom.create('tr', { class: "meta-grid-footer meta-grid-max" });
            this.minFooter = mxui.dom.create('tr', { class: "meta-grid-footer meta-grid-min" });
            this.sumFooter = mxui.dom.create('tr', { class: "meta-grid-footer meta-grid-sum" });
            this.footer = mxui.dom.create('tfoot', { class: "meta-grid-footer" }, this.avgFooter, this.minFooter, this.maxFooter, this.sumFooter);
            dojo.place(this.footer, this.domNode);
            this._placeValuesInFooter('number', '', '', '', '', '');
            if (systemColumnsAttribute.get()) {
                this._placeValuesInFooter('id', '', '', '', '');
            }
            var systemColumns = ['changedDate', 'createdDate', 'System.owner', 'System.changedBy', 'id'];
            for (var index = 0; index < columns.length; index++) {
                var name_1 = columns[index];
                if (systemColumnsAttribute.get()
                    || (systemColumns.indexOf(name_1) == -1))
                    if (foreignReferences[name_1]) {
                        this._placeValuesInFooter(columns[index], '--', '--', '--', '--');
                    }
                    else if ((systemColumnsAttribute.get()
                        && (systemColumns.indexOf(columns[index]) == -1)) &&
                        entity.isNumeric(columns[index])) {
                        console.log("##" + columns[index]);
                        this._placeValuesInFooter(columns[index], this._avg(objects, columns[index]), this._max(objects, columns[index]), this._min(objects, columns[index]), this._sum(objects, columns[index]));
                    }
                    else {
                        this._placeValuesInFooter(columns[index], '--', '--', '--', '--');
                    }
            }
            if (systemColumnsAttribute.get()) {
                if (entity.hasSuperEntities()) {
                    this._placeValuesInFooter('super', '', '', '', '');
                }
                if (entity.hasSubEntities()) {
                    this._placeValuesInFooter('sub', '', '', '', '');
                }
            }
        };
        return Aggregate;
    }());
});
//# sourceMappingURL=aggregate.js.map