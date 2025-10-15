/*
 * Custom webservice client for Pa11y Dashboard
 *
 * This module provides a minimal client for talking to a running
 * Pa11y Webservice instance via its HTTP API. The original dashboard
 * depended on the `pa11y-webservice-client-node` module, which in turn
 * required a locally running webservice backed by MongoDB. In order to
 * decouple the dashboard from MongoDB, this client wraps the Webservice’s
 * REST interface using `fetch`. You can point the dashboard at any
 * reachable Pa11y Webservice instance by setting the `webservice` option in
 * your configuration to a URL (for example via `WEBSERVICE_URL`).
 *
 * Each method exposed here accepts a callback in the form `(error, data)`,
 * matching the interface of the original client. Under the hood these
 * functions are asynchronous and use the Fetch API to perform HTTP
 * requests. Should an error occur or a request return a non‑2xx status
 * code, the callback will be invoked with an `Error` instance.
 */

'use strict';

// Attempt to use the global fetch if available. On Node.js 18 and later
// `fetch` is available globally. If it is not present we lazily import
// `node-fetch`. Note that `node-fetch` is not declared as a dependency of
// Pa11y Dashboard; if you are running on an older version of Node.js you
// should install `node-fetch` yourself or upgrade Node.
let fetchFunc;
if (typeof fetch === 'function') {
    fetchFunc = fetch;
} else {
    fetchFunc = async (...args) => {
        const mod = await import('node-fetch');
        return mod.default(...args);
    };
}

/**
 * Create a webservice client for the given base URL.
 *
 * @param {string} baseUrl The base URL of a Pa11y Webservice instance. A
 * trailing slash is optional.
 * @returns {object} An object exposing methods compatible with
 *                   `pa11y-webservice-client-node`.
 */
