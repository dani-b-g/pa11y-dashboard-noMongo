/*
 * Edit manager for Pa11y Dashboard
 *
 * This script enhances the task edit page to persist task
 * modifications in IndexedDB. When editing a task after the server
 * has been restarted, the in-memory webservice will not contain the
 * task, so updates would otherwise be lost. This script intercepts
 * the form submission, extracts the updated values from the form
 * fields, updates the persisted task in IndexedDB, and then allows
 * the form to submit normally. The server route is tolerant of
 * missing tasks and will redirect back to the edit page with the
 * `?edited` query parameter. The persistence layer ensures that
 * future visits to the dashboard reflect the updated task.
 */

/* global Pa11yPersistence, $ */

(function() {
    'use strict';
    // Wait for DOM ready
    $(document).ready(function() {
        // Only run on the edit page
        const form = $('form[data-test="edit-url-form"]');
        if (!form.length || !window.Pa11yPersistence) {
            return;
        }
        // Pre-populate the form fields from IndexedDB when the page loads.
        (function prepopulate() {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            if (!pathParts.length) {
                return;
            }
            const id = pathParts[0];
            Pa11yPersistence.getTask(id).then(function(task) {
                if (!task) {
                    return;
                }
                // Helper to set value on disabled inputs as well
                function setVal(selector, value) {
                    const el = $(selector);
                    if (el.length) {
                        el.val(value);
                        // Also update the attribute for disabled fields
                        el.attr('value', value);
                    }
                }
                setVal('#new-task-name', task.name || '');
                setVal('#new-task-url', task.url || '');
                setVal('#new-task-standard', task.standard || '');
                setVal('#new-task-timeout', task.timeout || '');
                setVal('#new-task-wait', task.wait || '');
                if (task.actions && Array.isArray(task.actions)) {
                    $('#new-task-actions').val(task.actions.join('\n'));
                } else {
                    $('#new-task-actions').val('');
                }
                setVal('#new-task-username', task.username || '');
                setVal('#new-task-password', task.password || '');
                // Convert headers object back to key: value lines
                if (task.headers && typeof task.headers === 'object') {
                    const lines = [];
                    Object.keys(task.headers).forEach(function(key) {
                        lines.push(key + ': ' + task.headers[key]);
                    });
                    $('#new-task-headers').val(lines.join('\n'));
                } else {
                    $('#new-task-headers').val('');
                }
                setVal('#new-task-hide-elements', task.hideElements || '');
                // Check ignore checkboxes based on task.ignore array
                if (Array.isArray(task.ignore)) {
                    $('input[name="ignore[]"]').each(function() {
                        if (task.ignore.indexOf(this.value) !== -1) {
                            $(this).prop('checked', true);
                        } else {
                            $(this).prop('checked', false);
                        }
                    });
                }
            }).catch(function() { /* ignore */ });
        })();

        form.on('submit', async function() {
            try {
                const id = window.location.pathname.split('/').filter(Boolean)[0];
                // Retrieve the task from IndexedDB or create a new object
                let task = await Pa11yPersistence.getTask(id);
                if (!task) {
                    task = { id: id };
                }
                // Helper to get value even if input is disabled
                function getVal(selector) {
                    const el = $(selector);
                    if (!el.length) return '';
                    return el.val() || el.attr('value') || '';
                }
                task.name = getVal('#new-task-name').trim();
                task.url = getVal('#new-task-url').trim();
                task.standard = getVal('#new-task-standard').trim();
                const timeout = getVal('#new-task-timeout').trim();
                task.timeout = timeout ? timeout : undefined;
                const wait = getVal('#new-task-wait').trim();
                task.wait = wait ? wait : undefined;
                // Actions: split into array, trimming empty lines
                const actionsText = getVal('#new-task-actions');
                if (actionsText) {
                    task.actions = actionsText.split(/[\r\n]+/).map(a => a.trim()).filter(a => a);
                } else {
                    task.actions = [];
                }
                const username = getVal('#new-task-username');
                task.username = username ? username : undefined;
                const password = getVal('#new-task-password');
                task.password = password ? password : undefined;
                // Parse headers into object. Each line should be key: value
                const headersText = getVal('#new-task-headers');
                if (headersText) {
                    const headersObj = {};
                    headersText.split(/[\r\n]+/).forEach(line => {
                        const idx = line.indexOf(':');
                        if (idx > -1) {
                            const key = line.slice(0, idx).trim();
                            const val = line.slice(idx + 1).trim();
                            if (key) {
                                headersObj[key] = val;
                            }
                        }
                    });
                    task.headers = Object.keys(headersObj).length ? headersObj : undefined;
                } else {
                    task.headers = undefined;
                }
                const hideElements = getVal('#new-task-hide-elements');
                task.hideElements = hideElements ? hideElements : undefined;
                // Gather ignored rules
                const ignore = [];
                form.find('input[name="ignore[]"]:checked').each(function() {
                    ignore.push(this.value);
                });
                task.ignore = ignore;
                // Persist the updated task
                await Pa11yPersistence.saveTask(task);
            } catch (err) {
                /* eslint no-console: "off" */
                console.error('Failed to persist edited task:', err);
            }
            // Allow the form submission to continue
            return true;
        });
    });
})();