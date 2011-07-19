(function($, window) {
    var Application,
        extend = $.extend,
        pushState = "pushState" in history,
        currentHtml = "",
        docsAnimation = {
            show: {
                effects: "expandVertical fadeIn",
                duration: 300,
                show: true
            },
            hide: {
                effects: "expandVertical fadeIn",
                duration: 300,
                reverse: true,
                hide: true
            }
        },
        animation = {
            show: {
                effects: "fadeIn",
                duration: 300,
                show: true
            },
            hide: {
                effects: "fadeOut",
                duration: 300
            }
        },
        initialFolder = 0,
        codeStrip = false,
        initialRelativePath = "";

    window.selectCategory = function(element) {
        $("#categories .selected").removeClass("selected");
        $(element).addClass("selected");

        window.panelBar = $("#nav").empty().kendoPanelBar({
            animation: { open: { effects: 'fadeIn expandVertical' } },
            expandMode: "single",
            dataSource: categories[element.id]
        }).data("kendoPanelBar");

        var referenceUrl = $("#logo")[0].href;
        $("#nav li a").each(function() {
            var match = $(this).attr("href").match(/[^\/]+\/[^\/]+?$/);
            $(this).attr("href", referenceUrl + (match ? match[0] : ""));
        });
    };

    Application = {
        load: function(href) {
            Application.fetch(href);

            history.pushState({ href: href }, null, href);
        },

        fetch: function(href) {
            href = href.toLowerCase();

            $("#nav li a").each(function() {
                var currentHref = $(this).attr("href");
                if (currentHref && currentHref.toLowerCase() === href) {
                    Application.fetchExample(href);
                    $("#viewDescription").trigger("click");
                }
            });
        },

        fetchTitle: function () {
            return $.trim(/<title>(.*?)<\/title>/i.exec(currentHtml)[1]);
        },

        fetchExample: function (href) {
            $.get(href, function(html) {
                currentHtml = html;

                var exampleBody = $("#exampleBody"),
                    exampleName = $(".exampleName"),
                    tools = $("#codeStrip, .skinSelector.t-widget"),
                    title = Application.fetchTitle(),
                    toolsVisible = tools.is(":visible");

                if (title == "Overview" && toolsVisible)
                    tools.kendoStop(true).kendoAnimate(extend({ hide: true }, animation.hide));
                else {
                    Application.fetchDescription();
                }

                exampleName.kendoStop(true).kendoAnimate(extend({}, animation.hide, { complete: function() {
                    $(".exampleName").empty().html(title);

                    setTimeout(function() {
                        var newTabs = $($.trim(Application.helpTabs(html)));
                        $(".codeTab").nextAll().remove().end().after(newTabs);
                        $(".codeContainer").nextAll().remove().end().after($($.trim(Application.helpData(html))));
                        codeStrip._updateClasses();
                        prettyPrint();

                        if (title != "Overview" && !toolsVisible)
                            tools.kendoStop(true).kendoAnimate(animation.show);

                        exampleName.kendoStop(true).kendoAnimate(animation.show);
                    }, 100);
                }}));

                exampleBody.kendoStop(true).kendoAnimate(extend({}, animation.hide, { complete: function() {
                    exampleBody.empty().html(Application.body(html));
                    setTimeout(function() {
                        exampleBody.kendoStop(true).kendoAnimate(animation.show);
                    }, 100);
                }}));
            });
        },

        fetchCode: function(html, callback) {
            html = html.replace(new RegExp("\\s*<!-- tools -->(([\\u000a\\u000d\\u2028\\u2029]|.)*?)<!-- tools -->", "ig"), ""); // Remove tools first to strip description
            html = html.replace(new RegExp("\\s*<!-- \\w+ -->(([\\u000a\\u000d\\u2028\\u2029]|.)*?)<!-- \\w+ -->", "ig"), "");

            $("#code").empty().text(html);

            prettyPrint();

            if (callback)
                callback();
        },

        fetchDescription: function(href) {
            if (href)
                $.get(href, function(html) {
                    currentHtml = html;

                    var title = Application.fetchTitle();

                    $(".exampleName").empty().html(title);

                    if (title != "Overview") {
                        $("#codeStrip, .skinSelector.t-widget").show();

                        $(".description").empty().html($.trim(Application.description(html)));
                    } else {
                        $("#nav .t-item > .t-link").eq(0).addClass("t-state-selected");
                        Application.fetchExample(href);
                    }
                });
            else
                $(".description").empty().html($.trim(Application.description(currentHtml)));
        },

        fetchSkin: function(skinName, animate) {
            var kendoLinks = $("link[href*='kendo.']", document.getElementsByTagName("head")[0]),
                commonLink = kendoLinks.filter("[href*='kendo.common']"),
                skinLink = kendoLinks.filter(":not([href*='kendo.common'])"),
                currentFolder = new Array(location.href.match(/\//g).length - initialFolder + 1).join("../"),
                url = currentFolder + commonLink.attr("href").replace(/kendo\.\w+\.css/i, "kendo." + skinName + ".css"),
                exampleElement = $("#example"), newLink;

            if (!$.browser.msie) {
                newLink = skinLink
                    .eq(0)
                    .clone()
                    .attr("href", url);
            }

            var changeSkin = function () {

                if ($.browser.msie) {
                    newLink = document.createStyleSheet(url);
                }

                skinLink.eq(0).before(newLink);
                skinLink.remove();
                exampleElement[0].style.cssText = exampleElement[0].style.cssText;
            };

            $.get(url, function() {
                if (animate) {
                    exampleElement.kendoStop().kendoAnimate(extend({}, animation.hide, { complete: function() {
                        changeSkin();
                        setTimeout(function() {
                            exampleElement.kendoStop().kendoAnimate(animation.show);
                        }, 100);
                    }}));
                } else
                    changeSkin();

                $("#exampleBody").show();
            });
        },

        helpTabs: function (html) {
            var result = /<!--\s*help-tabs\s*-->(([\r\n]|.)*?)<!--\s*help-tabs\s*-->/im.exec(html);

            return result ? result[1] : "";
        },

        helpData: function (html) {
            var result = /<!--\s*help-data\s*-->(([\r\n]|.)*?)<!--\s*help-data\s*-->/im.exec(html);

            return result ? result[1] : "";
        },

        description: function(html) {
            return /<div class="description">(([\u000a\u000d\u2028\u2029]|.)*?)<\/\w+>\s*?<!-- description -->/ig.exec(html)[1];
        },

        body: function(html) {
            var match = /<div id="example([Body]*)"[^>]*?>(([\u000a\u000d\u2028\u2029]|.)*?)<!-- tools -->/ig.exec(html),
                hasBody = match[0].substr(16, 4) != "Body";

            return (match[1] != "") ? match[2] : (hasBody ? "" : "<div id=\"exampleBody\">") + match[0].replace("<!-- tools -->", "") + (hasBody ? "" : "</div>");
        },

        init: function() {

            initialFolder = location.href.match(/\//g).length;
            initialRelativePath = document.getElementsByTagName("head")[0].innerHTML.match(/href=\W([\.\/]*)([\w\/]*?)kendo\.common/)[1];
            codeStrip = $("#codeStrip").data("kendoTabStrip");

            var skinSelector = $("#skinSelector");

            if (sessionStorage && sessionStorage.length) {
                var kendoSkin = sessionStorage.getItem("kendoSkin");

                if (kendoSkin) {
                    skinSelector.data("kendoDropDownList").value(kendoSkin);
                    Application.fetchSkin(kendoSkin);
                }
            } else
                $("#exampleBody").show();

            if (pushState) {
                $("#nav li a")
                    .live("click", function(e) {
                        e.preventDefault();

                        if (!location.href.match($(this).attr("href")) && !$("#exampleBody").data("animating"))
                            Application.load($(this).attr("href"));
                    });

                $(".detailHandle").live("click", function (e) {
                    var extender = $(this).next(),
                        visible = extender.is(":visible");

                    extender.kendoStop(true).kendoAnimate(!visible ? docsAnimation.show : docsAnimation.hide, visible);
                });

                $(window).bind("popstate", function(e) {
                    var state = e.originalEvent.state;
                    if (state) {
                        Application.fetch(state.href.toLowerCase());
                    }
                });

                history.replaceState({ href: location.href }, null, location.href);
            }

            Application.fetchDescription(location.href.substr(-1) == "/" ? initialRelativePath ? location.href + "index.html" : location.href + "overview/index.html" : location.href);
            prettyPrint();

            $("#viewCode").click(function(e) {
                e.preventDefault();

                if (pushState)
                    Application.fetchCode(currentHtml);
                else
                    $.get(location.href, function(html) {
                        Application.fetchCode(html);
                    });
            });

            skinSelector.bind("change", function(e) {
                var newSkin = $("#skinSelector")[0].value.toLowerCase();

                Application.fetchSkin(newSkin, true);

                sessionStorage.setItem("kendoSkin", newSkin);
            });

        }

    };

    $(Application.init);

})(jQuery, window);

var categories = {
    overview: {
        text: "Overview",
        item: {
            url: "overview/index.html"
        }
    },
    controls: [
        { text: "Autocomplete", expanded: true, items: [
            {
                text: "Default Settings",
                url: "autocomplete/index.html"
            },
            {
                text: "Remote Data Source",
                url: "autocomplete/remotedatasource.html"
            },
            {
                text: "Custom Template",
                url: "autocomplete/customtemplate.html"
            },
            {
                text: "Events",
                url: "autocomplete/events.html"
            },
            {
                text: "API",
                url: "autocomplete/api.html"
            }
        ] },
        { text: "DropDownList", items: [
            {
                text: "Default Settings",
                url: "dropdownlist/index.html"
            },
            {
                text: "Transformation",
                url: "dropdownlist/transformation.html"
            },
            {
                text: "Local Data Source",
                url: "dropdownlist/localdatasource.html"
            },
            {
                text: "Remote Data Source",
                url: "dropdownlist/remotedatasource.html"
            },
            {
                text: "Custom Template",
                url: "dropdownlist/customtemplate.html"
            },
            {
                text: "Events",
                url: "dropdownlist/events.html"
            },
            {
                text: "API",
                url: "dropdownlist/api.html"
            }
        ] },
        { text: "ComboBox", items: [
            {
                text: "Default Settings",
                url: "combobox/index.html"
            },
            {
                text: "Transformation",
                url: "combobox/transformation.html"
            },
            {
                text: "Local Data Source",
                url: "combobox/localdatasource.html"
            },
            {
                text: "Remote Data Source",
                url: "combobox/remotedatasource.html"
            },
            {
                text: "Custom Template",
                url: "combobox/customtemplate.html"
            },
            {
                text: "Events",
                url: "combobox/events.html"
            },
            {
                text: "API",
                url: "combobox/api.html"
            }
        ] },
        { text: "Menu", items: [
            {
                text: "Default Settings",
                url: "menu/index.html"
            },
            {
                text: "Events",
                url: "menu/events.html"
            },
            {
                text: "API",
                url: "menu/api.html"
            },
            {
                text: "Animation Effects",
                url: "menu/animation.html"
            }
        ] },
        { text: "PanelBar", items: [
            {
                text: "Default Settings",
                url: "panelbar/index.html"
            },
            {
                text: "Loading Ajax Content",
                url: "panelbar/ajax.html"
            },
            {
                text: "Events",
                url: "panelbar/events.html"
            },
            {
                text: "API",
                url: "panelbar/api.html"
            },
            {
                text: "Animation Effects",
                url: "panelbar/animation.html"
            }
        ] },
        { text: "Slider", items: [
            {
                text: "Default Settings",
                url: "slider/index.html"
            },
            {
                text: "Events",
                url: "slider/events.html"
            },
            {
                text: "API",
                url: "slider/api.html"
            }
        ] },
        { text: "TabStrip", items: [
            {
                text: "Default Settings",
                url: "tabstrip/index.html"
            },
            {
                text: "Loading Ajax Content",
                url: "tabstrip/ajax.html"
            },
            {
                text: "Events",
                url: "tabstrip/events.html"
            },
            {
                text: "API",
                url: "tabstrip/api.html"
            },
            {
                text: "Animation Effects",
                url: "tabstrip/animation.html"
            }
        ] },
        { text: "TreeView", items: [
            {
                text: "Default Settings",
                url: "treeview/index.html"
            },
            {
                text: "Events",
                url: "treeview/events.html"
            },
            {
                text: "API",
                url: "treeview/api.html"
            }
        ] }
    ],
    framework: [
        { text: "DataSource", items: [
            {
                text: "Binding to remote data",
                url: "datasource/remote-data.html"
            },
            {
                text: "Binding to XML",
                url: "datasource/xml-data.html"
            }
        ] }
    ],
    integration: [
        { text: "DataSource", items: [
            {
                text: "Binding to remote data",
                url: "mata/remote-data.html"
            }
        ] }
    ]
};