function createClient(baseUrl) {
    // Normalise the base URL to always include a trailing slash
    let normalised = baseUrl || '';
    if (normalised && !normalised.endsWith('/')) {
        normalised += '/';
    }

    /**
     * Internal helper to perform a fetch call and handle errors. The
     * returned data is parsed as JSON. Non‑2xx responses will cause the
     * promise to reject with an Error instance whose message includes the
     * status text.
     *
     * @param {string} url The full request URL
     * @param {object} options Options passed directly to fetch
     * @returns {Promise<any>} The parsed JSON response
     */
    async function requestJson(url, options) {
        const response = await fetchFunc(url, options);
        if (!response.ok) {
            const msg = `HTTP ${response.status} ${response.statusText}`;
            throw new Error(msg);
        }
        // When there is no content (e.g. 204) attempt to return null
        const text = await response.text();
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text);
        } catch (err) {
            // If parsing fails return the raw text so callers can decide
            return text;
        }
    }

    /**
     * Factory for an individual task client. Each task exposes methods
     * corresponding to the REST endpoints for that task.
     *
     * @param {string} id The task identifier
     * @returns {object} Methods for interacting with a single task
     */
    function taskFactory(id) {
        const encodedId = encodeURIComponent(id);
        const taskBase = `${normalised}tasks/${encodedId}`;

        return {
            /**
             * Retrieve a specific task.
             * @param {object} opts Optional query parameters
             * @param {function} callback Callback invoked with `(err, task)`
             */
            get: (opts, callback) => {
                (async () => {
                    try {
                        const params = new URLSearchParams();
                        if (opts && opts.lastres) {
                            params.append('lastres', 'true');
                        }
                        if (opts && opts.full) {
                            params.append('full', 'true');
                        }
                        const url = params.toString() ? `${taskBase}?${params}` : taskBase;
                        const data = await requestJson(url, {method: 'GET'});
                        callback(null, data);
                    } catch (err) {
                        callback(err);
                    }
                })();
            },
            /**
             * Edit a task. Performs a PATCH request.
             * @param {object} body The updated task properties
             * @param {function} callback Callback invoked with `(err, result)`
             */
            edit: (body, callback) => {
                (async () => {
                    try {
                        const data = await requestJson(taskBase, {
                            method: 'PATCH',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(body)
                        });
                        callback(null, data);
                    } catch (err) {
                        callback(err);
                    }
                })();
            },
            /**
             * Remove a task. Performs a DELETE request.
             * @param {function} callback Callback invoked with `(err)`
             */
            remove: callback => {
                (async () => {
                    try {
                        await requestJson(taskBase, {method: 'DELETE'});
                        callback(null);
                    } catch (err) {
                        callback(err);
                    }
                })();
            },
            /**
             * Trigger a task run. Performs a POST request to `/run`.
             * @param {function} callback Callback invoked with `(err)`
             */
            run: callback => {
                (async () => {
                    try {
                        const runUrl = `${taskBase}/run`;
                        await requestJson(runUrl, {method: 'POST'});
                        callback(null);
                    } catch (err) {
                        callback(err);
                    }
                })();
            },
            /**
             * List results for this task. Performs a GET request to
             * `/results`.
             * @param {object} opts Optional query parameters
             * @param {function} callback Callback invoked with `(err, results)`
             */
            results: (opts, callback) => {
                (async () => {
                    try {
                        const params = new URLSearchParams();
                        if (opts && typeof opts.page !== 'undefined') {
                            params.append('page', String(opts.page));
                        }
                        const url = params.toString() ? `${taskBase}/results?${params}` : `${taskBase}/results`;
                        const data = await requestJson(url, {method: 'GET'});
                        // The webservice returns an object with a `results` property
                        // containing an array of result summaries. Normalise to an
                        // array for compatibility with the original client.
                        const results = Array.isArray(data) ? data : (data && data.results) || [];
                        callback(null, results);
                    } catch (err) {
                        callback(err);
                    }
                })();
            },
            /**
             * Factory for a single result associated with this task.
             * @param {string} rid The result identifier
             * @returns {object} Methods for interacting with a single result
             */
            result: rid => {
                const encodedRid = encodeURIComponent(rid);
                const resultBase = `${taskBase}/results/${encodedRid}`;
                return {
                    /**
                     * Retrieve a specific result. Performs a GET request.
                     * @param {object} opts Optional query parameters
                     * @param {function} callback Callback invoked with `(err, result)`
                     */
                    get: (opts, callback) => {
                        (async () => {
                            try {
                                const params = new URLSearchParams();
                                if (opts && opts.full) {
                                    params.append('full', 'true');
                                }
                                const url = params.toString() ? `${resultBase}?${params}` : resultBase;
                                const data = await requestJson(url, {method: 'GET'});
                                callback(null, data);
                            } catch (err) {
                                callback(err);
                            }
                        })();
                    }
                };
            }
        };
    }

    return {
        /**
         * Operations that apply to the entire collection of tasks.
         */
        tasks: {
            /**
             * List tasks. Performs a GET request to `/tasks`.
             * @param {object} opts Optional query parameters
             * @param {function} callback Callback invoked with `(err, tasks)`
             */
            get: (opts, callback) => {
                (async () => {
                    try {
                        const params = new URLSearchParams();
                        if (opts && opts.lastres) {
                            params.append('lastres', 'true');
                        }
                        const url = params.toString() ? `${normalised}tasks?${params}` : `${normalised}tasks`;
                        const data = await requestJson(url, {method: 'GET'});
                        // Webservice returns an object with `tasks` or an array
                        const tasks = Array.isArray(data) ? data : (data && data.tasks) || [];
                        callback(null, tasks);
                    } catch (err) {
                        callback(err);
                    }
                })();
            },
            /**
             * Create a new task. Performs a POST request to `/tasks`.
             * @param {object} body The task definition
             * @param {function} callback Callback invoked with `(err, task)`
             */
            create: (body, callback) => {
                (async () => {
                    try {
                        const data = await requestJson(`${normalised}tasks`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(body)
                        });
                        callback(null, data);
                    } catch (err) {
                        callback(err);
                    }
                })();
            }
        },
        /**
         * Factory to access operations on a single task.
         * @param {string} id The task identifier
         * @returns {object} The per‑task client
         */
        task: id => taskFactory(id)
    };
}

module.exports = createClient;