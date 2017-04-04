define(["dojo/_base/array"], function (dojoArray) {
    "use strict";
    return (function () {
        function XPath(domNode, show) {
            this.xPaths = [];
            this.show = false;
            this.domNode = domNode;
            this.domNode.style.display = 'none';
            this.show = show;
        }
        XPath.prototype.addXpath = function (entity, criteria, association) {
            entity = entity || '';
            criteria = criteria || '';
            association = association || '';
            var level = this.xPaths.length - 1;
            this.setPathLevel(level);
            this.xPaths.push({
                entity: entity,
                criteria: criteria,
                association: association
            });
            this.writePath();
        };
        XPath.prototype.writePath = function () {
            this.domNode.style.display = this.show ? '' : 'none';
            if (!this.xPaths.length)
                return;
            var xpaths = '';
            this.xPaths.forEach(function (xpath, index) {
                if (xpath.association)
                    xpaths += "/" + xpath.association;
                xpaths += (index ? '/' : '') + xpath.entity;
                if (xpath.criteria)
                    xpaths += "[" + xpath.criteria + "]";
            });
            this.domNode.innerHTML = xpaths;
        };
        XPath.prototype.flush = function () {
            this.setPathLevel(-1);
        };
        XPath.prototype.level = function () {
            return this.xPaths.length;
        };
        XPath.prototype.setPathLevel = function (level) {
            for (var index = this.xPaths.length - 1; index > level; index--) {
                var history_1 = this.xPaths.pop();
            }
            this.writePath();
        };
        XPath.prototype.setCriteria = function (criteria, level) {
            level = level || this.xPaths.length - 1;
            this.xPaths[level].criteria = criteria;
            this.writePath();
        };
        XPath.prototype.setAssociation = function (association, level) {
            level = level || this.xPaths.length - 1;
            this.xPaths[level].association = association;
            this.writePath();
        };
        XPath.prototype.setEntity = function (entity, level) {
            level = level || this.xPaths.length - 1;
            this.xPaths[level].entity = entity;
            this.writePath();
        };
        XPath.prototype.setShow = function (show) {
            this.show = !!show;
        };
        return XPath;
    }());
});
//# sourceMappingURL=xpath.js.map