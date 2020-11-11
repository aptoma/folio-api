'use strict';

module.exports = {
	server: {
		host: 'localhost',
		port: 9110
	},
	dredition: {
		url: 'https://dredition-api.aptoma.no'
	},
	brokkr: {
		url: 'https://brokkr.prod.ecs.aws.aptoma.no'
	},
	assetBuilder: {
		url: 'https://asset-builder.prod.ecs.aws.aptoma.no',
		// When using an asset builder in a different environment from DrEdition, apikey must be hardcoded
		apikey: ''
	}
};
