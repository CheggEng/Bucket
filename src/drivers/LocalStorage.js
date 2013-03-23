(function (root, factory) {
    if (typeof exports === 'object'){
        var Bucket = require('Bucket/Bucket');

        module.exports = factory(Bucket);
    } else if (typeof define === 'function' && define.amd) {
        define(['Bucket/Bucket'], function (Bucket) {
            return factory(Bucket);
        });
    } else {
        factory(root.Bucket);
    }
}(this, function (Bucket) {

    /**
     * @module Driver.DomStorage
     */

    var driver;

    /**
     * @constructor
     * @class Driver.DomStorage
     * @extends Driver
     **/
    driver = Bucket.registerDriver('LocalStorage', {

        name: 'DomStorage',

        init: function () {
            var keys;

            this.logger = Bucket.Logger.getLogger(this.name + " " + this.db_name + "_" + this.table_name, Bucket.Logger.logLevels.ERROR);
            
            // Set the prefix for this storage
            this.prefix = this.options.db_name + '_' + this.options.table_name + '_';

            this.size = 0;

            // Init the internal store object
            if (!driver.stores[this.prefix]) {
                driver.stores[this.prefix] = {};
            }

            this.store = driver.stores[this.prefix];

            // Load existing records from localStorage
            keys = Object.keys(localStorage);
            keys.forEach(function (key) {
                if (key.indexOf(this.prefix) !== -1) {
                    this.store[key.substr(this.prefix.length)] = JSON.parse(localStorage[key]);

                    this.size += key.length;
                    this.size += localStorage[key].length;
                }
            }.bind(this));

            this.fireEvent('load:latched');
        },

        clear: function (callback) {
            this.logger.log('clear');

            var key;
            for (key in this.store) {
                localStorage.removeItem(this.prefix + key);
            }

            this.size = 0;

            // Clear local storage
            this.store = driver.stores[this.options.table_name] = {};

            callback && callback(null);

            return this.$parent('clear', arguments);
        },

        each: function (callback) {
            this.logger.log('each');
            var keys;

            // Extract all the keys from the local storage
            keys = Object.keys(this.store);

            keys.forEach(function (key) {
                callback(null, key, this.store[key]);
            }.bind(this));

            return this.$parent('each', arguments);
        },

        exists: function (key, callback) {
            this.logger.log('exists');
            callback(null, key in this.store);
            return this.$parent('exists', arguments);
        },

        get: function (key, callback) {
            this.logger.log('get');
            var values = {};

            // check to see if the first argument is String or array
            if (Array.isArray(key)) {
                key.forEach(function (element) {
                    values[element] = this.store[element];
                }.bind(this));
                callback(null, values);
            } else {
                // return the required value
                callback(null, this.store[key]);
            }
            return this.$parent('get', arguments);
        },

        getAll: function (callback) {
            this.logger.log('getAll');
            callback(null, this.store);
            return this.$parent('getAll', arguments);
        },

        getKeys: function (callback) {
            this.logger.log('getKeys');
            callback(null, Object.keys(this.store));

            return this.$parent('getKeys', arguments);
        },

        remove: function (key, callback) {
            var keys = Bucket.utils.toArray(key);

            keys.forEach(function (element) {
                this.size -= localStorage.getItem(this.prefix + element).length;
                this.size -= (this.prefix + element).length;

                localStorage.removeItem(this.prefix + element);

                delete this.store[element];
            }.bind(this));

            callback && callback(null);

            return this.$parent('remove', arguments);
        },

        set: function (key, value, callback) {
            var map, keys = [], prop, err, json;

            if (typeof key == 'string' || typeof key == 'number') {
                map = {};
                map[key] = value;
            } else {
                map = key;
            }

            // Check to see if user has passed value or callback as second parameter
            if (typeof value === "function") {
                callback = value;
            }

            try {
                for (prop in map) {
                    this.logger.log('set String: ', this.prefix + prop, '=' + map[prop]);

                    json = JSON.stringify(map[prop]);
                    localStorage.setItem(this.prefix + prop, json);

                    this.size += json.length;
                    this.size += ( this.prefix + prop ).length;

                    this.store[prop] = map[prop];
                    keys.push(prop);
                }

                callback && callback(null);
            } catch ( e ) {
                err = this.generateError(e);

                callback && callback(err);
            }
            return this.$parent('set', arguments);
        },

        test: function () {
            return !!localStorage;
        },

        getLength: function (cb) {
            cb(null, Object.keys(this.store).length);

            return this.$parent('getLength', arguments);
        },

        generateError : function(e){
            var msg;
            if (e.message && /(QUOTA)[\w\W]+(EXCEEDED)/i.test(e.message)) {
                msg = 'Local Storage Quota Exceeded Error. ';
                msg += 'Storage string length: ' + this.size;

                return this.$parent('generateError', [Bucket.Error.QUOTA_ERR, msg, e]);
            }else {
                return this.$parent('generateError',arguments);
            }
        },

        destroy: function () {
            this.store = null;
            return this.$parent('destroy');
        }
    });

    Bucket.alias("DomStorage", "LocalStorage");

    driver.stores = {};
}));
