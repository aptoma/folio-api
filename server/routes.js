'use strict';

const handlers = require('./handlers');

module.exports = {
	name: 'routes',
	register
};

function register(server) {
	server.route({
		method: 'POST',
		path: '/folio',
		options: {
			handler: handlers.folio
		}
	});
}
