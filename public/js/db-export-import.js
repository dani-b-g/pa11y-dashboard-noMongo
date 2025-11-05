// This file provides utility functions for exporting and importing
// Pa11y Dashboard's client-side persistence data. By default the
// dashboard persists tasks and results in the browser's IndexedDB
// using the Pa11yPersistence module. These functions gather all
// stored tasks and their associated results, serialise them into
// JSON for download, and read JSON back into IndexedDB on import.

/* global Pa11yPersistence */

(function() {
    'use strict';

    /**
     * Create and trigger a download of a JSON blob. This helper
     * constructs a Blob from the given data object and prompts the
     * browser to download it using a temporary anchor element.
     *
     * @param {Object} data The data object to serialise
     * @param {string} filename The filename for the downloaded file
     */
    function downloadJSON(data, filename) {
        try {
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            // Append to DOM and trigger click
            document.body.appendChild(a);
            a.click();
            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            /* eslint no-console: "off" */
            console.error('Failed to prepare JSON download:', err);
            alert('Failed to export data. See console for details.');
        }
    }

    /**
     * Collect all tasks and their corresponding results from
     * Pa11yPersistence. Because the persistence API exposes only
     * helpers to retrieve all tasks and results for a specific task,
     * we iterate through each task and fetch its results individually.
     *
     * @returns {Promise<Object>} A promise resolving with an object
     * containing `tasks` and `results` arrays
     */
    async function collectData() {
        if (!window.Pa11yPersistence) {
            throw new Error('Pa11yPersistence is not available');
        }
        const tasks = await Pa11yPersistence.getTasks();
        const results = [];
        // Gather results for each task sequentially
        for (const task of tasks) {
            try {
                const taskResults = await Pa11yPersistence.getResultsByTask(task.id);
                if (Array.isArray(taskResults)) {
                    // Clone to avoid referencing the same array
                    for (const result of taskResults) {
                        results.push(result);
                    }
                }
            } catch (err) {
                /* eslint no-console: "off" */
                console.error('Failed to collect results for task', task.id, err);
            }
        }
        return { tasks, results };
    }

    /**
     * Handle click on the export button. When invoked this function
     * collects all persisted data and downloads it as a JSON file.
     */
    async function handleExport() {
        try {
            const data = await collectData();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = 'pa11y-dashboard-data-' + timestamp + '.json';
            downloadJSON(data, filename);
        } catch (err) {
            /* eslint no-console: "off" */
            console.error('Failed to export data:', err);
            alert('Failed to export data. See console for details.');
        }
    }

    /**
     * Prompt the user to select a JSON file to import. This simply
     * triggers a click on the hidden file input element so that the
     * browser file picker appears.
     */
    function handleImport() {
        const input = document.getElementById('db-import-file');
        if (!input) {
            return;
        }
        // Reset the input so that the change event fires even if the
        // same file is selected twice
        input.value = '';
        input.click();
    }

    /**
     * Handle the file selection event. Reads the selected JSON file
     * and attempts to import its contents into IndexedDB using the
     * Pa11yPersistence API. The page will reload after a successful
     * import to ensure the UI reflects the newly imported data.
     *
     * @param {Event} evt The change event from the file input
     */
    function onFileSelected(evt) {
        const input = evt.target;
        if (!input.files || !input.files.length) {
            return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onerror = function(err) {
            /* eslint no-console: "off" */
            console.error('Failed to read import file:', err);
            alert('Failed to read the selected file. See console for details.');
        };
        reader.onload = async function(e) {
            try {
                const content = e.target.result;
                const parsed = JSON.parse(content);
                if (!window.Pa11yPersistence) {
                    throw new Error('Pa11yPersistence is not available');
                }
                // Import tasks and results. Build arrays of promises so we
                // can wait for all writes to complete before reloading.
                const tasksArray = Array.isArray(parsed.tasks) ? parsed.tasks : [];
                const resultsArray = Array.isArray(parsed.results) ? parsed.results : [];
                const taskPromises = tasksArray.map(t => {
                    return Pa11yPersistence.saveTask(t).catch(err2 => {
                        /* eslint no-console: "off" */
                        console.error('Failed to import task', t, err2);
                    });
                });
                const resultPromises = resultsArray.map(r => {
                    return Pa11yPersistence.saveResult(r).catch(err2 => {
                        /* eslint no-console: "off" */
                        console.error('Failed to import result', r, err2);
                    });
                });
                // Await all writes to finish
                await Promise.all(taskPromises.concat(resultPromises));
                // Reload the page once all data has been written
                window.location.reload();
            } catch (err) {
                /* eslint no-console: "off" */
                console.error('Failed to import data:', err);
                alert('Failed to import data. Ensure the JSON file is valid.');
            }
        };
        reader.readAsText(file);
    }

    // Attach event listeners once the DOM is ready. We use
    // DOMContentLoaded here rather than jQuery to avoid adding another
    // dependency; jQuery is available globally but not required for
    // these actions.
    document.addEventListener('DOMContentLoaded', function() {
        const exportBtn = document.querySelector('[data-role="export-db"]');
        const importBtn = document.querySelector('[data-role="import-db"]');
        const fileInput = document.getElementById('db-import-file');
        if (exportBtn) {
            exportBtn.addEventListener('click', handleExport);
        }
        if (importBtn) {
            importBtn.addEventListener('click', handleImport);
        }
        if (fileInput) {
            fileInput.addEventListener('change', onFileSelected);
        }
    });
})();