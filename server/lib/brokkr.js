'use strict';

const request = require('request-prom');
const Boom = require('@hapi/boom');
const config = require('../config');

exports.createPdf = async (htmlUrl, title, imageFormat, headers) => {
	const method = 'POST';
	const url = config.brokkr.url + '/pdf/from-url';

	try {
		const response = await request({
			method,
			url,
			json: true,
			body: {
				url: htmlUrl,
				title,
				imageFormat
			},
			headers
		});

		return response.body;
	} catch (err) {
		throw Boom.boomify(err, {statusCode: err.statusCode});
	}
};
