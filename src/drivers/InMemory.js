/**
 * This class is the implementation of InMemory storage.<br/>
 * The InMemory storage store all the data as Object (JSON) as key:value.<br/>
 * <br/>
 *
 * TODO: Right now we have unknown memory limitation<br/>
 *
 * @constructor
 * @class InMemory
 * @extends Driver
 **/
jStore.DriverManager.register('InMemory', {

    /**
     * The InMemory storage use Object (JSON) to store all the data.<br/>
     *
     * @property this._storage
     * @type {Object}
     * @private
     */
    _storage:{},

    /**
     * The driver name.
     *
     * @property name
     * @type {String}
     * @default 'Memory'
     */
    name:'InMemory',

    clear:function () {
        console.log('clear');
        this._storage = {};
    },

    each:function (cb) {
        console.log('each');
        var key;

        // Verify that the callback is function
        if (typeof  cb !== 'function') {
            throw 'Missing required callback function.';
        }

        for (key in this._storage) {
            cb(key, this._storage[key]);
        }
    },

    exists:function (key) {
        console.log('exist');
        return !!this._storage[key];
    },

    get:function (keys) {
        console.log('get');
        return this._storage[keys];
    },

    getAll:function () {
        console.log('getAll');
        return this._storage;
    },

    getKeys:function () {
        console.log('getKeys');
        var key, keys = [];
        for (key in this._storage) {
            keys.push(key);
        }

        return keys;
    },

    init:function () {

    },

    remove:function (keys) {
        var key;

        // Check for set(String,String)
        if (typeof keys === 'string') {
            console.log('remove(String): ', keys);
            delete this._storage[keys];
        } else if (jStore.utils.isArray(keys)) {
            console.log('remove(Array): ', keys);
            for (key in keys) {
                if (keys.hasOwnProperty(key)) {
                    delete this._storage[keys[key]];
                }
            }
        }
    },

    set:function (arg1, arg2) {

        var key;

        // Check for set(String,String)
        if (typeof arg2 === 'string') {
            console.log('set String: ', arg1, '=' + arg2);
            this._storage[arg1] = arg2;
        } else if (jStore.utils.isArray(arg1) || jStore.utils.isJSON(arg1)) {
            console.log('set(Array||JSON): ', arg1);
            for (key in arg1) {
                if (arg1.hasOwnProperty(key)) {
                    this._storage[key] = arg1[key];
                }
            }
        }
    },

    test:function () {
        return true;
    }

});