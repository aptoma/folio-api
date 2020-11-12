'use strict';

const Boom = require('@hapi/boom');
const http = require('./http');
const {assetBuilder: assetBuilderConfig} = require('../config');

exports.getAssetsPath = async (editionData, assConfig, authorization) => {
	if (!editionData.folioRepoBranch) {
		throw Boom.badRequest('editionData.folioRepoBranch is missing, should contain {org}/{repo}/{branch}');
	}
	const method = 'GET';
	const [org, repo, branch = 'master'] = editionData.folioRepoBranch.split('/');

	if (!(org && repo && branch)) {
		throw Boom.badRequest('editionData.folioRepoBranch should contain {org}/{repo}/{branch}');
	}

	if (org !== 'aptoma') {
		throw Boom.badRequest('Repository must be under the aptoma organization');
	}

	const url = `${assetBuilderConfig.url}/assets/${org}/${repo}/${branch}`;
	const headers = {
		// For local development, you can provide your own apikey, in order to use prod accounts for asset builder
		authorization: assetBuilderConfig.apikey ? `apikey ${assetBuilderConfig.apikey}` : authorization
	};

	try {
		const response = await http.request({method, url, headers, json: true});
		return `${assConfig.httpsUrl}/users/${assConfig.username}/files/assets/${response.body.revision}`;
	} catch (err) {
		throw Boom.badRequest(err.message);
	}
};
