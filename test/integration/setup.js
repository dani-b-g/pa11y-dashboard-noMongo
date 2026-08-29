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

const createNavigator = require('./helper/navigate');
const createWebserviceClient = require('pa11y-webservice-client-node');

// `pa11y-webservice` is no longer a dependency of this fork: nothing at runtime
// starts an embedded webservice. This suite still targets the old Mongo-backed
// architecture, so it needs the package installed alongside a MongoDB instance
// and a webservice on WEBSERVICE_PORT. Resolve it lazily to fail with an
// explanation rather than a bare MODULE_NOT_FOUND at import time.
function loadFixtures(...args) {
	let load;
	try {
		load = require('pa11y-webservice/data/fixture/load');
	} catch (error) {
		if (error.code !== 'MODULE_NOT_FOUND') {
			throw error;
		}
		throw Error(
			'This integration suite exercises the legacy Mongo-backed architecture and ' +
			'requires `pa11y-webservice`, which this fork no longer depends on. ' +
			'Install it explicitly (`npm install pa11y-webservice`) and provide a MongoDB ' +
			'instance to run these tests.'
		);
	}
	return load(...args);
}

const config = {
	host: process.env.HOST || '0.0.0.0',
	port: Number(process.env.PORT) || 4000,
	noindex: true,
	readonly: false
};

const webserviceConfig = {
	database: process.env.WEBSERVICE_DATABASE || 'mongodb://127.0.0.1/pa11y-dashboard-integration-test',
	host: process.env.WEBSERVICE_HOST || '0.0.0.0',
	port: Number(process.env.WEBSERVICE_PORT) || 3000,
	dbOnly: true
};

async function assertDashboardIsAvailable(baseUrl) {
	try {
		const response = await fetch(baseUrl);
		if (!response.ok) {
			console.error('Service found but returned an error. HTTP status:', response.status);
			throw Error();
		}
	} catch (error) {
		console.error('Service under test not found or returned error.');
		throw error;
	}
}

before(async function() {
	this.baseUrl = `http://${config.host}:${config.port}`;

	await assertDashboardIsAvailable(this.baseUrl);
	await loadFixtures('test', webserviceConfig);

	this.webservice = createWebserviceClient(`http://${webserviceConfig.host}:${webserviceConfig.port}/`);

	this.last = {};
	this.navigate = createNavigator(this.baseUrl, this.last);
});

afterEach(async function() {
	await loadFixtures('test', webserviceConfig);
});
