'use strict';

const http = require('./lib/http');
const sandbox = require('./lib/sandbox');
const {publishFile} = require('./lib/smooth-storage');

exports.folio = async (req) => {
	const {
		data: {pages, edition, product},
		pageId
	} = req.payload;
	const assetsPath = edition.data.folioAssetsPath;
	const editionId = edition._id;
	const page = pages.find((p) => p._id === pageId);

	const customerModule = await sandbox(assetsPath + '/files/index.js');

	const layers = await customerModule.render(req.payload, assetsPath, http);

	return layers.reduce(async (acc, layer) => {
		acc = await acc;

		const filename = `folio/${product.name}/${editionId}/${page.displayNumber}-${layer.name}.html`;
		const url = await publishFile(filename, layer.html, req.auth.credentials.integrations.ass);

		acc.push({
			name: layer.name,
			order: layer.order,
			url
		});

		return acc;
	}, Promise.resolve([]));
};
