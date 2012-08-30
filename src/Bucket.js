var Bucket = Bucket || {};

!function (ns, utils) {
    /**
     * @module Bucket
     */

    /**
     * This clas represents a data store
     *
     * @class Bucket
     * @constructor
     *
     * @param {object} options
     *  @param {array} [options.drivers] a list of prioritized driver names to choose from
     *  @param {object} options.driver_options parameters to pass to the driver
     */
    function Bucket(options) {
        var driver = Bucket.choose(options.drivers);
        return new driver(options.driver_options);
    }

    utils.merge(Bucket, ns);
    /**
     * a stack of all registered driver names
     * @property stack
     * @type {array}
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
     * @propert chosen_driver
     * @type {ns.Driver}
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
     * @param {array} [list] if provided, will choose a driver from that list
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
     * @param {object} props a list of methods and properties for the new driver
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

        params.defaultOptions = utils.merge(ns.Driver.defaultOptions, params.defaultOptions || {});

        d = utils.inherit(driver, ns.Driver, params);
        d.test = params.test;
        d.$name = name;

        Bucket.stack.push(d.$name);

        Bucket.drivers[name] = d;
        return d;
    };

    /**
     * Aliases a drivers name
     *
     * @param {string} alias 
     * @param {string} name
     *
     * @static
     *
     * @return {Bucket.Driver} aliased driver
     */
    Bucket.alias = function(alias, name){
        Bucket.drivers[alias] = Bucket.drivers[name];    

        return Bucket.drivers[alias];
    };                

    /**
     * @class Bucket.Error
     * @constructor
     * @extend Error
     */
    Bucket.Error = function (type, msg, original_error) {
        this.type = type;
        this.message = msg;
        this.original = original_error;
    };
    Bucket.Error.prototype = new Error();
    Bucket.Error.prototype.constructor =  Bucket.Error;
    Bucket.Error.prototype.toString = function(){return this.type + " Error: "+ this.message;};

    /**
     * Siginifies an error that happened due to database size limit overflow
     * @property QUOTA_ERR
     * @static
     * @const
     */
    Bucket.Error.QUOTA_ERR = "QUOTA";

    /**
     * Signifies an error that happened due to an action that was not permitted
     *
     * @property PERMISSION_ERR
     * @static
     * @const
     */
    Bucket.Error.PERMISSION_ERR = "PERMISSION";

    /**
     * Signifies an error that happened due to an action that violated DB constraints
     *
     * @property CONSTRAINT_ERR
     * @static
     * @const
     */
    Bucket.Error.CONSTRAINT_ERR = "CONSTRAINT"; 

    this.Bucket = Bucket;
}.apply(this, [Bucket, Bucket.utils]);
