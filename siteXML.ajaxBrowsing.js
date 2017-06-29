/*
 *
 * SiteXML ajax browsing
 *
 * (c) 2017 Michael Zelensky
 *
 * @Requires sitexml.js - https://github.com/MichaelZelensky/sitexml.js/blob/master/sitexml.js
 *
 * */

(function () {
    window.siteXML = {
        current_pid : null
    };

    //
    siteXML.init = function () {
        this.SiteXML = new sitexml();
        this.SiteXML.loadSitexml();
        this.current_pid = this.getCurrentPid();
        this.start();

        /*siteXML.loadXML('/?sitexml');
         window.addEventListener('siteXML.xml.loaded', function () {
         siteXML.start();
         });*/
    };

    /*
    * Returns the current page id
    * */
    siteXML.getCurrentPid = function () {
        //looks through navigation pages and finds LI.siteXML-current element
        var li, pid,
            lis = document.getElementsByTagName('li');
        for (var i = 0, n = lis.length; i < n; i++) {
            li = lis[i];
            if (li.getAttribute('pid') && li.className.indexOf('siteXML-current') > -1) {
                pid = li.getAttribute('pid');
                break;
            }
        }
        return pid || undefined;
    };

    //
    siteXML.start = function () {
        //if (siteXML.xml === undefined) return;
        var me = this,
            as = document.getElementsByTagName('a');
        this.addClickListeners(as);
        window.addEventListener("popstate", function(e) {
            if (e.state) {
                me.displayPage(e.state);
                document.title = me.getTitle(e.state);
            }
        });
        window.addEventListener("content.is.loaded", function(e) {
            var c, name, cz, cid = e.data.cid;
            if (cid && me.SiteXML.content && me.SiteXML.content[cid]) {
                c = me.SiteXML.getContentById(e.data.cid);
                if (c) {
                    name = c.attributes.name;
                    cz = me.getContentZoneByName(name);
                    if (cz) {
                        cz.innerHTML = me.SiteXML.content[cid];
                        me.SiteXML.triggerEvent(window, 'sitexml.content.displayed', {
                            cz: cz,
                            contentObj: me.SiteXML.content[cid],
                            cid: cid
                        });
                    }
                }
            }
        });
        window.addEventListener("sitexml.content.displayed", function(e){
            var as;
            if (e.data && e.data.cz && e.data.cz.tagName) {
                as = e.data.cz.getElementsByTagName('a');
                me.addClickListeners(as);
            }
        });
    };

    /*
     * Adds onclick listeners to given A elements, that have attribute PID
     * @Param {Array} as - list of A elements
     */
    siteXML.addClickListeners = function (as) {
        var me = this;
        for (var i = 0, n = as.length; i < n; i++) {
            if (as[i].attributes['pid']) {
                as[i].onclick = function() {

                    /*
                     *
                     * Algorithm:
                     *
                     * 1. same theme?
                     * 1a. yes - load content, goto 2
                     * 1b. no - STOP, return true (use link)
                     *
                     * 2. get list of changeable content zones (from xml - PAGE > CONTENT)
                     *
                     * 3. get content for each of the content zones
                     * 3a. already loaded? - replace content zone content
                     * 3b. not loaded - load, save, replace content zone content
                     *
                     * STOP, return false (link is not used)
                     *
                     * */

                    var page, pid, theme_next,
                        theme_cur = me.SiteXML.getPageTheme(me.current_pid);
                    pid = this.getAttribute('pid');
                    theme_next = me.SiteXML.getPageTheme(pid);
                    if (!history.pushState) {
                        //use link
                        return true;
                    } else if (theme_next.attributes.dir === theme_cur.attributes.dir && theme_next.attributes.file === theme_cur.attributes.file) {
                        page = me.SiteXML.getPageById(pid);
                        me.displayPage(page);
                        //getting History API and displaying the right URL
                        document.title = me.getTitle(page);
                        history.pushState(page, page.attributes.name, page.attributes.alias || '/id=' + page.attributes.id);
                        return false;
                    } else {
                        //just use the link
                        return true;
                    }
                }
            }
        }
    };

    /*
    * @Param {Object} - *required* - page object as of sitexml.siteObj
    * */
    siteXML.displayPage = function (page) {
        var lis, cz_els, cname, name, cid,
            pid = page.attributes.id,
            czs = [];
        this.deselectPages();
        lis = this.findPageNode(page.attributes.id);
        for (var i in lis) {
            if (lis.hasOwnProperty(i)) {
                lis[i].className += ' siteXML-current';
            }
        }
        cz_els = document.getElementsByClassName('siteXML-content');
        for (var i = 0, n = cz_els.length; i < n; i++) {
            if (cz_els[i].getAttribute('cname')) {
                cname = cz_els[i].getAttribute('cname');
                if (cname !== '') {
                    czs[cname] = cz_els[i];
                }
            }
        }
        //getting content
        for (i = 0, n = page.content.length; i < n; i++) {
            name = page.content[i].attributes.name;
            if (czs[name]) {
                cid = this.SiteXML.getContentIdByPidPname(pid, name);
                if (cid) {
                    if (this.SiteXML.content && this.SiteXML.content[cid]) {
                        czs[name].innerHTML = this.SiteXML.content[cid];
                        this.SiteXML.triggerEvent(window, 'sitexml.content.displayed', {
                            cz: czs[name],
                            content: this.SiteXML.content[cid],
                            cid: cid
                        });
                    } else {
                        czs[name].innerHTML = 'loading...';
                        this.SiteXML.loadContent(cid);
                    }
                }
            }
        }
    };

    /*
    * Returns {Array} - the page(s) LI in navigation
    * @param {int || string} - page id
    * */
    siteXML.findPageNode = function (id) {
        var lis = document.getElementsByTagName('li'),
            nodes = [];
        for (var i = 0, n = lis.length; i < n; i++) {
            if (lis[i].getAttribute('pid') * 1 === id * 1) {
                nodes.push(lis[i]);
            }
        }
        return nodes;
    };

    /*
    * Returns page title
    * */
    siteXML.getTitle = function (page) {
        return page.attributes.name || '';
    };

    /*
    * Recursive
    *
    * Returns the closest parent node LI
    * */
    siteXML.findPageNodeUp = function (child) {
        var parent = child.parentNode;
        if (parent && parent.nodeName.toLowerCase() === 'li') {
            return parent;
        } else {
            this.findPageNode(parent);
        }
    };

    //
    siteXML.deselectPages = function () {
        var lis = document.getElementsByClassName('siteXML-current');
        while (lis.length > 0) {
            lis[0].className = lis[0].className.replace('siteXML-current', '');
        }
    };

    //
    siteXML.getContentZoneByName = function (name) {
        var el,
            divs;
        if (document.getElementsByClassName) {
            divs = document.getElementsByClassName('siteXML-content');
        } else {
            divs = document.getElementsByTagName('div');
        }
        for (var i = 0, n = divs.length; i < n; i++) {
            if (divs[i].attributes['cname'] && divs[i].getAttribute('cname') === name) {
                el = divs[i];
                break;
            }
        }
        return el;
    };

    //
    siteXML.getContentNamesOnPage = function () {
        var names = [],
            divs;
        if (document.getElementsByClassName) {
            divs = document.getElementsByClassName('siteXML-content');
        } else {
            divs = document.getElementsByTagName('div');
        }
        for (var i = 0, n = divs.length; i < n; i++) {
            if (divs[i].attributes['cname']) {
                names.push(divs[i].getAttribute('cname'));
            }
        }
        return names;
    };

    /**/
    siteXML.init();

})();