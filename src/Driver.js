(function (root, factory) {
    if (typeof exports === 'object') {
        var utils = require('Bucket/common/utils');
        var Events = require('Events/Events').Events;

        module.exports.Driver = factory(utils, Events);

    } else if (typeof define === 'function' && define.amd) {
        define(['Bucket/common/utils', 'Events/Events'], function (utils, Events) {
            return factory(utils, Events.Events);
        });

    } else {
        root.Bucket.Driver = factory(root.Bucket.utils, root.Events);
    }
}(this, function (utils, Events) {
    /**
     * @module Driver
     */
    /**
     * This is the skeleton Driver class.
     * The class will be used as the base class for all the drivers implementation
     *
     * @class Driver
     *
     * @uses Events
     * @uses utils.Options
     * @uses utils.Bind
     * @constructor
     *
     * @param options
     *  @param {string}  options.table         will be used as key identifier between db instances
     *  @param {string} [options.db_name]      can be used as an additional identifier to differentiate between instances
     *  @param {int}    [options.db_size]      can be used in cases where db allows setting size limit (not consistent)
     *  @param {int}    [options.timeout=5000] how long to wait after a query has fired before timing out the request
     */
    function Driver(options) {
        Events.call(this);
        utils.Options.call(this);
        utils.Bind.call(this);
        this.setOptions(options);
    }

    /**
     * @event load
     */

    /**
     * @event error
     *
     * @param args
     *  @param {Bucket.Error} args.error
     */

    /**
     * @event destroy
     */

    Driver.prototype = {
        constructor: Driver,

        /**
         * contains a list of default options for the driver
         * @property defaultOptions
         * @type {object}
         * @protected
         */
        defaultOptions : {
            table_name: '',
            db_name: '',
            db_size: '',
            timeout : 5 * 1000
        },

        /**
         * The driver name.
         *
         * @property name
         * @type {String}
         */
        name: 'Driver',

        /**
         * The storage prefix to allow same keys from different components.<br/>
         * @property prefix
         * @protected
         * @type {String}
         */
        prefix: '',

        /**
         * Delete all the records from the storage
         *
         * <pre><code>
         *   clear(function callback(Error|null))
         *   </code>
         * </pre>
         *
         * @async
         * @chainable
         *
         * @method clear
         * @param {function} [callback] - A callback function that will be invoked after the clear.
         */
        clear: function (callback) {
            return this;
        },

        /**
         * Run the callback method on all the storage items.
         *
         * <pre><code>
         *   each(function callback(Error|null, String key, String value)
         *   </code>
         * </pre>
         *
         * @async
         * @chainable
         *
         * @method each
         * @param {function} callback - A callback function that will handle the results.
         *                              The callback parameters are (key, value)
         */
        each: function (callback) {
            return this;
        },

        /**
         * Check to see if the given key already exist in the Storage
         * <pre><code>
         *   exists(String key, function callback(Error|null, boolean)
         * </code>
         * </pre>
         *
         * @async
         * @chainable
         *
         * @method exists
         * @param {String} key - The key of the item we want to check if exits
         * @param {function} callback - A callback function that will handle the results.
         *                              The callback parameters are (key, value)
         *
         * @return {Boolean} exists - true/false if the key exists or not
         */
        exists: function (key, callback) {
            return false;
        },

        /**
         * Retrieve item or items from the storage.
         *
         * @async
         * @chainable
         *
         * @method get
         * @param {String|Array} keys which key/keys we want to retrieve
         * @param {function}     callback A callback function that will handle the results.
         *
         * @return {String|Object} if was asked for a collection of values, return a map, otherwise return a string
         *
         */
        get: function (keys, callback) {
            return this;
        },

        /**
         * get all items.
         *
         * <pre><code>
         *   getAll(function callback(Error|null, Object records))
         *     </code>
         * </pre>
         *
         * @async
         * @chainable
         *
         * @method getAll
         * @param {function} callback - A callback function for processing the records
         * @return {object} key=>value map
         */
        getAll: function (callback) {
            return this;
        },

        /**
         * get all keys.
         *
         * <pre><code>
         *   getKeys(function callback(Error|null, Array keys))
         *     </code>
         * </pre>
         *
         * @async
         * @chainable
         *
         * @method getKeys
         * @param {function} callback - A callback function for processing the keys
         *
         * @return {Array} an array of key names
         */
        getKeys: function (callback) {
            return this;
        },

        /**
         * This method will be init the Driver.
         *
         * Any initialization code should be place here
         *
         * @method init
         * @protected
         */
        init: function (options) {
        },

        /**
         * Remove items from the storage
         *
         * @example
         * <pre><code>
         *   remove(String|Array [, function(Error|null)]) - remove the given key(s) from the storage
         *     </code>
         * </pre>
         *
         * @async
         * @chainable
         *
         * @method remove
         * @param {String|Array} keys - The key(s) of the item we want to remove
         * @param {function} [callback]
         */
        remove: function (keys, callback) {
            return this;
        },

        /**
         * Add a new item(s) to the storage.
         * If the key is already in the store it will be updated.
         *
         * @async
         * @chainable
         *
         * @method set
         * @param {String|Object} key        if string, will be used as a key name. If object, will be used as a key=>value map
         * @param {String}        [value]    key value (only used in case of singular set)
         * @param {function}      [cb] will be called when action is done
         */
        set: function (key, value, cb) {
            return this;
        },

        /**
         * returns the number of items in the store
         *
         * @async
         * @chainable
         *
         * @method getLength
         *
         * @param {function} cb
         *
         * @return {number}
         */
        getLength: function (cb) {
            return -1;
        },

        /**
         * @method destroy
         *
         * @chainable
         */
        destroy : function(args){
            this.fireEvent('destroy',args);
            return this;
        },

        /**
         * Test method to check if this driver is suitable for this browser/device
         * @method test
         * @return boolean
         */
        test: function () {
            return false;
        },

        /**
         * Generate new Bucket.error object and fires the error event
         *
         * @method generateError
         * @param {string} [type] Bucket.error.TYPES constant.
         * @param {String} [msg]  the error massage we want to display.
         * @param {Object} [original_error]  the original error object
         *
         * @protected
         *
         * @return {Bucket.error} instance
         */
        generateError: function (type, msg, original_error) {
            var err = new Bucket.Error(type || Bucket.Error.DEFAULT_ERR, msg || 'Default Error Massage', original_error);
            this.fireEvent('error', {error: err});
            return err;
        },

        /**
         * this method is intended to be used for initializing the timeout counter
         * for the request timeout error
         *
         * @method initTimeout
         *
         * @param {function} [cb] in case we want the timeout error to also trigger a callback
         * @param {string}   [name] which method initiated the timeout
         *
         * @protected
         * @return {number} timeout handle
         */
        initTimeout : function(cb, name) {
            var $this = this;

            name = name ? name + ' ' : '';

            return setTimeout(function(){
                var err = $this.generateError(Bucket.Error.TIMEOUT, name + "Method timed out");
                cb && cb(err);
            }, this.options.timeout);
        },

        /**
         * this method is used to clear the timeout counter of a request timeout
         *
         * @method clearTimeout
         *
         * @param handle the timeout handle
         * @protected
         */
        clearTimeout : function(handle){
            clearTimeout(handle);
        }
    };

    return Driver;
}));
