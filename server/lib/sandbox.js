'use strict';

const {NodeVM, VMScript} = require('vm2');
const request = require('request-prom');

const scriptCache = {};

module.exports = async (scriptUrl) => {
	const vm = new NodeVM({
		sandbox: {self: null}
	});

	if (!scriptCache[scriptUrl]) {
		const customerCode = (await request(scriptUrl)).body.toString();
		scriptCache[scriptUrl] = {
			script: new VMScript(customerCode)
		};
	}
	scriptCache[scriptUrl].lastAccess = new Date();

	const instance = vm.run(scriptCache[scriptUrl].script);
	cleanUpCache();

	return instance;
};

function cleanUpCache() {
	const ONE_HOUR = 60 * 60 * 1000;
	const oneHourAgo = new Date(new Date() - ONE_HOUR);
	Object.keys(scriptCache).forEach((key) => {
		// Remove all scripts that haven't been accessed the last hour
		if (scriptCache[key].lastAccess < oneHourAgo) {
			delete scriptCache[key];
		}
	});
}
