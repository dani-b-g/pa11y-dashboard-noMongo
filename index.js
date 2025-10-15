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

process.on('SIGINT', () => {
	console.log('\nGracefully shutting down from SIGINT (Ctrl-C)');
	process.exit();
});

initDashboard(config, (error, app) => {
	if (error) {
		console.error(error.stack);
		process.exit(1);
	}

	const mode = process.env.NODE_ENV;
	const dashboardAddress = app.server.address();

	console.log(kleur.underline().magenta('\nPa11y Dashboard started'));
	console.log(kleur.grey('mode:               %s'), mode);
	console.log(kleur.grey('uri (intended):     %s'), `http://localhost:${config.port}/`);
	console.log(
		kleur.grey(`uri (actual, ${dashboardAddress.family}): %s`),
		`http://${dashboardAddress.address}:${dashboardAddress.port}/`
	);

	app.on('route-error', routeError => {
		const stack = (routeError.stack ? routeError.stack.split('\n') : [routeError.message]);
		const msg = kleur.red(stack.shift());
		console.error('');
		console.error(msg);
		console.error(kleur.grey(stack.join('\n')));
	});

    // The dashboard now defaults to an in-memory webservice which stores
    // tasks and results locally and runs analyses via the Pa11y library.
    // If `config.webservice` is provided as a URL string the dashboard will
    // connect to that remote Pa11y Webservice. If it is provided as an
    // object (legacy format) it will be ignored and the in-memory service
    // will still be used. To connect to an external webservice set
    // WEBSERVICE_URL or the `webservice` property in your config file.
    if (typeof config.webservice === 'object') {
        console.log(kleur.yellow('\nNote: A `webservice` configuration object was provided but the embedded webservice is disabled.'));
        console.log(kleur.yellow('The dashboard is using the in-memory service. To connect to an external Pa11y Webservice, set WEBSERVICE_URL to its base URL.'));
    }
});
