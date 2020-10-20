'use strict';

const http = require('./http');

exports.publishFile = async (filePath, body, assConfig) => {
	const method = 'PUT';
	const url = assConfig.httpsUrl + '/files/' + filePath;
	const headers = {
		Authorization: 'bearer ' + assConfig.accessToken,
		Accept: 'application/json',
		'x-ass-acl': 'public',
		'Cache-Control': 'no-cache'
	};

	const response = await http.request({method, url, body, headers});

	const baseUrl = `${assConfig.httpsUrl}/users/${assConfig.username}/files/`;
	const {path} = JSON.parse(response.body);
	return baseUrl + path;
};
