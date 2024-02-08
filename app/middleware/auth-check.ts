/*
 * SPDX-License-Identifier: Apache-2.0
 */

import * as jwt from 'jsonwebtoken';
import config from '../explorerconfig.json';
import { Platform } from '../platform/fabric/Platform';
import { helper } from '../common/helper';

const logger = helper.getLogger('AuthCheck');

/**
 *  The Auth Checker middleware function.
 */
export const authCheckMiddleware = (platform: Platform) => (req, res, next) => {
	const networkId = req.headers['X-Network-Id'];

	if (networkId) {
		logger.info('X-Network-Id header found', networkId);
		const authEnabled = platform
			.getClient(networkId)
			.instance.fabricGateway.fabricConfig.getEnableAuthentication();

		if (!authEnabled) {
			logger.info('Skip authentication');

			req.requestUserId = 'dummy-user';
			req.network = networkId;

			return next();
		}
	}

	if (!req.headers.authorization) {
		return res.status(401).end();
	}

	// Get the last part from a authorization header string like "bearer token-value"
	const token = req.headers.authorization.split(' ')[1];

	// Decode the token using a secret key-phrase
	return jwt.verify(token, config.jwt.secret, (err, decoded) => {
		// The 401 code is for unauthorized status
		if (err) {
			return res.status(401).end();
		}

		const requestUserId = decoded.user;

		req.requestUserId = requestUserId;
		req.network = decoded.network;

		// TODO: check if a user exists, otherwise error

		return next();
	});
};
