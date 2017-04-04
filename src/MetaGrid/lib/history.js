define(["dojo/_base/array"], function (dojoArray) {
    "use strict";
    return (function () {
        function History(domNode) {
            this.history = [];
            this.domNode = domNode;
        }
        History.prototype.addHistory = function (label, onclick, widget) {
            var historyDiv = mxui.dom.create('div', { class: "meta-grid-history-path" }, label), handle = dojo.connect(historyDiv, 'onclick', dojo.hitch(this, function (callback, level, event) {
                this.clearHistoryAboveLevel(level - 1);
                widget.sortDirection = 'asc';
                widget.sortAttr = 'id';
                onclick();
            }, onclick, this.history.length));
            this.history.push({
                label: label,
                dom: historyDiv,
                handle: handle
            });
            dojo.place(historyDiv, this.domNode);
        };
        History.prototype.flush = function () {
            this.clearHistoryAboveLevel(-1);
        };
        History.prototype.level = function () {
            return this.history.length;
        };
        History.prototype.clearHistoryAboveLevel = function (level) {
            for (var index = this.history.length - 1; index > level; index--) {
                var history_1 = this.history.pop();
                dojo.disconnect(history_1.handle);
                dojo.destroy(history_1.dom);
            }
        };
        return History;
    }());
});
//# sourceMappingURL=history.js.map