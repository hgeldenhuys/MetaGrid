/**
 * Created by hgeldenhuys on 2016-09-17.
 */
declare var mx;
declare var mxui;
declare var dojo;
declare var define;
declare var require;

define(["dojo/_base/array"], function (dojoArray) {
    "use strict";

    return class History {
        private domNode;
        private history = [];
        constructor (domNode) {
            this.domNode = domNode;
        }

        addHistory(label:string, onclick, widget):void {
            let historyDiv = mxui.dom.create('div', {class: "meta-grid-history-path"}, label),
                handle = dojo.connect(historyDiv, 'onclick', dojo.hitch(this, function(callback, level, event) {
                    this.clearHistoryAboveLevel(level-1);
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
        }

        flush():void {
            this.clearHistoryAboveLevel(-1);
        }

        level():number {
            return this.history.length;
        }

        private clearHistoryAboveLevel(level):void {
            for (let index = this.history.length-1; index > level; index--) {
                let history = this.history.pop();
                dojo.disconnect(history.handle);
                dojo.destroy(history.dom);
            }
        }
    }
});
