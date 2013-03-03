(function (root, factory) {
    if (typeof exports === 'object') {
        var utils = require('Bucket/common/utils');
        var logger = require('Bucket/common/logger');
        var driver = require('Bucket/Driver');

        module.exports.Bucket = factory(utils, logger, driver);

    } else if (typeof define === 'function' && define.amd) {
        define(['Bucket/common/utils', 'Bucket/common/Logger', 'Bucket/Driver'] ,function (utils, logger, driver) {
            return {Bucket : factory(utils, logger, driver)};
        });

    } else {
        root.Bucket = factory(Bucket.utils, Bucket.Logger, Bucket.Driver);
    }
}(this, function (utils, Logger, Driver) {
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

        params.defaultOptions = utils.merge(Driver.defaultOptions, params.defaultOptions || {});

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

    /**
     * @class Bucket.Error
     * @constructor
     * @extends Error
     */
    Bucket.Error = function (type, msg, original_error) {
        this.name = 'Bucket Error';
        this.type = type;
        this.message = msg;
        this.original = original_error;
    };

    Bucket.Error.prototype = new Error();
    Bucket.Error.prototype.constructor = Bucket.Error;
    Bucket.Error.prototype.toString = function () {
        return this.type + " " + this.name + " " + this.message;
    };

    /**
     * Default error
     * @property DEFAULT
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    Bucket.Error.DEFAULT_ERR = "DEFAULT";

    /**
     * Signifies an error that happened due to database size limit overflow
     * @property QUOTA_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    Bucket.Error.QUOTA_ERR = "QUOTA";

    /**
     * Signifies an error that happened due to an action that was not permitted
     *
     * @property PERMISSION_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    Bucket.Error.PERMISSION_ERR = "PERMISSION";

    /**
     * Signifies an error that happened due to an action that violated DB constraints
     *
     * @property CONSTRAINT_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    Bucket.Error.CONSTRAINT_ERR = "CONSTRAINT";

    /**
     * Signifies an error that happened due to a missing table, objectStore;
     *
     * @property NOTFOUND_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    Bucket.Error.NOT_FOUND_ERR = "NOTFOUND";

    /**
     * Timeout Error
     * @property TIMEOUT
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    Bucket.Error.TIMEOUT = "TIMEOUT";

    Bucket.utils = utils;
    Bucket.Logger = Logger;
    Bucket.Driver = Driver;

    return Bucket;
}));
