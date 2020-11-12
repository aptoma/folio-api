'use strict';

const Boom = require('@hapi/boom');
const http = require('./lib/http');
const sandbox = require('./lib/sandbox');
const {publishFile} = require('./lib/smooth-storage');
const {getAssetsPath} = require('./lib/asset-builder');
const {createPdf} = require('./lib/brokkr');

exports.folio = async (req) => {
	const {
		data: {pages, edition, product, authorization},
		pageId,
		withPdf = false
	} = req.payload;

	const assConfig = req.auth.credentials.integrations.ass;
	const assetsPath = edition.data.folioAssetsPath || (await getAssetsPath(edition.data, assConfig, authorization));

	let customerModule;
	try {
		customerModule = await timeFunc(
			() => sandbox(`${assetsPath}/files/index.js`),
			(time) => req.log(['info', 'sandbox'], `Compiled ${assetsPath}/files/index.js in ${time}ms`)
		);
	} catch (err) {
		req.log(['err', 'sandbox'], err.message);
		return Boom.badRequest(`Unable to compile customer module from ${assetsPath}/files/index.js`);
	}

	const layers = await customerModule.render(req.payload, assetsPath, http);

	return timeFunc(
		() => publishLayers(layers),
		(time) => req.log(['info', 'pdf'], `Published ${layers.length} layers in ${time}ms (withPdf: ${withPdf})`)
	);

	async function publishLayers(layers) {
		const editionId = edition._id;
		const page = pages.find((p) => p._id === pageId);

		return Promise.all(
			layers.map(async (layer) => {
				const filename = `folio/${product.name}/${editionId}/${page.displayNumber}-${layer.name}.html`;
				const url = await publishFile(filename, layer.html, assConfig);

				const responseLayer = {
					name: layer.name,
					order: layer.order,
					htmlUrl: url
				};

				if (withPdf) {
					const pdfResponse = await createPdf(url, `${page.displayNumber}-${layer.name}`, {
						authorization
					});
					responseLayer.pdfUrl = pdfResponse.pdfUrl;
					responseLayer.imageUrl = pdfResponse.pdfImageUrl;
				}

				return responseLayer;
			})
		);
	}
};

async function timeFunc(func, logFunc) {
	const start = process.hrtime();
	const res = await func();
	const diff = process.hrtime(start);
	const time = diff[0] * 1000 + Math.round(diff[1] / 1000000);
	logFunc(time);
	return res;
}
