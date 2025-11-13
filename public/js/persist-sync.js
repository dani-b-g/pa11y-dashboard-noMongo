/*
 * Synchronise tasks and results between the server-rendered DOM and
 * IndexedDB. This script runs on the tasks list page and ensures that
 * any tasks displayed by the server are persisted locally, and that
 * tasks persisted in IndexedDB are rendered if the server does not
 * provide them (e.g. after a restart). Tasks deleted on the server
 * will also be removed from IndexedDB. Only basic task properties
 * (id, name, url, standard) and a summary of the last result are
 * stored.
 */

/* global Pa11yPersistence, $ */

(function() {
    'use strict';

    /**
     * Extract tasks from the server-rendered DOM and persist them in
     * IndexedDB. Also remove any tasks from IndexedDB which no longer
     * appear in the DOM.
     */
    async function syncFromDOM() {
        if (!window.Pa11yPersistence) {
            return;
        }
        const domTasks = {};
        // Select all task list items rendered by the server
        $('#grid-container li[data-role="task"]').each(function() {
            const id = this.getAttribute('data-task-id');
            if (!id) {
                return;
            }
            // Extract name, url, standard from the card
            const name = $(this).find('div.gridview p.h3').first().text().trim();
            const url = $(this).find('div.gridview p.h4').first().text().trim();
            let standard = $(this).find('div.gridview p.h5').first().text().trim();
            // Standards appear wrapped in parentheses
            if (standard.charAt(0) === '(' && standard.charAt(standard.length - 1) === ')') {
                standard = standard.slice(1, -1);
            }
            const task = {id, name, url, standard};
            // Attempt to read last result summary from stats
            const errEl = $(this).find('li.danger').first();
            const warnEl = $(this).find('li.warning').first();
            const noteEl = $(this).find('li.info').first();
            const dateEl = $(this).find('div.last-run').first();
            if (errEl.length && warnEl.length && noteEl.length && dateEl.length) {
                const lastResult = {
                    date: dateEl.text().replace(/^Last run\s*/i, '').trim(),
                    count: {
                        error: parseInt(errEl.text(), 10) || 0,
                        warning: parseInt(warnEl.text(), 10) || 0,
                        notice: parseInt(noteEl.text(), 10) || 0
                    }
                };
                task.last_result = lastResult;
            }
            domTasks[id] = task;
        });
        // Save/update tasks from the DOM in IndexedDB. Merge with any existing
        // stored task so that properties such as last_result are not lost
        const savePromises = Object.keys(domTasks).map(async id => {
            try {
                const existing = await Pa11yPersistence.getTask(id);
                // Merge existing properties with the DOM task. The DOM task
                // always wins for id, name, url and standard, but existing
                // last_result and other fields are preserved if not present
                const merged = Object.assign({}, existing || {}, domTasks[id]);
                await Pa11yPersistence.saveTask(merged);
            } catch (err) {
                // On error just save the DOM task
                await Pa11yPersistence.saveTask(domTasks[id]);
            }
        });
        await Promise.all(savePromises);
        // Conditionally remove tasks from IndexedDB when the server indicates a deletion.
        // If the URL has a `deleted` query parameter then the user has just
        // deleted a task via the dashboard UI. In that case remove
        // tasks from IndexedDB that are no longer present in the DOM.
        const params = new URLSearchParams(window.location.search);
        if (params.has('deleted')) {
            const storedTasks = await Pa11yPersistence.getTasks();
            const deletePromises = storedTasks
                .filter(t => !domTasks[t.id])
                .map(t => Pa11yPersistence.deleteTask(t.id));
            await Promise.all(deletePromises);
        }
    }

    /**
     * Load tasks from IndexedDB and render them into the task list if
     * they are not already present in the DOM. This runs after
     * synchronisation so that tasks from the server take precedence.
     */
    async function loadPersistedTasks() {
        if (!window.Pa11yPersistence) {
            return;
        }
        const tasks = await Pa11yPersistence.getTasks();
        if (!tasks || !tasks.length) {
            return;
        }
        const container = document.getElementById('grid-container');
        if (!container) {
            return;
        }
        tasks.forEach(async task => {
            // Skip tasks already present in the DOM
            if (document.querySelector('#grid-container li[data-task-id="' + task.id + '"]')) {
                return;
            }
            // Create the list item and contents
            const li = document.createElement('li');
            li.className = 'col-md-4 col-sm-6 task-card';
            li.setAttribute('data-role', 'task');
            li.setAttribute('data-task-id', task.id);
            li.setAttribute('data-keywords', (task.name.toLowerCase() + ' ' + task.standard.toLowerCase() + ' ' + simplifyUrl(task.url)).trim());
            const anchor = document.createElement('a');
            anchor.className = 'well task-card-link crunch-bottom';
            anchor.href = '/' + task.id;
            anchor.title = 'Details for URL ' + simplifyUrl(task.url);
            // Primary info
            const gv1 = document.createElement('div');
            gv1.className = 'gridview';
            const pName = document.createElement('p');
            pName.className = 'h3';
            pName.textContent = task.name;
            const pUrl = document.createElement('p');
            pUrl.className = 'h4';
            pUrl.textContent = simplifyUrl(task.url);
            const pStd = document.createElement('p');
            pStd.className = 'h5';
            pStd.textContent = '(' + task.standard + ')';
            gv1.appendChild(pName);
            gv1.appendChild(pUrl);
            gv1.appendChild(pStd);
            anchor.appendChild(gv1);
            // Last result
            if (task.last_result && task.last_result.count) {
                const gv2 = document.createElement('div');
                gv2.className = 'gridview';
                const statsList = document.createElement('ul');
                statsList.className = 'clearfix list-unstyled floated-list task-stats';
                const liErr = document.createElement('li');
                liErr.className = 'danger';
                liErr.title = 'Number of errors (' + task.last_result.count.error + ')';
                liErr.innerHTML = task.last_result.count.error + '<span class="stat-type">Errors</span>';
                const liWarn = document.createElement('li');
                liWarn.className = 'warning';
                liWarn.title = 'Number of warnings (' + task.last_result.count.warning + ')';
                liWarn.innerHTML = task.last_result.count.warning + '<span class="stat-type">Warnings</span>';
                const liInfo = document.createElement('li');
                liInfo.className = 'info last';
                liInfo.title = 'Number of notices (' + task.last_result.count.notice + ')';
                liInfo.innerHTML = task.last_result.count.notice + '<span class="stat-type">Notices</span>';
                statsList.appendChild(liErr);
                statsList.appendChild(liWarn);
                statsList.appendChild(liInfo);
                gv2.appendChild(statsList);
                anchor.appendChild(gv2);
                const lastRun = document.createElement('div');
                lastRun.className = 'last-run';
                // Format the ISO timestamp into DD MMM YYYY
                (function() {
                    const d = new Date(task.last_result.date);
                    const day = String(d.getDate()).padStart(2, '0');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const month = monthNames[d.getMonth()];
                    const year = d.getFullYear();
                    lastRun.textContent = 'Last run ' + day + ' ' + month + ' ' + year;
                })();
                // Show the number of stored runs for the task
                try {
                    const runs = await Pa11yPersistence.getResultsByTask(task.id);
                    if (runs && runs.length > 1) {
                        const runCountSpan = document.createElement('span');
                        runCountSpan.className = 'run-count';
                        runCountSpan.textContent = ' (' + runs.length + ' runs)';
                        lastRun.appendChild(runCountSpan);
                    }
                } catch (err) {
                    /* eslint no-console: "off" */
                    console.error('Failed to load run count:', err);
                }
                anchor.appendChild(lastRun);
            } else {
                const noRes = document.createElement('p');
                noRes.className = 'no-results';
                noRes.textContent = 'No results';
                anchor.appendChild(noRes);
            }
            li.appendChild(anchor);
            // Append to the container
            container.appendChild(li);
        });
    }

    /**
     * Update existing DOM task cards with persisted task information. When the
     * server renders a task without any result data (i.e. no stats or last
     * run date), this function will read the persisted `last_result` from
     * IndexedDB and update the card to display the correct counts and
     * last run date. If the card already shows stats, they will be
     * overwritten with the persisted values. If multiple runs exist, a
     * run count will be appended next to the date. This ensures that
     * the main task list reflects the persisted execution history.
     */
    async function updateDomWithPersistedTasks() {
        if (!window.Pa11yPersistence) {
            return;
        }
        const tasks = await Pa11yPersistence.getTasks();
        if (!tasks || !tasks.length) {
            return;
        }
        // Iterate over persisted tasks and update corresponding DOM cards
        for (const task of tasks) {
            const li = document.querySelector('#grid-container li[data-task-id="' + task.id + '"]');
            if (!li) {
                continue;
            }
            const anchor = li.querySelector('a.task-card-link');
            if (!anchor) {
                continue;
            }
            // Remove any "No results" placeholders
            const noRes = anchor.querySelector('p.no-results');
            if (noRes) {
                noRes.remove();
            }
            // Remove any existing stats and date elements so we can rebuild them
            const existingStatsLists = anchor.querySelectorAll('ul.task-stats');
            existingStatsLists.forEach(function(list) {
                const parent = list.parentNode;
                if (parent) {
                    parent.remove();
                }
            });
            const existingLastRun = anchor.querySelector('div.last-run');
            if (existingLastRun) {
                existingLastRun.remove();
            }
            // Only insert stats if a last_result is available
            if (task.last_result && task.last_result.count) {
                // Build the stats container similar to loadPersistedTasks
                const gv2 = document.createElement('div');
                gv2.className = 'gridview';
                const statsList = document.createElement('ul');
                statsList.className = 'clearfix list-unstyled floated-list task-stats';
                const liErr = document.createElement('li');
                liErr.className = 'danger';
                liErr.title = 'Number of errors (' + task.last_result.count.error + ')';
                liErr.innerHTML = task.last_result.count.error + '<span class="stat-type">Errors</span>';
                const liWarn = document.createElement('li');
                liWarn.className = 'warning';
                liWarn.title = 'Number of warnings (' + task.last_result.count.warning + ')';
                liWarn.innerHTML = task.last_result.count.warning + '<span class="stat-type">Warnings</span>';
                const liInfo = document.createElement('li');
                liInfo.className = 'info last';
                liInfo.title = 'Number of notices (' + task.last_result.count.notice + ')';
                liInfo.innerHTML = task.last_result.count.notice + '<span class="stat-type">Notices</span>';
                statsList.appendChild(liErr);
                statsList.appendChild(liWarn);
                statsList.appendChild(liInfo);
                gv2.appendChild(statsList);
                anchor.appendChild(gv2);
                // Construct the last run date element. Format the ISO
                // timestamp into DD MMM YYYY for display consistency
                const lastRun = document.createElement('div');
                lastRun.className = 'last-run';
                (function() {
                    const d = new Date(task.last_result.date);
                    const day = String(d.getDate()).padStart(2, '0');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const month = monthNames[d.getMonth()];
                    const year = d.getFullYear();
                    lastRun.textContent = 'Last run ' + day + ' ' + month + ' ' + year;
                })();
                try {
                    // Append run count if more than one result exists
                    const runs = await Pa11yPersistence.getResultsByTask(task.id);
                    if (runs && runs.length > 1) {
                        const runCountSpan = document.createElement('span');
                        runCountSpan.className = 'run-count';
                        runCountSpan.textContent = ' (' + runs.length + ' runs)';
                        lastRun.appendChild(runCountSpan);
                    }
                } catch (err) {
                    /* eslint no-console: "off" */
                    console.error('Failed to load run count:', err);
                }
                anchor.appendChild(lastRun);
            } else {
                // If no last_result, show placeholder
                const noResults = document.createElement('p');
                noResults.className = 'no-results';
                noResults.textContent = 'No results';
                anchor.appendChild(noResults);
            }
        }
    }

    /**
     * Simplify a URL for display by stripping the protocol and trailing slash.
     *
     * @param {string} url The full URL
     * @returns {string} The simplified URL
     */
    function simplifyUrl(url) {
        return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }

    // Execute synchronisation and rendering after the DOM is ready
    $(document).ready(function() {
        // Only run on the task list page
        if ($('[data-control="task-list"]').length) {
            syncFromDOM()
                .then(function() {
                    return loadPersistedTasks();
                })
                .then(function() {
                    return updateDomWithPersistedTasks();
                })
                .catch(function(err) {
                    console.error('Persistence sync error:', err);
                });
        }
    });
})();