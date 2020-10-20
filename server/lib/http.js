'use strict';

const request = require('request-prom');
const attempt = require('attempt-promise');
const logger = require('@aptoma/hapi-log')('hapi');
const ResponseError = request.ResponseError;
const nonRetriableStatus = [401, 404, 413];

exports.request = (opts, retries = 2) => {
	return attempt(
		{
			retries,
			onError(err) {
				logger.log(['http', 'error'], `${err.message}, ${err.response && err.response.body}`);
			}
		},
		() => {
			return request(opts).catch((err) => {
				if (err instanceof ResponseError && nonRetriableStatus.includes(err.statusCode)) {
					return err;
				}
				throw err;
			});
		}
	).then((res) => {
		if (res instanceof Error) {
			throw res;
		}
		return res;
	});
};
