(function (root, factory) {
    if (typeof exports === 'object') {
        var utils = require('Bucket/common/utils');
        var logger = require('Bucket/common/logger');
        var driver = require('Bucket/Driver');
        var Error = require('Bucket/Error');

        module.exports = factory(utils, logger, driver, Error);

    } else if (typeof define === 'function' && define.amd) {
        define(['Bucket/common/utils', 'Bucket/common/Logger', 'Bucket/Driver', 'Bucket/Error'] ,function (utils, logger, driver, Error) {
            return factory(utils, logger, driver, Error);
        });

    } else {
        root.Bucket = factory(Bucket.utils, Bucket.Logger, Bucket.Driver, Bucket.Error);
    }
}(this, function (utils, Logger, Driver, Error) {
    /**
     * @module Bucket
     */

    /**
     * This class represents a data store
     *
     * @class Bucket
     * @constructor
     *
     * @param {object} options
     *  @param {object} options.driver_options parameters to pass to the driver. See {{#crossLink "Driver/defaultOptions:property"}}{{/crossLink}}
     *  @param {Array} [options.drivers] a list of prioritized driver names to choose from
     */
    function Bucket(options) {
        var driver = Bucket.choose(options.drivers);

        if (!driver) return false;

        return new driver(options.driver_options);
    }

    /**
     * a stack of all registered driver names
     * @property stack
     * @type {Array}
     * @private
     */
    Bucket.stack = [];

    /**
     * a named list of all registered drivers
     * @property drivers
     * @type {object}
     * @private
     */
    Bucket.drivers = {};

    /**
     * a reference to the last automatically chosen driver
     * @property chosen_driver
     * @type {Driver}
     * @private
     */
    Bucket.chosen_driver = null;

    /**
     * chooses a driver to use.
     *
     * @private
     * @method choose
     * @static
     *
     * @param {Array} [list] if provided, will choose a driver from that list
     *
     * @return ns.Driver
     */
    Bucket.choose = function (list) {
        var list_provided = !!list,
            i, driver, name;

        list = list || Bucket.stack;

        if (!list_provided && Bucket.chosen_driver) return Bucket.chosen_driver;

        for (i = 0; name = list[i]; i++) {
            driver = Bucket.drivers[name];

            if (driver.test()) {
                if (!list_provided) Bucket.chosen_driver = driver;
                return driver;
            }
        }

        return null;
    };

    /**
     * Registers a driver.<br/>
     * A driver must always have a <b>test</b> method<br/>
     *
     * @method registerDriver
     * @static
     *
     * @param {string} name
     * @param {object} params a list of methods and properties for the new driver. See {{#crossLink "Driver"}}{{/crossLink}} for more info.
     *
     * @return {Driver} the new driver
     */
    Bucket.registerDriver = function registerDriver(name, params) {
        var d;

        function driver() {
            this.$construct(arguments);
            this.init && this.init(arguments);
        }

        params = params || {};

        if (!params.test || typeof params.test !== 'function') {
            throw "Driver must always have a test method";
        }

        d = utils.inherit(driver, Driver, params);
        d.test = params.test;
        d.$name = name;

        Bucket.stack.push(d.$name);

        Bucket.drivers[name] = d;
        return d;
    };

    /**
     * Aliases a drivers name
     *
     * @method alias
     *
     * @param {string} alias
     * @param {string} name
     *
     * @static
     *
     * @return {Driver} aliased driver
     */
    Bucket.alias = function (alias, name) {
        Bucket.drivers[alias] = Bucket.drivers[name];

        return Bucket.drivers[alias];
    };



    Bucket.utils = utils;
    Bucket.Logger = Logger;
    Bucket.Driver = Driver;
    Bucket.Error = Error;

    return Bucket;
}));
