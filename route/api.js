// This file defines a minimal API for running accessibility analyses
// directly from the server without relying on Pa11y Webservice. It uses
// the `pa11y` package to spin up a headless browser and execute the
// configured rules on the provided URL. The route accepts a JSON body
// describing the task and returns the full Pa11y result as JSON. No
// results are stored on the server; clients are expected to persist
// data (for example, in IndexedDB).

'use strict';

const pa11y = require('pa11y');

module.exports = function api(app) {
    app.express.post('/api/run', async (request, response, next) => {
        const {
            url,
            standard,
            timeout,
            wait,
            actions,
            username,
            password,
            headers,
            hideElements,
            ignore
        } = request.body || {};
        if (!url) {
            return response.status(400).json({error: 'Missing url'});
        }
        try {
            const options = {};
            if (standard) options.standard = standard;
            if (timeout) options.timeout = Number(timeout);
            if (wait) options.wait = Number(wait);
            if (Array.isArray(actions)) options.actions = actions;
            if (username) options.username = username;
            if (password) options.password = password;
            if (hideElements) options.hideElements = hideElements;
            if (headers) options.headers = headers;
            if (ignore) options.ignore = ignore;
            const result = await pa11y(url, options);
            response.json(result);
        } catch (err) {
            // Pass errors to the default error handler. This will render
            // a 500 page in development. In production, the client
            // receives a 500 response.
            next(err);
        }
    });
};