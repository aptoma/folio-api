'use strict';

const fs = require('fs');

const file = `${__dirname}/../config/config${process.env.NODE_ENV ? '.' + process.env.NODE_ENV : ''}.js`;

// eslint-disable-next-line no-sync
if (!fs.existsSync(file)) {
	throw new Error('Unable to load configuration file:' + file);
}

const config = require(file);

config.server.port = process.env.PORT || config.server.port;

if (config.server.tls) {
	config.server.tls = {
		// eslint-disable-next-line no-sync
		key: fs.readFileSync(config.server.tls.key),
		// eslint-disable-next-line no-sync
		cert: fs.readFileSync(config.server.tls.cert)
	};
}

module.exports = config;
