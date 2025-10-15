/*
 * Local in-memory webservice for Pa11y Dashboard
 *
 * This module reimplements a minimal subset of the Pa11y Webservice
 * interface used by Pa11y Dashboard. It stores tasks and results in
 * memory, and runs accessibility tests on demand using the `pa11y`
 * library. No database (MongoDB) or external webservice is required.
 *
 * Tasks are stored in a Map keyed by their ID. Each task has an
 * associated array of results (also keyed by the task ID in a Map).
 * Creating, editing and deleting tasks operate directly on the Map.
 * Running a task uses Pa11y to analyse the configured URL with the
 * supplied options, and stores the resulting report. The last result
 * is exposed on the task via the `last_result` property.
 */

'use strict';

const pa11y = require('pa11y');
const {nanoid} = require('nanoid');

function createLocalWebservice() {
    // Maps to store tasks and results. The keys are task IDs.
    const tasks = new Map();
    const results = new Map();

    /**
     * Convert a Pa11y result into the format expected by the dashboard.
     * @param {string} taskId The ID of the task
     * @param {object} task The task configuration
     * @param {object} pa11yResult The raw result from pa11y()
     * @returns {object} A result object compatible with Pa11y Webservice
     */
    function transformResult(taskId, task, pa11yResult) {
        const resultId = nanoid();
        const date = new Date().toISOString();
        // Count issues by type
        const count = {error: 0, warning: 0, notice: 0};
        const messages = (pa11yResult.issues || []).map(issue => {
            // pa11y uses `type` as a string: 'error', 'warning', 'notice'
            if (count[issue.type] !== undefined) {
                count[issue.type]++;
            }
            return {
                code: issue.code,
                type: issue.type,
                message: issue.message,
                context: issue.context,
                selector: issue.selector
            };
        });
        return {
            id: resultId,
            task: taskId,
            url: task.url,
            name: task.name,
            standard: task.standard,
            date,
            count,
            results: messages,
            ignore: task.ignore || []
        };
    }

    /**
     * Map task configuration to pa11y options. The dashboard stores
     * task properties in a flat object. This function converts those
     * properties to the options accepted by pa11y().
     * @param {object} task The task configuration
     * @returns {object} Options for pa11y()
     */
    function taskToPa11yOptions(task) {
        const options = {};
        if (task.standard) options.standard = task.standard;
        if (task.timeout) options.timeout = Number(task.timeout);
        if (task.wait) options.wait = Number(task.wait);
        if (Array.isArray(task.actions) && task.actions.length) options.actions = task.actions;
        if (task.username) options.username = task.username;
        if (task.password) options.password = task.password;
        if (task.hideElements) options.hideElements = task.hideElements;
        if (task.headers) options.headers = task.headers;
        if (Array.isArray(task.ignore) && task.ignore.length) options.ignore = task.ignore;
        return options;
    }

    /**
     * Run a task: invoke pa11y with the task's URL and options and store
     * the resulting report. The result is appended to the task's list
     * of results and assigned as the task's `last_result`.
     * @param {object} task The task to run
     * @param {function} callback Callback invoked with `(err)`
     */
    async function runTask(task, callback) {
        try {
            const pa11yOptions = taskToPa11yOptions(task);
            const pa11yResult = await pa11y(task.url, pa11yOptions);
            const result = transformResult(task.id, task, pa11yResult);
            const list = results.get(task.id);
            list.push(result);
            task.last_result = result;
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    /**
     * Return an object representing operations on a single task.
     * This matches the interface of pa11y-webservice-client-node.
     * @param {string} id The task ID
     */
    function taskApi(id) {
        return {
            get: (opts, callback) => {
                // Return a copy of the task with its last_result attached
                const task = tasks.get(id);
                if (!task) {
                    return callback(new Error('Task not found'));
                }
                // Clone to avoid mutation by presenters
                const copy = {...task};
                if (opts && opts.lastres && copy.last_result) {
                    copy.last_result = copy.last_result;
                }
                callback(null, copy);
            },
            edit: (body, callback) => {
                const task = tasks.get(id);
                if (!task) {
                    return callback(new Error('Task not found'));
                }
                // Only update known fields
                const fields = ['name', 'url', 'standard', 'ignore', 'timeout', 'wait', 'actions', 'username', 'password', 'headers', 'hideElements'];
                fields.forEach(f => {
                    if (typeof body[f] !== 'undefined') {
                        task[f] = body[f];
                    }
                });
                callback(null);
            },
            remove: callback => {
                tasks.delete(id);
                results.delete(id);
                callback(null);
            },
            run: callback => {
                const task = tasks.get(id);
                if (!task) {
                    return callback(new Error('Task not found'));
                }
                runTask(task, callback);
            },
            results: (opts, callback) => {
                const list = results.get(id);
                if (!list) {
                    return callback(new Error('Task not found'));
                }
                // Return a copy of results, latest first
                const res = list.slice().reverse();
                callback(null, res);
            },
            result: rid => {
                return {
                    get: (opts, callback) => {
                        const list = results.get(id);
                        if (!list) {
                            return callback(new Error('Task not found'));
                        }
                        const result = list.find(r => r.id === rid);
                        if (!result) {
                            return callback(new Error('Result not found'));
                        }
                        // If opts.full is falsy we could strip the full results,
                        // but Pa11y Dashboard expects full results; so always return full
                        callback(null, result);
                    }
                };
            }
        };
    }

    return {
        tasks: {
            get: (opts, callback) => {
                // Return all tasks. If opts.lastres is true, include last_result.
                const arr = Array.from(tasks.values()).map(task => {
                    const copy = {...task};
                    if (opts && opts.lastres && task.last_result) {
                        copy.last_result = task.last_result;
                    }
                    // Do not include results array
                    return copy;
                });
                callback(null, arr);
            },
            create: (body, callback) => {
                // Validate required fields
                if (!body || !body.url || !body.name) {
                    return callback(new Error('Missing required fields'));
                }
                const id = nanoid();
                const task = {
                    id,
                    name: body.name,
                    url: body.url,
                    standard: body.standard || 'WCAG2AA',
                    ignore: body.ignore || [],
                    timeout: body.timeout || undefined,
                    wait: body.wait || undefined,
                    actions: body.actions || [],
                    username: body.username || undefined,
                    password: body.password || undefined,
                    headers: body.headers || undefined,
                    hideElements: body.hideElements || undefined
                };
                tasks.set(id, task);
                results.set(id, []);
                callback(null, task);
            }
        },
        task: id => taskApi(id)
    };
}

module.exports = createLocalWebservice;