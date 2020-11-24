'use strict';

const Joi = require('joi');
const handlers = require('./handlers');

module.exports = {
	name: 'routes',
	register
};

function register(server) {
	server.route({
		method: 'POST',
		path: '/folio',
		options: {
			handler: handlers.folio,
			validate: {
				options: {
					stripUnknown: true,
					allowUnknown: true
				},
				failAction: (req, h, err) => err,
				payload: Joi.object({
					data: Joi.object().required(),
					pageId: Joi.string(),
					withPdf: Joi.bool().default(false),
					notify: Joi.bool().default(false),
					imageFormat: Joi.string()
						.allow('jpg', 'png')
						.default('jpg')
				}).required()
			}
		}
	});
}
