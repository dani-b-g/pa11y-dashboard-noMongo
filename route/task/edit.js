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

const presentTask = require('../../view/presenter/task');
const getStandards = require('../../data/standards');
const httpHeaders = require('http-headers');

module.exports = function edit(app) {
    app.express.get('/:id/edit', (request, response, next) => {
        const id = request.params.id;
        app.webservice.task(id).get({}, (error, task) => {
            // If the task is not found (e.g. after a restart), render a
            // placeholder edit form. The client-side edit-manager script
            // will populate the fields from IndexedDB.
            if (error || !task) {
                // Build a default list of standards, selecting the first
                const standards = getStandards().map((standard, index) => {
                    standard.selected = (index === 0);
                    // No rules ignored by default
                    standard.rules = standard.rules.map(rule => {
                        rule.ignored = false;
                        return rule;
                    });
                    return standard;
                });
                const defaultStandard = standards.find(s => s.selected);
                const placeholder = {
                    id: id,
                    name: '',
                    url: '',
                    standard: defaultStandard ? defaultStandard.title : '',
                    ignore: [],
                    timeout: '',
                    wait: '',
                    actions: '',
                    username: '',
                    password: '',
                    headers: '',
                    hideElements: ''
                };
                return response.render('task/edit', {
                    edited: (typeof request.query.edited !== 'undefined'),
                    standards,
                    task: presentTask(placeholder),
                    isTaskSubPage: true
                });
            }
            const standards = getStandards().map(standard => {
                if (standard.title === task.standard) {
                    standard.selected = true;
                }
                standard.rules = standard.rules.map(rule => {
                    if (task.ignore.indexOf(rule.name) !== -1) {
                        rule.ignored = true;
                    }
                    return rule;
                });
                return standard;
            });
            task.actions = (task.actions ? task.actions.join('\n') : '');
            response.render('task/edit', {
                edited: (typeof request.query.edited !== 'undefined'),
                standards,
                task: presentTask(task),
                isTaskSubPage: true
            });
        });
    });

	/* eslint-disable complexity */
	/* eslint-disable max-statements */
    app.express.post('/:id/edit', (request, response, next) => {
        const id = request.params.id;
        app.webservice.task(id).get({}, (error, task) => {
            // If the task doesn't exist (e.g. after a restart), we don't
            // need to update the in-memory store. Client-side scripts
            // will update IndexedDB. Redirect to indicate success.
            if (error || !task) {
                return response.redirect(`/${id}/edit?edited`);
            }
            const originalActions = request.body.actions;
            const originalHeaders = request.body.headers;

            request.body.ignore = request.body.ignore || [];
            request.body.timeout = request.body.timeout || undefined;
            request.body.wait = request.body.wait || undefined;

            if (request.body.actions) {
                request.body.actions = request.body.actions.split(/[\r\n]+/)
                    .map(action => {
                        return action.trim();
                    })
                    .filter(action => {
                        return Boolean(action);
                    });
            }

            if (!request.body.actions) {
                request.body.actions = [];
            }

            request.body.username = request.body.username || undefined;
            request.body.password = request.body.password || undefined;
            request.body.hideElements = request.body.hideElements || undefined;
            request.body.headers = httpHeaders(request.body.headers || '', true);

            app.webservice.task(id).edit(request.body, webserviceError => {
                if (webserviceError) {
                    // Populate the task with the attempted values so that
                    // the form is repopulated. Use originalActions and
                    // originalHeaders to maintain formatting.
                    task.name = request.body.name;
                    task.ignore = request.body.ignore;
                    task.timeout = request.body.timeout;
                    task.wait = request.body.wait;
                    task.actions = originalActions;
                    task.username = request.body.username;
                    task.password = request.body.password;
                    task.headers = originalHeaders;
                    task.hideElements = request.body.hideElements;
                    const standards = getStandards().map(standard => {
                        if (standard.title === task.standard) {
                            standard.selected = true;
                        }
                        standard.rules = standard.rules.map(rule => {
                            if (task.ignore.indexOf(rule.name) !== -1) {
                                rule.ignored = true;
                            }
                            return rule;
                        });
                        return standard;
                    });
                    return response.render('task/edit', {
                        webserviceError,
                        standards,
                        task,
                        isTaskSubPage: true
                    });
                }
                response.redirect(`/${id}/edit?edited`);
            });
        });
    });
};
