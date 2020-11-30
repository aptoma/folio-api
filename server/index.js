'use strict';

// For local dev, ignore self signed certificate errors
if (!process.env.NODE_ENV) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const Hapi = require('@hapi/hapi');
const config = require('./config');
const pkgInfo = require('../package.json');
const revisionFile = __dirname + '/../REVISION';
const handlers = require('./handlers');
const Consumer = require('@aptoma/sqs-consumer');

const server = Hapi.server(config.server);

(async () => {
	try {
		await init();
	} catch (err) {
		console.log('Init failed', err);
		process.exit(1);
	}

	if (require.main !== module) {
		// don't start server if this file was required. Fix for unit tests.
		return;
	}

	try {
		await server.start();
		server.log('info', pkgInfo.name + ' v' + pkgInfo.version + ' started at: ' + server.info.uri);
	} catch (err) {
		console.error(err.stack);
		console.log('Server error', err);
		process.exit(1);
	}
})();

async function init() {
	const earlyPlugins = [];
	if (process.env.NODE_ENV !== 'test') {
		// Logging must be first so we can see output from other plugins
		earlyPlugins.unshift({
			plugin: require('@aptoma/hapi-log'),
			options: {
				meta: require('./lib/log/meta'),
				onPreResponseError: true
			}
		});
	}

	earlyPlugins.push({
		plugin: require('@aptoma/hapi-dredition-auth'),
		options: {
			dredition: config.dredition,
			loadIntegrations: true
		}
	});
	earlyPlugins.push(require('hapi-auth-bearer-token'));
	earlyPlugins.push(require('hapi-auth-jwt2'));

	await server.register(earlyPlugins);

	server.auth.strategy('jwt', 'jwt', {
		verify: server.plugins['dredition-auth'].validateJwt,
		tokenType: 'Bearer'
	});

	server.auth.strategy('apikey', 'bearer-access-token', {
		accessTokenName: 'apikey',
		tokenType: 'apikey',
		allowQueryToken: false,
		validate: server.plugins['dredition-auth'].validateApiKey
	});

	server.auth.default({
		mode: 'required',
		strategies: ['jwt', 'apikey']
	});

	let statusCallback = (data) => data;
	if (config.sqs) {
		statusCallback = (data) => {
			data.lastPoll = lastPoll.toISOString();
			return data;
		};
		await sqsInit(server.plugins['dredition-auth']);
	}

	await server.register([
		require('@aptoma/hapi-graceful-stop'),
		require('./routes'),
		{
			plugin: require('@aptoma/hapi-static-headers'),
			options: {
				headers: {
					'X-App-Version': () => pkgInfo.version
				}
			}
		},
		{
			plugin: require('@aptoma/hapi-route-status'),
			options: {version: pkgInfo.version, revisionFile, callback: statusCallback}
		}
	]);
}

let lastPoll = new Date();
async function sqsInit(dreditionAuth) {
	const app = new Consumer(
		Object.assign({}, config.sqs, {
			handleMessage: handlers.handleSQSMessage(dreditionAuth, server)
		})
	);

	app.on('didPoll', () => (lastPoll = new Date()));
	app.on('error', (err) => {
		if (err.name === 'RequestAbortedError') {
			server.log(['info', 'sqs'], 'poll request aborted');
			return;
		}

		server.log(['error', 'sqs'], err);
	});

	(async () => {
		try {
			server.log(['info', 'sqs'], 'Starting to poll for work');
			await app.start();
		} catch (err) {
			server.log(['error', 'sqs', 'start'], err);
			process.exit(1);
		}
	})();
}
