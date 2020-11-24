'use strict';

const request = require('request-prom');
const config = require('../config');

exports.sendFolioResponse = async (editionId, page, issuedBy, authorization, error) => {
	const method = 'PATCH';

	const payload = {
		page,
		issuedBy
	};

	if (error) {
		payload.error = error;
	}

	const url = `${config.dredition.url}/print-editions/${editionId}/create-folio-response`;

	try {
		return await sendRequest();
	} catch (err) {
		if (err.statusCode === 409) {
			console.log('Conflict, retry');
			return sendRequest();
		}
	}

	async function sendRequest() {
		const response = await request({
			method,
			url,
			json: true,
			body: payload,
			headers: {authorization}
		});

		return response.body;
	}
};
