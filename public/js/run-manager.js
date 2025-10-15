/*
 * Run manager for Pa11y Dashboard
 *
 * This script intercepts clicks on the "Run Pa11y" links and uses the
 * `/api/run` endpoint to perform an accessibility analysis on demand.
 * The resulting report is then stored in IndexedDB via the
 * `Pa11yPersistence` API, and the associated task is updated with the
 * new `last_result`. After storing, the page reloads so that the UI
 * reflects the latest results. If the browser supports `crypto.randomUUID`
 * it is used to generate unique result identifiers; otherwise a
 * timestamp-based fallback is used.
 */

/* global Pa11yPersistence, fetch, $ */

(function() {
    'use strict';

    /**
     * Generate a unique identifier for a result. Uses the browser's
     * crypto.randomUUID if available, otherwise falls back to a
     * combination of the current timestamp and a random number.
     *
     * @returns {string} A unique ID string
     */
    function generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000000));
    }

    /**
     * Compute issue counts from a Pa11y result. The result object
     * returned by `/api/run` contains an `issues` array with objects
     * having a `type` property which may be 'error', 'warning' or
     * 'notice'. This helper tallies each type into a summary.
     *
     * @param {Object} result The raw Pa11y result
     * @returns {Object} An object with `error`, `warning` and `notice` counts
     */
    function countIssues(result) {
        const counts = {error: 0, warning: 0, notice: 0};
        if (result && Array.isArray(result.issues)) {
            result.issues.forEach(issue => {
                if (typeof counts[issue.type] === 'number') {
                    counts[issue.type]++;
                }
            });
        }
        return counts;
    }

    /**
     * Run an accessibility analysis for a given task using the
     * `/api/run` endpoint. On success, store the result and update the
     * task's last result. Finally reload the page to reflect updates.
     *
     * @param {string} taskId The ID of the task to run
     */
    async function runTask(taskId) {
        let task = await Pa11yPersistence.getTask(taskId);
        if (!task) {
            // Attempt to extract minimal task info from the DOM. This can occur
            // immediately after creating a task, before the history script
            // has persisted it. On the task detail page, we can access
            // the full URL and standard via the task header.
            try {
                const header = document.querySelector('.task-header');
                if (header) {
                    const nameEl = header.querySelector('h1');
                    const urlEl = header.querySelector('p.h4 a');
                    const stdEl = header.querySelector('p.h4 span.h5');
                    const name = nameEl ? nameEl.textContent.trim() : null;
                    const url = urlEl ? urlEl.getAttribute('href') : null;
                    let standard = stdEl ? stdEl.textContent.trim() : null;
                    if (standard && standard.charAt(0) === '(' && standard.charAt(standard.length - 1) === ')') {
                        standard = standard.slice(1, -1);
                    }
                    if (name && url && standard) {
                        task = { id: taskId, name: name, url: url, standard: standard };
                        await Pa11yPersistence.saveTask(task);
                    }
                }
            } catch (e) {
                /* eslint no-console: "off" */
                console.error('Failed to extract task details for run:', e);
            }
        }
        if (!task) {
            alert('Task not found in local storage');
            return;
        }
        // Build the payload for the API. Include any saved options
        const payload = {
            url: task.url,
            standard: task.standard
        };
        if (Array.isArray(task.ignore) && task.ignore.length) {
            payload.ignore = task.ignore;
        }
        if (task.timeout) {
            payload.timeout = task.timeout;
        }
        if (task.wait) {
            payload.wait = task.wait;
        }
        if (Array.isArray(task.actions) && task.actions.length) {
            payload.actions = task.actions;
        }
        if (task.username) {
            payload.username = task.username;
        }
        if (task.password) {
            payload.password = task.password;
        }
        if (task.hideElements) {
            payload.hideElements = task.hideElements;
        }
        if (task.headers) {
            payload.headers = task.headers;
        }
        try {
            const response = await fetch('/api/run', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error('API request failed with status ' + response.status);
            }
            const pa11yResult = await response.json();
            // Transform the Pa11y result into our persisted result format
            const resultId = generateId();
            const counts = countIssues(pa11yResult);
            const resultObj = {
                id: resultId,
                task: taskId,
                url: task.url,
                name: task.name,
                standard: task.standard,
                date: new Date().toISOString(),
                count: counts,
                results: pa11yResult.issues || [],
                ignore: task.ignore || []
            };
            await Pa11yPersistence.saveResult(resultObj);
            // Update task with new last_result
            task.last_result = {
                id: resultId,
                date: resultObj.date,
                count: counts
            };
            await Pa11yPersistence.saveTask(task);
            // Reload page to reflect updates
            window.location.reload();
        } catch (err) {
            /* eslint no-console: "off" */
            console.error('Error running task:', err);
            alert('Failed to run accessibility analysis: ' + err.message);
        }
    }

    // Attach click handlers when the DOM is ready
    $(document).ready(function() {
        // Find run links on both tasks list and detail pages
        $(document).on('click', 'a[data-test="run-task"]', function(event) {
            // Only intercept if the link points to a task run (/:id/run) optionally
            // followed by query parameters or a hash. We match any path ending
            // with "/run" and ignore additional query or hash fragments. This
            // prevents the server-side run endpoint from being called when
            // there are query strings (e.g. ?running) on the URL. The regex
            // tests for "/<id>/run" followed by zero or more characters
            // beginning with ? or #.
            const href = $(this).attr('href');
            if (href && /\/[^\/]+\/run(?:[?#].*)?$/.test(href)) {
                event.preventDefault();
                // Extract the task ID from the path portion of the href. We
                // split on '/' and take the second segment. For example,
                // '/abc123/run?running=1' => ['', 'abc123', 'run?running=1'].
                const segments = href.split('/');
                const taskId = segments.length > 1 ? segments[1] : null;
                if (taskId) {
                    runTask(taskId);
                }
            }
        });
    });
})();