'use strict';

const Boom = require('@hapi/boom');
const http = require('./lib/http');
const sandbox = require('./lib/sandbox');
const {publishFile} = require('./lib/smooth-storage');
const {getAssetsPath} = require('./lib/asset-builder');
const {createPdf} = require('./lib/brokkr');
const {sendFolioResponse} = require('./lib/dredition');

exports.folio = async (req) => {
	const {
		data: {
			pages,
			edition,
			product,
			authorization,
			issuedBy,
			account: {clientId}
		},
		pageId,
		imageFormat,
		withPdf,
		notify
	} = req.payload;
	const page = pages.find((p) => p._id === pageId);
	const editionId = edition._id;
	req.log(
		['info'],
		`Create folio for ${clientId}/${product.name}/${edition.name || editionId}/${page.displayNumber}`
	);

	const assConfig = req.auth.credentials.integrations.ass;
	const assetsPath = edition.data.folioAssetsPath || (await getAssetsPath(edition.data, assConfig, authorization));

	const customerModule = await compileCustomerModule();
	const layers = await renderLayers();

	return await publishLayers();

	async function compileCustomerModule() {
		try {
			return await timeFunc(
				() => sandbox(`${assetsPath}/files/index.js`, Boolean(edition.data.folioAssetsPath)),
				(time) => req.log(['info', 'sandbox'], `Compiled ${assetsPath}/files/index.js in ${time}ms`)
			);
		} catch (err) {
			req.log(['err', 'sandbox'], err.message);
			throw await handleError(
				Boom.badRequest(`Unable to compile customer module from ${assetsPath}/files/index.js`)
			);
		}
	}

	async function renderLayers() {
		const {data, pageId} = req.payload;
		try {
			return await timeFunc(
				() => customerModule.render({data, pageId}, assetsPath, http),
				(time) => req.log(['info', 'render'], `Rendered layers in ${time}ms`)
			);
		} catch (err) {
			req.log(['err', 'render'], err.message);
			throw await handleError(Boom.badRequest(err));
		}
	}

	async function publishLayers() {
		try {
			return await timeFunc(
				() => publish(layers),
				(time) =>
					req.log(['info', 'pdf'], `Published ${layers.length} layers in ${time}ms (withPdf: ${withPdf})`)
			);
		} catch (err) {
			req.log(['err', 'publish'], err.message);
			throw await handleError(err);
		}

		async function publish(layers) {
			const publishedLayers = await Promise.all(
				layers.map(async (layer) => {
					const title = `${page.displayNumber}-${layer.name}`;
					const filename = `folio/${product.name}/${editionId}/${title}.html`;
					const url = await publishFile(filename, layer.html, assConfig);

					const responseLayer = {
						name: layer.name,
						order: layer.order,
						htmlUrl: url
					};

					if (withPdf) {
						const pdfResponse = await createPdf(url, title, imageFormat, {
							authorization
						});
						responseLayer.pdfUrl = pdfResponse.pdfUrl;
						responseLayer.imageUrl = pdfResponse.pdfImageUrl;
					}

					return responseLayer;
				})
			);

			if (notify) {
				try {
					await sendFolioResponse(
						editionId,
						{_id: pageId, folioLayers: publishedLayers},
						issuedBy,
						authorization
					);
				} catch (err) {
					req.log(['err', 'notify'], err.message);
				}
			}

			return publishedLayers;
		}
	}

	async function handleError(err) {
		if (!err.isBoom) {
			err = Boom.boomify(err);
		}
		if (notify) {
			try {
				await sendFolioResponse(editionId, {_id: pageId}, issuedBy, authorization, err.message);
				err.output.payload.callbackSent = true;
			} catch (notifyError) {
				req.log(['err', 'notify'], notifyError.message);
			}
		}
		return err;
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
