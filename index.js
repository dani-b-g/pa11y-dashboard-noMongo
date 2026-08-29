// This file is part of Pa11y Dashboard.
//
// Pa11y Dashboard is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Pa11y Dashboard is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Pa11y Dashboard.  If not, see <http://www.gnu.org/licenses/>.
'use strict';

// The dashboard previously imported and started an embedded Pa11y Webservice
// when the `webservice` configuration was provided as an object. That
// behaviour required a MongoDB instance and coupled the dashboard
// tightly to the webservice’s internal implementation. To decouple the
// dashboard from MongoDB, we remove the import of the webservice here.
// If you need to run the webservice yourself please start it as a
// separate process and point the dashboard at its API using the
// `WEBSERVICE_URL` environment variable or the `webservice` string
// configuration. See `webservice-client.js` for the client
// implementation which speaks directly to the API.

// const initService = require('pa11y-webservice');
const kleur = require('kleur');

const config = require('./config');
const initDashboard = require('./app');

initDashboard(config, (error, app) => {
	if (error) {
		console.error(error.stack);
		process.exit(1);
	}

	setupSignalHandlers(app);
	logStartup(app);
	setupErrorLogging(app);
	warnAboutLegacyWebserviceConfig();
});

// Handle SIGINT and SIGTERM signals so hopefully in-flight requests and
// Chromium processes are not orphaned on shutdown
function setupSignalHandlers(app) {
	function gracefulShutdown(signal) {
		console.log(`\nGracefully shutting down (${signal})`);
		app.server.close(() => {
			console.log('HTTP server closed');
			process.exit(0);
		});
	}
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));
	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// Log both the intended URI and the actual bound address, which can differ when
// the OS assigns a different port or the app binds to 0.0.0.0 vs localhost
function logStartup(app) {
	const mode = process.env.NODE_ENV;
	const dashboardAddress = app.server.address();
	console.log(kleur.underline().magenta('\nPa11y Dashboard started'));
	console.log(kleur.grey('mode:               %s'), mode);
	console.log(kleur.grey('uri (intended):     %s'), `http://localhost:${config.port}/`);
	console.log(
		kleur.grey(`uri (actual, ${dashboardAddress.family}): %s`),
		`http://${dashboardAddress.address}:${dashboardAddress.port}/`
	);
}

// Route errors are emitted as events rather than crashing the process
// so they need an explicit listener to be logged
function setupErrorLogging(app) {
	app.on('route-error', routeError => {
		const stack = (routeError.stack ? routeError.stack.split('\n') : [routeError.message]);
		const msg = kleur.red(stack.shift());
		console.error('');
		console.error(msg);
		console.error(kleur.grey(stack.join('\n')));
	});
}

// The dashboard now defaults to an in-memory webservice which stores tasks and
// results locally and runs analyses via the Pa11y library. If `config.webservice`
// is a URL string the dashboard connects to that remote Pa11y Webservice. If it
// is an object (the legacy Mongo-flavoured format) it is ignored and the
// in-memory service is used instead, so warn about it here.
function warnAboutLegacyWebserviceConfig() {
	if (typeof config.webservice !== 'object' || config.webservice === null) {
		return;
	}
	console.log(kleur.yellow('\nNote: A `webservice` configuration object was provided but the embedded webservice is disabled.'));
	console.log(kleur.yellow('The dashboard is using the in-memory service. To connect to an external Pa11y Webservice, set WEBSERVICE_URL to its base URL.'));
}
