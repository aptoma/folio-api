'use strict';

const http = require('./http');
const config = require('../config');

exports.createPdf = async (htmlUrl, title, imageFormat, headers) => {
	const method = 'POST';
	const url = config.brokkr.url + '/pdf/from-url';

	const response = await http.request(
		{
			method,
			url,
			json: true,
			body: {
				url: htmlUrl,
				title,
				imageFormat
			},
			headers
		},
		0
	);

	return response.body;
};
