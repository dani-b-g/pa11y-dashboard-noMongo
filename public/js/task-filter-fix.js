// This script ensures that the task filter works correctly even when
// tasks are dynamically added to the DOM after page load (for
// example, when tasks are loaded from IndexedDB). The original
// implementation in site.min.js caches the task list at initial
// page load, meaning newly injected tasks are not filtered. This
// script attaches a keyup listener to the filter input and applies
// filtering on the current set of tasks on each key stroke.

document.addEventListener('DOMContentLoaded', function() {
    // Find the task list container. It has the data-control="task-list" attribute.
    var container = document.querySelector('[data-control="task-list"]');
    if (!container) {
        return;
    }
    // Find the filter input. It has the data-role="input" attribute inside the task list.
    var input = container.querySelector('[data-role="input"]');
    if (!input) {
        return;
    }
    // Attach a keyup listener that filters tasks based on the input value.
    input.addEventListener('keyup', function() {
        var rawQuery = input.value || '';
        // Normalise the query: trim whitespace and remove non-alphanumeric characters
        var query = rawQuery.trim().replace(/[^a-z0-9\s]+/gi, '');
        // Get all task elements (they have data-role="task")
        var tasks = container.querySelectorAll('[data-role="task"]');
        tasks.forEach(function(task) {
            // Always remove the hidden class before evaluating
            task.classList.remove('hidden');
            if (!query) {
                return;
            }
            var keywords = task.getAttribute('data-keywords') || '';
            // Build a regex that matches any of the space-separated terms
            var queryRegExp = new RegExp('(' + query.replace(/\s+/g, '|') + ')', 'i');
            if (!queryRegExp.test(keywords)) {
                task.classList.add('hidden');
            }
        });
    });
});