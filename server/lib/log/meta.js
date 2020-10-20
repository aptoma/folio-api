'use strict';

const Hoek = require('@hapi/hoek');

/**
 * Default meta data to append to logs
 * @param  {Object|undefined} request
 * @return {Object|undefined}
 */
module.exports = (request) => {
	if (!request) {
		return;
	}

	const data = {
		requestId: request.info.id
	};

	const credentials = Hoek.reach(request, 'auth.credentials');
	if (credentials && credentials.account) {
		data.account = credentials.account.clientId;
	}

	return data;
};
