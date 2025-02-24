// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import configDev from './configs/webpack/webpack.config.dev';
import configProd from './configs/webpack/webpack.config.prod';

import type { Configuration } from 'webpack';

const configMap: Record<string, Configuration> = {
    development: configDev,
    production: configProd,
};

const nodeEnv: string = process.env.NODE_ENV || '';

if (!configMap[nodeEnv]) {
    throw new Error(`Config not found for NODE_ENV='${nodeEnv}'`);
}

export default configMap[nodeEnv];
