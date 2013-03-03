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

    var logger = Bucket.Logger.getLogger("Template", Bucket.Logger.logLevels.ERROR),
        driver;

    driver = Bucket.registerDriver('Template', {
        name: 'Template',

        init: function (options) {
            this.fireEvent('load:latched');
        },

        clear: function (callback) {
            logger.log('clear');
            callback && callback(null);

            return this.$parent('clear', arguments);
        },

        each: function (callback) {
            logger.log('each');

            /*
             keys.forEach(function (key, value) {
             callback(key, value);
             }.bind(this));
             */

            return this.$parent('each', arguments);
        },

        exists: function (key, callback) {
            logger.log('exists');

            // callback(null, exists);

            return this.$parent('exists', arguments);
        },

        get: function (key, callback) {
            logger.log('get');

            /*
             if (Array.isArray(key)) {
             callback(null, values);
             } else {
             callback(null, value);
             }
             */
            return this.$parent('get', arguments);
        },

        getAll: function (callback) {
            logger.log('getAll');
            /*
             callback(null, items);
             */
            return this.$parent('getAll', arguments);
        },

        getKeys: function (callback) {
            logger.log('getKeys');

            // callback(null, keys);

            return this.$parent('getKeys', arguments);
        },

        remove: function (key, callback) {
            /*
             if (callback) {
             callback(null);
             }
             */
            return this.$parent('remove', arguments);
        },

        set: function (key, value, callback) {
            /*
             callback(null);
             */
            return this.$parent('set', arguments);
        },

        test: function () {
            return false;
        },

        getLength: function (cb) {
            // cb(null,length);

            return this.$parent('getLength', arguments);
        },

        destroy: function () {
            // delete any local var or close db connection
        }
    });
}));
