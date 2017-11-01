/*
 * Copyright (c) 2017 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2017 Tomas Machalek <tomas.machalek@gmail.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

const merge = require('webpack-merge');
const common = require('./scripts/build/webpack.common.js');
const kontext = require('./scripts/build/kontext');
const kplugins = require('./scripts/build/plugins');
const path = require('path');

const JS_PATH = path.resolve(__dirname, 'public/files/js');
const DIST_PATH = path.resolve(__dirname, 'public/files/dist');
const CSS_PATH = path.resolve(__dirname, 'public/files/css');
const THEMES_PATH = path.resolve(__dirname, 'public/files/themes');
const CONF_DOC = kontext.loadKontextConf(path.resolve(__dirname, 'conf/config.xml'));

module.exports = merge(common, {
    plugins: [
        new kplugins.PreparePlugin({
            confDoc: CONF_DOC,
            jsPath: JS_PATH,
            cssPath: CSS_PATH,
            themesPath: THEMES_PATH,
            isProduction: false
        })
    ],
    devServer: {
        /* for NFS etc. use:
        watchOptions: {
           poll: true
        },
        */
        contentBase: path.resolve(__dirname, "../../public/files/dist"),
        compress: true,
        port: 9000,
        host: 'localhost',
        public: 'kontext.korpus.test',
        publicPath: '/kontext/files/dist/',
        inline: false
    },
    devtool: "source-map"
});