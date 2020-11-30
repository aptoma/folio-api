'use strict';

const Boom = require('@hapi/boom');
const http = require('./lib/http');
const sandbox = require('./lib/sandbox');
const {publishFile} = require('./lib/smooth-storage');
const {getAssetsPath} = require('./lib/asset-builder');
const {createPdf} = require('./lib/brokkr');
const {sendFolioResponse} = require('./lib/dredition');

exports.handleSQSMessage = (dreditionAuth, server) => {
	return async (message, cb) => {
		server.log(['info', 'sqs'], `Processing ${message.MessageId}`);
		const payload = JSON.parse(message.Body);
		const {data} = payload;

		let credentials;
		try {
			credentials = await getCredentials(dreditionAuth, data.authorization);
		} catch (err) {
			server.log(['sqs', 'error'], err.message);
			return cb(); // no retry
		}

		await handleMessage(payload, credentials.integrations.ass, server);
		return cb();
	};
};

exports.folio = async (req) => {
	return handleMessage(req.payload, req.auth.credentials.integrations.ass, req);
};

async function handleMessage(payload, assConfig, logger) {
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
	} = payload;
	const page = pages.find((p) => p._id === pageId);
	const editionId = edition._id;
	logger.log(
		['info'],
		`Create folio for ${clientId}/${product.name}/${edition.name || editionId}/${page.displayNumber}`
	);

	const assetsPath = edition.data.folioAssetsPath || (await getAssetsPath(edition.data, assConfig, authorization));

	const customerModule = await compileCustomerModule();
	const layers = await renderLayers();

	return await publishLayers();

	async function compileCustomerModule() {
		try {
			return await timeFunc(
				() => sandbox(`${assetsPath}/files/index.js`, Boolean(edition.data.folioAssetsPath)),
				(time) => logger.log(['info', 'sandbox'], `Compiled ${assetsPath}/files/index.js in ${time}ms`)
			);
		} catch (err) {
			logger.log(['err', 'sandbox'], err.message);
			throw await handleError(
				Boom.badRequest(`Unable to compile customer module from ${assetsPath}/files/index.js`)
			);
		}
	}

	async function renderLayers() {
		const {data, pageId} = payload;
		try {
			return await timeFunc(
				() => customerModule.render({data, pageId}, assetsPath, http),
				(time) => logger.log(['info', 'render'], `Rendered layers in ${time}ms`)
			);
		} catch (err) {
			logger.log(['err', 'render'], err.message);
			throw await handleError(Boom.badRequest(err));
		}
	}

	async function publishLayers() {
		try {
			return await timeFunc(
				() => publish(layers),
				(time) =>
					logger.log(['info', 'pdf'], `Published ${layers.length} layers in ${time}ms (withPdf: ${withPdf})`)
			);
		} catch (err) {
			logger.log(['err', 'publish'], err.message);
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
					logger.log(['err', 'notify'], err.message);
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
				logger.log(['err', 'notify'], notifyError.message);
			}
		}
		return err;
	}
}

async function timeFunc(func, logFunc) {
	const start = process.hrtime();
	const res = await func();
	const diff = process.hrtime(start);
	const time = diff[0] * 1000 + Math.round(diff[1] / 1000000);
	logFunc(time);
	return res;
}

async function getCredentials(dreditionAuth, authorization) {
	const matches = /^((apikey|Bearer)\s)?([^$]+)/.exec(authorization);

	const type = matches[2];
	const token = matches[3];

	let validation;
	if (type === 'Bearer') {
		validation = await dreditionAuth.validateJwt(null, {auth: {token}});
	} else {
		validation = await dreditionAuth.validateApiKey(null, token);
	}

	if (!validation.isValid) {
		throw new Error('Invalid authentication');
	}

	validation.credentials.authHeader = `${type || 'apikey'} ${token}`;
	return validation.credentials;
}
