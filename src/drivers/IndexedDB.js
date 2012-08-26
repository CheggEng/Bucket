var jStore = jStore || {};

!function (ns, utils) {

    var logger = ns.Logger.getLogger("IndexedDB", ns.Logger.logLevels.DEBUG),
        driver,
        db_version = 1;

    /**
     * @module Driver.IndexedDB
     *
     *
     * @constructor
     * @class IndexedDB
     * @extends Driver
     */
    driver = jStore.registerDriver('IndexedDB', {
        name: 'IndexedDB',

        _getIDB: function () {
            return window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
        },

        _getIDBTransaction: function () {
            return window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.oIDBTransaction || window.msIDBTransaction;
        },

        _getIDBKeyRange: function () {
            return window.IDBKeyRange || window.webkitIDBKeyRange || window.mozIDBKeyRange || window.oIDBKeyRange || window.msIDBKeyRange;
        },

        /**
         *
         * @private
         */
        _openDB: function () {
            logger.log('_openDB start');

            var db_req,
                onupgradeneeded;

            onupgradeneeded = function (e) {
                var self = this, db, trans = null, store;

                switch (e.type) {
                    case 'success':
                        db = e.currentTarget.result.db;
                        trans = e.currentTarget.result;
                        break;

                    case 'upgradeneeded':
                        db = e.currentTarget.result;
                        break;
                }

                logger.log('onupgradeneeded occur, new version is: ', db.version);

                if (db.objectStoreNames.length && db.objectStoreNames.contains(this.table_name)) {
                    db.deleteObjectStore(this.table_name);
                }

                store = db.createObjectStore(this.table_name, {'keyPath': 'key'});
                store.createIndex("key", "key", {unique: false});

                if (trans !== null) {
                    trans.oncomplete = function (e) {
                        // fire opendb event after db is upgraded
                        self.fireEvent('opendb');
                    };
                } else {
                    // fire opendb event after db is upgraded
                    this.fireEvent('opendb');
                }
            };

            db_req = this._getIDB().open(this.db_name, db_version);
            logger.log('open DB request', db_req);
            db_req.onsuccess = function (e) {
                logger.log('open DB request success event', e);
                // keep db reference.
                this.db = e.target.result;

                // if the version isn't change fire opendb and break logic.
                if (parseInt(db_version, 10) === parseInt(this.db.version || 0, 10)) {
                    this.fireEvent('opendb');
                    return;
                }

                logger.log('request version is higher then current, performing upgrade...');

                // use older version of database onupgradeneeded (webkit)
                if (typeof this.db.setVersion === 'function') {
                    var version_req = this.db.setVersion(db_version);
                    version_req.onsuccess = onupgradeneeded.bind(this);
                    version_req.onerror = function (e) {
                        logger.log('setVersion error event', e);
                    };
                    version_req.onblocked = function (e) {
                        logger.log('setVersion blocked event', e);
                    };
                    logger.log('manual version upgrade for webkit', version_req);
                }

            }.bind(this);

            db_req.onupgradeneeded = onupgradeneeded.bind(this);
            db_req.onerror = function (e) {
                logger.log('error in db request', e);
            }.bind(this);
        },

        /**
         *
         * @return {*}
         */
        init: function () {
            logger.log('init');

            // Database properties
            this.db_name = this.options.db_name;
            this.table_name = this.options.table_name;

            // Listen to indexedDB open request end 
            this.addEvent('opendb:once', function () {
                this.fireEvent('load:latched');
            }.bind(this));

            // Initiate connection to the indexedDB database
            this._openDB();

            return this;
        },

        /**
         *
         * @param callback
         * @return {*}
         */
        clear: function (callback) {
            logger.log('clear');

            var trans, store, clear_req;

            trans = this.db.transaction([this.table_name], 'readwrite');
            store = trans.objectStore(this.table_name);
            clear_req = store.clear();

            clear_req.onsuccess = function (e) {
                logger.log('objectStore clear success event', e);
            };

            clear_req.onerror = function (e) {
                logger.log('objectStore clear error event', e);
            };

            trans.oncomplete = function (e) {
                logger.log('transaction complete event', e);
                callback && callback(null);
            };

            trans.onerror = function (e) {
                logger.log('transaction error event', e);
                callback && callback(e);
            };

            return this.$parent('clear', arguments);
        },

        /**
         *
         * @param callback
         * @return {*}
         */
        each: function (callback) {
            logger.log('each');

            this.getAll(function (error, items) {
                var key;

                if (error !== null) {
                    callback && callback(error);
                    return;
                }

                for (key in items) {
                    if (items.hasOwnProperty(key)) {
                        callback && callback(null, key, items[key]);
                    }
                }
            });

            return this.$parent('each', arguments);
        },

        /**
         *
         * @param key
         * @param callback
         * @return {*}
         */
        exists: function (key, callback) {
            logger.log('exists');

            this.get(key, function (error, value) {
                if (error !== null) {
                    callback && callback(error);
                    return;
                }

                callback && callback(null, !!value);
            });

            return this.$parent('exists', arguments);
        },

        /**
         *
         * @param key
         * @param callback
         * @return {*}
         */
        get: function (key, callback) {
            logger.log('get', key);

            var objIsEmpty,
                return_object = true,
                keys = [],
                i,
                trans,
                store,
                req,
                req_onsuccess,
                req_onerror,
                values = {};

            trans = this.db.transaction([this.table_name], "readonly");
            store = trans.objectStore(this.table_name);

            if (typeof key === 'string' || typeof key === 'number') {
                return_object = false;
                keys.push(key);
            } else {
                keys = key;
            }

            req_onsuccess = function (e) {
                if (e.target.result) {
                    values[e.target.result.key] = JSON.parse(e.target.result.value);
                }
            };

            req_onerror = function (e) {
                callback && callback(e);
            };

            for (i = 0; i < keys.length; ++i) {
                req = store.get(keys[i]);

                req.onerror = req_onerror;
                req.onsuccess = req_onsuccess;
            }

            objIsEmpty = function (obj) {
                var i;
                for (i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        return false;
                    }
                }
                return true;
            };

            trans.oncomplete = function (e) {

                if (objIsEmpty(values)) {
                    values = null;
                } else {
                    if (return_object === false) {
                        for (i in values) {
                            if (values.hasOwnProperty(i)) {
                                values = values[i];
                            }
                        }
                    }
                }
                callback && callback(null, values);
            };


            return this.$parent('get', arguments);
        },

        /**
         *
         * @param callback
         * @return {*}
         */
        getAll: function (callback) {
            logger.log('getAll');

            var cursor, keyRange, items = {},
                trans = this.db.transaction([this.table_name], "readonly"),
                store = trans.objectStore(this.table_name);

            // We select the range of data we want to make queries over 
            // In this case, we get everything. 
            // To see how you set ranges, see <a href="/en/IndexedDB/IDBKeyRange" title="en/IndexedDB/IDBKeyRange">IDBKeyRange</a>.
            keyRange = this._getIDBKeyRange().lowerBound(0);

            // We open a cursor and attach events.
            cursor = store.openCursor(keyRange);

            cursor.onsuccess = function (e) {
                var result = e.target.result;
                if (!result) {
                    return;
                }

                items[result.key] = result.value;
                // The success event handler is fired once for each entry.
                // So call "continue" on your result object.
                // This lets you iterate across the data

                result.continue();
            };

            cursor.onerror = function (e) {
                callback && callback(e);
            };

            trans.oncomplete = function (e) {
                callback && callback(null, items);
            };

            return this.$parent('getAll', arguments);
        },

        /**
         *
         * @param callback
         * @return {*}
         */
        getKeys: function (callback) {
            logger.log('getKeys');

            this.getAll(function (error, items) {
                var key, keys = [];

                if (error !== null) {
                    callback && callback(error);
                    return;
                }

                for (key in items) {
                    if (items.hasOwnProperty(key)) {
                        keys.push(key);
                    }
                }

                callback && callback(null, keys);
            });

            return this.$parent('getKeys', arguments);
        },

        /**
         *
         * @param key
         * @param callback
         * @return {*}
         */
        remove: function (key, callback) {
            logger.log('remove');

            var keys = [], trans, store, i, request, request_onerror, request_onsuccess;

            trans = this.db.transaction(this.table_name, 'readwrite');
            store = trans.objectStore(this.table_name);

            if (typeof key === 'string' || typeof key === 'number') {
                keys.push(key);
            } else {
                keys = key;
            }

            request_onsuccess = function (e) {
                logger.log('objectStore delete success event', e);
            };

            request_onerror = function (e) {
                logger.log('objectStore delete error event', e);
            };

            for (i = 0; i < keys.length; ++i) {
                request = store.delete(key);
                request.onsuccess = request_onsuccess;
                request.onerror = request_onerror;
            }

            trans.oncomplete = function (e) {
                logger.log('transaction complete event', e);
                callback && callback(null);
            };

            trans.onerror = function (e) {
                logger.log('transaction error event', e);
                callback && callback(e);
            };

            return this.$parent('remove', arguments);
        },

        /**
         *
         * @param keyOrMap
         * @param value
         * @param callback
         * @return {*}
         */
        set: function (keyOrMap, value, callback) {
            logger.log('set', keyOrMap, value);

            var map, trans, store, key, add_req, add_req_onsuccess, add_req_onerror;

            if (typeof keyOrMap === 'string' || typeof keyOrMap === 'number') {
                map = {};
                map[keyOrMap] = value;
            } else {
                map = keyOrMap;
            }

            trans = this.db.transaction([this.table_name], 'readwrite');
            store = trans.objectStore(this.table_name);

            // set add request events handlers so we won't generate them inside the loop
            add_req_onsuccess = function (e) {
                logger.log('add request success event ', e);
            };

            add_req_onerror = function (e) {
                logger.log('add request error event ', e);
            };

            for (key in map) {
                if (map.hasOwnProperty(key)) {
                    add_req = store.put({
                        'key': key,
                        'value': JSON.stringify(map[key])
                    });

                    add_req.onsuccess = add_req_onsuccess;
                    add_req.onerror = add_req_onerror;
                }
            }

            trans.oncomplete = function (e) {
                logger.log('transaction complete event', e);
                callback && callback(null);
            };

            trans.onerror = function (e) {
                logger.log('transaction error event', e);
                callback && callback(e);
            };

            return this.$parent('set', arguments);
        },

        /**
         *
         * @return {Boolean}
         */
        test: function () {
            return false;
        },

        /**
         * This method return the length of all keys in the objectStore
         * @param callback
         * @return {*}
         */
        getLength: function (callback) {
            logger.log('getLength');

            var trans, store, req;

            trans = this.db.transaction(this.table_name, 'readwrite');
            store = trans.objectStore(this.table_name);

            req = store.count();

            req.onsuccess = function (e) {
                callback && callback(null, parseInt(e.target.result || 0, 10));
            };

            req.onerror = function (e) {
                callback && callback(e);
            }

            return this.$parent('getLength', arguments);
        }
    });
}.apply(jStore, [jStore, jStore.utils]);