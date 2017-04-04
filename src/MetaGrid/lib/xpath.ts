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

    return class XPath {
        private domNode;
        private xPaths = [];
        private show = false;
        constructor (domNode, show) {
            this.domNode = domNode;
            this.domNode.style.display = 'none';
            this.show = show;
        }

        addXpath(entity?:string,criteria?:string,association?:string):void {
            entity=entity||'';
            criteria=criteria||'';
            association=association||'';
            let level = this.xPaths.length-1;

            this.setPathLevel(level);
            this.xPaths.push({
                entity:entity,
                criteria:criteria,
                association:association
            });
            this.writePath();
        }

        writePath():void {
            this.domNode.style.display = this.show?'':'none';
            if (!this.xPaths.length)
                return;
            let xpaths = '';
            this.xPaths.forEach(function(xpath, index) {
                if (xpath.association)
                    xpaths += `/${xpath.association}`;
                xpaths += (index?'/':'') + xpath.entity;
                if (xpath.criteria)
                    xpaths += `[${xpath.criteria}]`;
            });
            this.domNode.innerHTML = xpaths;
        }

        flush():void {
            this.setPathLevel(-1);
        }

        level():number {
            return this.xPaths.length;
        }

        setPathLevel(level):void {
            for (let index = this.xPaths.length-1; index > level; index--) {
                let history = this.xPaths.pop();
            }
            this.writePath();
        }

        setCriteria(criteria, level?) {
            level=level||this.xPaths.length-1;
            this.xPaths[level].criteria = criteria;
            this.writePath();
        }

        setAssociation(association, level?) {
            level=level||this.xPaths.length-1;
            this.xPaths[level].association = association;
            this.writePath();
        }

        setEntity(entity, level?) {
            level=level||this.xPaths.length-1;
            this.xPaths[level].entity = entity;
            this.writePath();
        }

        setShow(show):void {
            this.show = !!show;
        }
    }
});
