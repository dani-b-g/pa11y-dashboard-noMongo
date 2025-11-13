/*
 * Client-side persistence layer for Pa11y Dashboard
 *
 * This module exposes a global `Pa11yPersistence` object which wraps
 * a simple IndexedDB database. It stores tasks and results so that
 * accessibility audits persist between browser sessions. Tasks are
 * keyed by their id and may optionally include a `last_result`
 * property containing a summary of the most recent run. Results are
 * stored separately and keyed by their id.
 *
 * The database is created with two object stores: `tasks` and
 * `results`. Each store uses the `id` property of the stored
 * objects as its keyPath. Basic CRUD methods are provided for
 * adding/updating tasks, deleting tasks (and associated results),
 * retrieving all tasks, storing individual results and retrieving
 * results for a given task.
 */

/* global indexedDB */

(function () {
    'use strict';

    const DB_NAME = 'pa11yDashboard';
    const DB_VERSION = 1;
    let dbInstance;

    /**
     * Open (and upgrade if necessary) the IndexedDB database. On first
     * creation it will create the `tasks` and `results` object stores.
     *
     * @returns {Promise<IDBDatabase>} A promise that resolves with the opened database
     */
    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = event => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('tasks')) {
                    db.createObjectStore('tasks', {keyPath: 'id'});
                }
                if (!db.objectStoreNames.contains('results')) {
                    db.createObjectStore('results', {keyPath: 'id'});
                }
            };
            request.onerror = event => reject(event.target.error);
            request.onsuccess = event => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };
        });
    }

    /**
     * Get an open database instance, opening it if necessary.
     *
     * @returns {Promise<IDBDatabase>} The open database
     */
    async function getDatabase() {
        if (dbInstance) {
            return dbInstance;
        }
        return openDatabase();
    }

    /**
     * Perform a database transaction with the given stores and mode.
     * Returns a promise which resolves when the transaction completes.
     *
     * @param {Array<string>} stores The object stores involved
     * @param {string} mode The transaction mode ('readonly' or 'readwrite')
     * @param {function(IDBTransaction): void} callback Called with the transaction
     * @returns {Promise<void>} A promise resolving when the transaction completes
     */
    async function transact(stores, mode, callback) {
        const db = await getDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(stores, mode);
            tx.oncomplete = () => resolve();
            tx.onerror = event => reject(event.target.error);
            callback(tx);
        });
    }

    /**
     * Add or update a task in the `tasks` store.
     *
     * @param {Object} task The task to store (must have an `id`)
     * @returns {Promise<void>}
     */
    function saveTask(task) {
        return transact(['tasks'], 'readwrite', tx => {
            tx.objectStore('tasks').put(task);
        });
    }

    /**
     * Delete a task and all results associated with it. Results are
     * keyed by their own id; to remove all results for a task we must
     * iterate through the `results` store and delete matching entries.
     *
     * @param {string} id The task id
     * @returns {Promise<void>}
     */
    async function deleteTask(id) {
        const db = await getDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['tasks', 'results'], 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = event => reject(event.target.error);
            // Delete the task entry
            tx.objectStore('tasks').delete(id);
            // Delete all results whose `task` property matches
            const store = tx.objectStore('results');
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = event => {
                const cursor = event.target.result;
                if (cursor) {
                    const value = cursor.value;
                    if (value && value.task === id) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
        });
    }

    /**
     * Retrieve all tasks from the database.
     *
     * @returns {Promise<Array<Object>>} A list of task objects
     */
    async function getTasks() {
        const db = await getDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['tasks'], 'readonly');
            const store = tx.objectStore('tasks');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = event => reject(event.target.error);
        });
    }

    /**
     * Store a result in the `results` store.
     *
     * @param {Object} result The result to store (must have an `id` and `task`)
     * @returns {Promise<void>}
     */
    function saveResult(result) {
        return transact(['results'], 'readwrite', tx => {
            tx.objectStore('results').put(result);
        });
    }

    /**
     * Retrieve all results for a given task.
     *
     * @param {string} taskId The task id to filter by
     * @returns {Promise<Array<Object>>} A list of result objects for the task
     */
    async function getResultsByTask(taskId) {
        const db = await getDatabase();
        return new Promise((resolve, reject) => {
            const results = [];
            const tx = db.transaction(['results'], 'readonly');
            const store = tx.objectStore('results');
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = event => {
                const cursor = event.target.result;
                if (cursor) {
                    const value = cursor.value;
                    if (value && value.task === taskId) {
                        results.push(value);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            cursorRequest.onerror = event => reject(event.target.error);
        });
    }

    /**
     * Retrieve a single task by id from the `tasks` store.
     *
     * @param {string} id The task identifier
     * @returns {Promise<Object|undefined>} The task object or undefined if not found
     */
    async function getTask(id) {
        const db = await getDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['tasks'], 'readonly');
            const store = tx.objectStore('tasks');
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = event => reject(event.target.error);
        });
    }

    // Expose the persistence API globally
    window.Pa11yPersistence = {
        saveTask,
        deleteTask,
        getTasks,
        saveResult,
        getResultsByTask,
        getTask
    };
})();