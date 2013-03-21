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
     * @module Driver.Template
     */

    var driver;

    driver = Bucket.registerDriver('Empty', {
        name: 'Empty',

        init: function (options) {
            this.store = {};
            this.fireEvent('load:latched');
            
            this.logger = Bucket.Logger.getLogger(this.name + " " + this.db_name + "_" + this.table_name, Bucket.Logger.logLevels.ERROR);
        },

        clear: function (callback) {
            this.logger.log('clear');
            this.store = {};
            callback && callback(null);

            return this.$parent('clear', arguments);
        },

        each: function (callback) {
            this.logger.log('each');

            var key;

            for (key in this.store) {
                callback(key, this.store[key]);
            }

            return this.$parent('each', arguments);
        },

        exists: function (key, callback) {
            this.logger.log('exists');

            callback(null, (key in this.store));

            return this.$parent('exists', arguments);
        },

        get: function (key, callback) {
            this.logger.log('get');

            var result, k;

            if (Array.isArray(key)){
                result = {};

                for (k in key){
                    result[k] = this.store[k];
                }
            } else {
                result = this.store[key];
            }

            callback(null, result);

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
            delete this.store[key];

            callback && callback(null);

            return this.$parent('remove', arguments);
        },

        set: function (key, value, callback) {
            this.store[key] = value;
            callback && callback(null);

            return this.$parent('set', arguments);
        },

        test: function () {
            return true;
        },

        getLength: function (cb) {
            cb(null, Object.keys(this.store).length);

            return this.$parent('getLength', arguments);
        },

        destroy: function () {
            this.store = {};
        }
    });
}));