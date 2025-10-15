/*
 * History display for Pa11y Dashboard
 *
 * This script enhances the task detail page by loading historical
 * accessibility results from IndexedDB and displaying them under
 * the task header. It updates the "Last run" date to reflect the
 * most recent persisted run and shows the total number of runs
 * completed. If no results are persisted, the existing server output
 * remains untouched. This script does not interfere with the
 * server-rendered results list but supplements it when the server
 * has no data (for example, after a restart).
 */

/* global Pa11yPersistence, $ */

(function() {
    'use strict';

    /**
     * Format an ISO 8601 date string into a human-readable form
     * similar to the dashboard's date formatting (DD MMM YYYY). Uses
     * built-in Date methods; does not rely on external libraries.
     *
     * @param {string} isoDate ISO date string
     * @returns {string} Formatted date
     */
    function formatDate(isoDate) {
        const date = new Date(isoDate);
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return day + ' ' + month + ' ' + year;
    }

    /**
     * Create and insert a history section into the task page. The
     * history includes the number of runs and a list of summaries for
     * each persisted result. Summaries show the run date and
     * counts of errors, warnings and notices.
     *
     * @param {Array<Object>} results An array of result objects for the task
     */
    function renderHistory(results) {
        const header = $('.task-header').first();
        if (!header.length) {
            return;
        }
        // Insert only once
        if ($('#task-history').length) {
            return;
        }
        const historyDiv = $('<section>', {id: 'task-history', class: 'col-md-12 zfix'});
        historyDiv.append($('<h3>', {text: 'Run History'}));
        const countP = $('<p>', {class: 'h5', text: 'Total runs: ' + results.length});
        historyDiv.append(countP);
        const list = $('<ul>', {class: 'list-unstyled'});
        results.forEach((res, index) => {
            const li = $('<li>');
            const summary = formatDate(res.date) + ' — ' + res.count.error + ' errors, ' + res.count.warning + ' warnings, ' + res.count.notice + ' notices';
            li.text((index + 1) + '. ' + summary);
            list.append(li);
        });
        historyDiv.append(list);
        // Insert after the task header
        historyDiv.insertAfter(header);
    }

    /**
     * Update the header's last run date to reflect the most recent
     * persisted result.
     *
     * @param {Object} lastResult The most recent result object
     */
    function updateLastRunDate(lastResult) {
        const dateContainer = $('.task-header .date').first();
        if (dateContainer.length) {
            const formatted = formatDate(lastResult.date);
            dateContainer.html('Last run: <strong>' + formatted + '</strong>');
        }
    }

    /**
     * Update the task header with details from a persisted task. When
     * the server does not provide name, url or standard (for example
     * after a restart), this function fills in the header elements
     * with values from IndexedDB. It also updates the link href and
     * text for the URL. If any element is missing, it will be
     * skipped.
     *
     * @param {Object} task Persisted task object with id, name, url, standard
     */
    function updateHeaderFromTask(task) {
        const header = $('.task-header').first();
        if (!header.length || !task) {
            return;
        }
        // Update title
        const nameEl = header.find('h1').first();
        if (nameEl.length && task.name) {
            nameEl.text(task.name);
        }
        // Update URL and simplified text
        const urlAnchor = header.find('p.h4 a').first();
        const stdSpan = header.find('p.h4 span.h5').first();
        if (urlAnchor.length && task.url) {
            urlAnchor.attr('href', task.url);
            // Simplify the URL for display
            const simplified = task.url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
            urlAnchor.text(simplified);
        }
        if (stdSpan.length && task.standard) {
            stdSpan.text('(' + task.standard + ')');
        }
    }

    // Execute when the page is ready
    $(document).ready(function() {
        // Detect task detail page by the presence of .task-header
        if (!$('.task-header').length) {
            return;
        }
        // Extract the task ID from the URL (e.g. /abc123)
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length === 0) {
            return;
        }
        const taskId = pathParts[0];
        // Ensure the task itself is persisted. If no stored task exists,
        // extract minimal information from the page (name, url, standard)
        // and save it. This avoids "Task not found" errors when running
        // a freshly created task without visiting the task list first.
        Pa11yPersistence.getTask(taskId).then(function(task) {
            if (!task) {
                try {
                    var name = $('.task-header h1').first().text().trim();
                    var url = $('.task-header p.h4 a').first().attr('href');
                    var stdText = $('.task-header p.h4 span.h5').first().text().trim();
                    var standard = stdText;
                    // Remove parentheses if present
                    if (standard.charAt(0) === '(' && standard.charAt(standard.length - 1) === ')') {
                        standard = standard.slice(1, -1);
                    }
                    var newTask = { id: taskId, name: name, url: url, standard: standard };
                    // Optionally capture ignore list, timeout, etc. if available later
                    Pa11yPersistence.saveTask(newTask).catch(function() {});
                } catch (e) {
                    /* eslint no-console: "off" */
                    console.error('Failed to extract task details for persistence:', e);
                }
            } else {
                // If the task exists in persistence and the server provided
                // no details (blank placeholders), update the header now
                updateHeaderFromTask(task);
            }
        }).catch(function() { /* ignore */ });
        // Load persisted results for the task
        Pa11yPersistence.getResultsByTask(taskId).then(results => {
            if (!results || results.length === 0) {
                return;
            }
            // Sort results by date descending
            results.sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            // Update last run in header
            updateLastRunDate(results[0]);
            // Render history list
            renderHistory(results);
            // Also update header details in case the server rendered placeholders
            Pa11yPersistence.getTask(taskId).then(function(t) {
                updateHeaderFromTask(t);
            }).catch(function() {});
        }).catch(err => {
            /* eslint no-console: "off" */
            console.error('Failed to load history:', err);
        });
    });
})();