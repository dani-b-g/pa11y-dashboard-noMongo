/*
 * Delete manager for Pa11y Dashboard
 *
 * When deleting a task after the server has been restarted, the
 * in-memory service will not contain the task details. This script
 * populates the delete confirmation page with the correct URL and
 * standard from IndexedDB, ensuring the user sees meaningful
 * information before confirming the deletion. It does not affect
 * the deletion request itself; the server will redirect back to the
 * dashboard and the persisted task will be removed client-side.
 */

/* global Pa11yPersistence, $ */

(function() {
    'use strict';
    $(document).ready(function() {
        if (!window.Pa11yPersistence) {
            return;
        }
        const form = $('form[data-test="delete-url-form"]');
        if (!form.length) {
            return;
        }
        // Extract task id from URL
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (!pathParts.length) {
            return;
        }
        const id = pathParts[0];
        Pa11yPersistence.getTask(id).then(function(task) {
            if (!task) {
                return;
            }
            // Helper to simplify a URL for display
            function simplify(url) {
                return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
            }
            const legend = form.find('legend');
            const lead = form.find('p.lead');
            if (legend.length) {
                legend.text('Delete URL (' + simplify(task.url) + ')');
            }
            if (lead.length) {
                // Replace contents of <strong> and <small> within the lead
                const strongEl = lead.find('strong');
                const smallEl = lead.find('small');
                if (strongEl.length) {
                    strongEl.text(task.url);
                }
                if (smallEl.length) {
                    smallEl.text('(' + task.standard + ')');
                }
            }
        }).catch(function() {
            /* ignore */
        });
    });
})();