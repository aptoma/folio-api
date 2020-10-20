'use strict';

const {NodeVM} = require('vm2');
const request = require('request-prom');

module.exports = async (scriptUrl) => {
	const customerCode = (await request(scriptUrl)).body;

	const vm = new NodeVM({
		sandbox: {self: null}
	});

	return vm.run(customerCode.toString());
};
