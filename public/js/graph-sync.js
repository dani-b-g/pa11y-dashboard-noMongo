/*
 * Graph synchronisation for Pa11y Dashboard
 *
 * This script enhances the task detail page by populating the hidden
 * statistics table and drawing the line graph when the server does
 * not provide any results (for example, after a restart). It uses
 * stored results from IndexedDB via the Pa11yPersistence API. The
 * graph shows counts of errors, warnings and notices over time and
 * replicates the appearance of the original Flot-based charts. If
 * there are already results rendered by the server, this script does
 * nothing, allowing the existing graph logic to run unchanged.
 */

/* global Pa11yPersistence, $ */

(function () {
    'use strict';

    /**
     * Format an ISO 8601 date into the same format used by the
     * dashboard templates (DD MMM YYYY). This helper does not use any
     * external libraries.
     * @param {string} isoDate The ISO date string
     * @returns {string} Formatted date string
     */
    function formatDate(isoDate) {
        var date = new Date(isoDate);
        var day = String(date.getDate()).padStart(2, '0');
        var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var month = monthNames[date.getMonth()];
        var year = date.getFullYear();
        return day + ' ' + month + ' ' + year;
    }

    /**
     * Build the dataset arrays required by Flot from an array of
     * persisted results. Each data point consists of a timestamp and
     * a count value for a specific issue type.
     * @param {Array<Object>} results List of result objects
     * @returns {Object} Object containing arrays for errors, warnings and notices
     */
    function buildDatasets(results) {
        var errors = [];
        var warnings = [];
        var notices = [];
        results.forEach(function (res) {
            var t = new Date(res.date).getTime();
            errors.push([t, res.count.error]);
            warnings.push([t, res.count.warning]);
            notices.push([t, res.count.notice]);
        });
        return {errors: errors, warnings: warnings, notices: notices};
    }

    /**
     * Draw a graph using Flot for the given datasets. This replicates
     * the original graph styling with minimal configuration. The graph
     * will display all three series (errors, warnings, notices) and
     * use time on the X axis.
     * @param {Object} datasets The dataset object returned by buildDatasets()
     */
    function plotGraph(datasets) {
        if (typeof $ === 'undefined' || typeof $.plot !== 'function') {
            return;
        }
        var graphContainer = $('[data-role="graph"]');
        if (!graphContainer.length) {
            return;
        }
        var data = [
            { color: 'rgb(216, 61, 45)', label: 'Errors', data: datasets.errors },
            { color: 'rgb(168, 103, 0)', label: 'Warnings', data: datasets.warnings, lines: { show: false }, dashes: { show: true, dashLength: [10, 5] } },
            { color: 'rgb(23, 123, 190)', label: 'Notices', data: datasets.notices, lines: { show: false }, dashes: { show: true, dashLength: 5 } }
        ];
        var graphOptions = {
            series: {
                dashes: { show: false, lineWidth: 3 },
                lines: { show: true },
                points: { show: true, fill: true, radius: 4, lineWidth: 3 },
                hoverable: true
            },
            xaxis: { mode: 'time', tickLength: 0, minTickSize: [1, 'day'], timeformat: '%d %b' },
            yaxis: { tickDecimals: 0 },
            lines: { lineWidth: 3 },
            points: { fill: true, radius: 4, lineWidth: 3 },
            shadowSize: 0,
            grid: {
                backgroundColor: '#fff',
                borderColor: '#808080',
                hoverable: true,
                clickable: true,
                borderWidth: { top: 1, right: 1, bottom: 1, left: 1 }
            },
            selection: { mode: 'x' }
        };
        $.plot(graphContainer, data, graphOptions);
    }

    /**
     * Populate the hidden graph table with result rows. This ensures
     * that any server-side code which references the table (for example
     * for CSV export) can still find the data. Rows are appended to
     * the tbody of the graph-data table.
     * @param {Array<Object>} results List of result objects
     */
    function populateGraphTable(results) {
        var tbody = $('#graph-data tbody');
        if (!tbody.length) {
            return;
        }
        results.forEach(function (res) {
            var tr = $('<tr>').attr('data-role', 'url-stats');
            var dateVal = new Date(res.date).getTime();
            tr.append($('<td>').attr('data-role', 'date').attr('data-value', dateVal).text(formatDate(res.date)));
            tr.append($('<td>').addClass('text-center').attr('data-label', 'error').text(res.count.error));
            tr.append($('<td>').addClass('text-center').attr('data-label', 'warning').text(res.count.warning));
            tr.append($('<td>').addClass('text-center').attr('data-label', 'notice').text(res.count.notice));
            tbody.append(tr);
        });
    }

    // Main execution: run on document ready
    $(document).ready(function () {
        // Only run on task detail pages by checking for task-header
        if (!$('.task-header').length) {
            return;
        }
        // If there are already results from the server, do nothing
        var rows = $('#graph-data tbody tr[data-role="url-stats"]');
        if (rows.length > 0) {
            return;
        }
        // Determine the task id from the URL path
        var pathParts = window.location.pathname.split('/').filter(function (p) { return p; });
        if (pathParts.length === 0) {
            return;
        }
        var taskId = pathParts[0];
        // Load persisted results for the task
        Pa11yPersistence.getResultsByTask(taskId).then(function (results) {
            if (!results || !results.length) {
                return;
            }
            // Sort results by date ascending
            results.sort(function (a, b) {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
            // Populate the hidden table
            populateGraphTable(results);
            // Build datasets and plot the graph
            var datasets = buildDatasets(results);
            plotGraph(datasets);
            // After plotting the graph, initialise the checkbox controls to
            // toggle series for persisted results. The default site.js
            // implementation populates the graph controls based on server
            // data on page load; however, when results are loaded from
            // IndexedDB after a restart, the original data/datasets arrays
            // are not updated. This function sets up its own handlers to
            // toggle series using the persisted datasets.
            setupGraphControls(datasets);
        }).catch(function (err) {
            /* eslint no-console: "off" */
            console.error('Failed to load persisted results:', err);
        });
    });

    /**
     * Set up custom event handlers for the series checkboxes on the graph
     * legend when using persisted results. The original site.js code
     * constructs a datasets array on page load and binds click
     * handlers to plot data based on those arrays. When we load
     * results from IndexedDB after a restart, that datasets array is
     * not updated. This helper re-initialises the controls using our
     * computed datasets.
     *
     * @param {Object} built The datasets returned by buildDatasets()
     */
    function setupGraphControls(built) {
        // Only run on task detail pages
        var graphContainer = $('[data-role="graph"]');
        var choiceContainer = $('[data-role="series-checkboxes"]');
        if (!graphContainer.length || !choiceContainer.length) {
            return;
        }
        var legend = graphContainer.parent('.graph-container').find('.dashedLegend');
        // Build array of dataset objects compatible with Flot
        var localDatasets = [];
        localDatasets.push({
            name: 'errors',
            label: 'Errors',
            data: built.errors,
            color: 'rgb(216, 61, 45)'
        });
        localDatasets.push({
            name: 'warnings',
            label: 'Warnings',
            data: built.warnings,
            color: 'rgb(168, 103, 0)',
            lines: { show: false },
            dashes: { show: true, dashLength: [10, 5] }
        });
        localDatasets.push({
            name: 'notices',
            label: 'Notices',
            data: built.notices,
            color: 'rgb(23, 123, 190)',
            lines: { show: false },
            dashes: { show: true, dashLength: 5 }
        });
        // Remove existing click handlers on the checkboxes to avoid interference
        choiceContainer.find('input').off('click');
        // Function to plot selected datasets according to checkbox state
        function plotAccordingToChoices() {
            var selected = [];
            var labels = [];
            choiceContainer.find('input:checked').each(function () {
                var statType = $(this).data('stat-type'); // e.g. 'errors'
                // Find matching dataset by comparing label (lowercase)
                for (var i = 0; i < localDatasets.length; i++) {
                    var ds = localDatasets[i];
                    if (ds.label.toLowerCase() === statType) {
                        selected.push(ds);
                        labels.push(ds.label);
                        break;
                    }
                }
            });
            // If nothing selected, clear plot and hide legend
            if (!selected.length) {
                $.plot(graphContainer, [], {});
                if (legend.length === 1) {
                    legend.hide();
                }
                return;
            }
            // Show/hide legend rows
            if (legend.length === 1) {
                legend.find('tr').hide();
                labels.forEach(function (value) {
                    // Determine legend class names: legendErrors, legendWarnings, legendNotices
                    var className;
                    if (value === 'Errors') className = 'legendErrors';
                    else if (value === 'Warnings') className = 'legendWarnings';
                    else if (value === 'Notices') className = 'legendNotices';
                    if (className) {
                        legend.find('.' + className).parents('tr').show();
                    }
                });
                legend.show();
            }
            // Define graph options similar to our initial plot
            var graphOptions = {
                series: {
                    dashes: { show: false, lineWidth: 3 },
                    lines: { show: true },
                    points: { show: true, fill: true, radius: 4, lineWidth: 3 },
                    hoverable: true
                },
                xaxis: { mode: 'time', tickLength: 0, minTickSize: [1, 'day'], timeformat: '%d %b' },
                yaxis: { tickDecimals: 0 },
                lines: { lineWidth: 3 },
                points: { fill: true, radius: 4, lineWidth: 3 },
                shadowSize: 0,
                grid: {
                    backgroundColor: '#fff',
                    borderColor: '#808080',
                    hoverable: true,
                    clickable: true,
                    borderWidth: { top: 1, right: 1, bottom: 1, left: 1 }
                },
                selection: { mode: 'x' }
            };
            $.plot(graphContainer, selected, graphOptions);
        }
        // Bind our new handler
        choiceContainer.find('input').on('click', plotAccordingToChoices);
        // Check all boxes to initialise with all series and plot
        choiceContainer.find('input').prop('checked', true);
        plotAccordingToChoices();
    }
})();