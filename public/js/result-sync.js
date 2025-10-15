/*
 * Result synchroniser for Pa11y Dashboard
 *
 * When viewing a task page that has no server‑side results, this script
 * detects if there are results persisted in IndexedDB and populates
 * a simplified result view using those results.  It removes the
 * default "no results" alert and hides the aside that contains
 * download links (which point to non‑existent server results).  Only
 * the counts and selectors are shown; links to CSV/JSON and ignored
 * rules are not supported client‑side.
 */

/* global Pa11yPersistence, $ */

(function() {
    'use strict';

    // Group an array of issues by a given property
    function groupBy(arr, key) {
        return arr.reduce(function(result, item) {
            const groupKey = item[key];
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {});
    }

    // Build HTML for a category of issues (errors/warnings/notices)
    function buildCategoryHtml(type, grouped) {
        const plural = type + 's';
        let html = '';
        const groups = Object.values(grouped).sort(function(a, b) {
            return b.length - a.length;
        });
        groups.forEach(function(group, idx) {
            const first = group[0];
            html += '<div class="panel panel-default task task_type_' + type + '">';
            html +=   '<div class="panel-heading"><div class="row">';
            html +=     '<div class="col-md-9 col-sm-9 col-xs-8">';
            html +=       '<span class="rule-name">' + first.code + '&ensp;';
            html +=         '<span class="badge" title="' + group.length + ' selector(s)">' + group.length + '</span>';
            html +=       '</span>';
            html +=     '</div>';
            html +=   '</div></div>';
            html +=   '<div class="panel-body">';
            html +=     '<span class="text">' + first.message + '</span>';
            // Details toggle
            html +=     '<span class="btn btn-xs btn-link link btn-details" data-role="details-collapse" data-toggle="collapse" data-target="#' + type + '-' + idx + '" aria-expanded="false" aria-controls="' + type + '-' + idx + '">details</span>';
            // Collapsed details
            html +=     '<div class="task-details collapse" id="' + type + '-' + idx + '">';
            html +=       '<div class="subtitle">Selectors:</div>';
            html +=       '<ul class="list-unstyled selectors-list">';
            group.forEach(function(item) {
                html += '<li class="list-unstyled__item"><code class="code">' + item.selector + '</code></li>';
            });
            html +=       '</ul>';
            html +=     '</div>';
            html +=   '</div>';
            html += '</div>';
        });
        if (!groups.length) {
            html += '<div class="text">Well done! You have 0 ' + plural + '. <span class="glyphicon glyphicon-ok pull-right" aria-hidden="true"></span></div>';
        }
        return html;
    }

    $(document).ready(function() {
        // Identify task ID from path
        var parts = window.location.pathname.split('/').filter(Boolean);
        if (!parts.length) {
            return;
        }
        var taskId = parts[0];

        // Do not run if server has already provided a result section. We
        // detect this by checking for a nav tabs element inside the
        // results container. If present, the server is serving results and
        // our client-side rendering is not needed.
        var hasServerResults = $('section#top ul.nav.nav-tabs.category-list').length > 0;
        if (hasServerResults) {
            return;
        }

        // Fetch persisted results and populate view
        (async function() {
            try {
                const results = await Pa11yPersistence.getResultsByTask(taskId);
                if (!results || !results.length) {
                    return;
                }
                // Sort results by date descending and pick the latest
                results.sort(function(a, b) {
                    return new Date(b.date) - new Date(a.date);
                });
                const result = results[0];
                // Group issues by type and then by code
                const groupedByType = { error: {}, warning: {}, notice: {} };
                if (Array.isArray(result.results)) {
                    // Group by type first
                    const issuesByType = groupBy(result.results, 'type');
                    ['error', 'warning', 'notice'].forEach(function(type) {
                        const issues = issuesByType[type] || [];
                        const issuesByCode = groupBy(issues, 'code');
                        groupedByType[type] = issuesByCode;
                    });
                }
                // Build navigation tabs and content
                var navHtml = '<ul class="nav nav-tabs category-list" role="tablist">';
                var contentHtml = '<div class="tab-content">';
                var types = ['error','warning','notice'];
                types.forEach(function(type, idx) {
                    var plural = type + 's';
                    var active = idx === 0 ? ' active' : '';
                    var count = result.count && result.count[type] ? result.count[type] : 0;
                    navHtml += '<li class="category-list__item category-list__item_type_' + type + active + '" aria-selected="' + (idx === 0) + '" role="presentation">';
                    navHtml +=   '<a class="category-list__link" id="' + plural + '" href="#' + plural + '-list" aria-controls="' + plural + '-list" role="tab" data-toggle="tab">';
                    // Capitalise first letter of type name
                    navHtml +=     type.charAt(0).toUpperCase() + type.slice(1) + 's ( ' + count + ' )';
                    navHtml +=   '</a></li>';
                    contentHtml += '<div id="' + plural + '-list" role="tabpanel" class="tab-pane tasks-list fade' + (idx === 0 ? ' in active' : '') + '" aria-labelledby="' + plural + '">';
                    contentHtml += buildCategoryHtml(type, groupedByType[type]);
                    contentHtml += '</div>';
                });
                // Ignored rules tab placeholder
                navHtml += '<li class="category-list__item category-list__item_type_ignore" aria-selected="false" role="presentation">';
                navHtml +=   '<a class="category-list__link" id="ignore" href="#ignore-list" aria-controls="ignore-list" role="tab" data-toggle="tab">';
                navHtml +=     'Ignored rules ( ' + (Array.isArray(result.ignore) ? result.ignore.length : 0) + ' )';
                navHtml +=   '</a></li>';
                contentHtml += '<div id="ignore-list" role="tabpanel" class="tab-pane tasks-list fade" aria-labelledby="ignore">';
                contentHtml += '<div class="text">Ignored rules are not displayed for local runs.</div>';
                contentHtml += '</div>';
                contentHtml += '</div>';
                navHtml += '</ul>';
                // Compose section
                var sectionHtml = '<section class="col-md-9" id="top">';
                sectionHtml += '<h2 id="tabSectionHeading" class="crunch-top">Results</h2>';
                sectionHtml += navHtml + contentHtml;
                sectionHtml += '</section>';
                // Remove any 'no results' alerts (info alerts without a
                // results section) to avoid duplicate run links. We only
                // target alert-info elements containing a run-task link.
                $('div.alert-info').filter(function() {
                    return $(this).find('a[data-test="run-task"]').length > 0;
                }).parent().remove();
                // Hide aside with download links
                $('.aside').hide();
                // Insert the section after the graph container's parent
                $('.graph-container').parent().after(sectionHtml);
            } catch (err) {
                /* eslint no-console: "off" */
                console.error('Result sync error:', err);
            }
        })();
    });
})();