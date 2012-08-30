!function (ns, utils) {

    var logger = ns.Logger.getLogger("IndexedDB", ns.Logger.logLevels.DEBUG),
        driver,
        db_version = 2;

    /**
     * @module Driver.IndexedDB
     *
     *
     * @constructor
     * @class IndexedDB
     * @extends Driver
     */
    driver = Bucket.registerDriver('IndexedDB', {
        name: 'IndexedDB',

        openDB: function (callback) {
            logger.log('_openDB start');

            var $this = this,
                db_req;

            function onupgradeneeded(e) {
                var db, trans = null, store;

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

                //TODO: data migration between versions

                if (db.objectStoreNames.length && db.objectStoreNames.contains($this.table_name)) {
                    db.deleteObjectStore($this.table_name);
                }

                store = db.createObjectStore($this.table_name, {'keyPath': 'key'});
                store.createIndex("key", "key", {unique: true});

                if (trans !== null) {
                    trans.oncomplete = function (e) {
                        callback && callback();
                    };
                } else {
                    callback && callback();
                }
            }

            db_req = driver.getDB().open(this.db_name, db_version);
            logger.log('open DB request', db_req);

            db_req.onsuccess = function (e) {
                logger.log('open DB request success event', e);
                // keep db reference.
                $this.db = e.target.result;

                // if the version isn't change fire opendb and break logic.
                if (parseInt(db_version, 10) === parseInt($this.db.version || 0, 10)) {
                    callback && callback();
                    return;
                }

                logger.log('request version is higher then current, performing upgrade...');

                // use older version of database onupgradeneeded (webkit)
                if (typeof $this.db.setVersion === 'function') {
                    var version_req = $this.db.setVersion(db_version);
                    version_req.onsuccess = onupgradeneeded;
                    version_req.onerror = function (e) {
                        logger.log('setVersion error event', e);
                    };
                    version_req.onblocked = function (e) {
                        logger.log('setVersion blocked event', e);
                    };
                    logger.log('manual version upgrade for webkit', version_req);
                }

            };

            db_req.onupgradeneeded = onupgradeneeded;
            db_req.onerror = function (e) {
                logger.log('error in db request', e);
            };
        },

        /**
         *
         * @return {*}
         */
        init: function () {
            logger.log('init');

            var $this = this;

            // Database properties
            this.db_name = this.options.db_name;
            this.table_name = this.options.table_name;

            // Initiate connection to the indexedDB database
            this.openDB(function () {
                $this.fireEvent('load:latched');
            });

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

            trans = this.db.transaction([this.table_name], driver.TRANS_TYPES.READ_WRITE);
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
         * fetchByKeyRange used to fetch items by provided key_range object
         * @param each (Boolean) if set to true, callback is fired on each cursor iteration, if set to false callback is fired once in translation complete event.
         * @param callback
         */
        fetchByKeyRange: function (key_range, callback, each) {
            var cursor, trans, store, items = {};

            trans = this.db.transaction([this.table_name], driver.TRANS_TYPES.READ_ONLY);
            store = trans.objectStore(this.table_name);

            // We open a cursor and attach events.
            cursor = store.openCursor(key_range);

            cursor.onsuccess = function (e) {
                var result = e.target.result;
                if (!result) {
                    return;
                }

                if (each) {
                    callback && callback(null, result.value.key, JSON.parse(result.value.value));
                } else {
                    items[result.value.key] = JSON.parse(result.value.value);
                }

                // The success event handler is fired once for each entry.
                // So call "continue" on your result object.
                // This lets you iterate across the data
                result.continue();
            };

            cursor.onerror = function (e) {
                callback && callback(e);
            };

            if (!each) {
                trans.oncomplete = function (e) {
                    callback && callback(null, items);
                };
            }
        },

        fetchAll: function (callback, each) {
            // We select the range of data we want to make queries over 
            // In this case, we get everything. 
            // To see how you set ranges, see <a href="/en/IndexedDB/IDBKeyRange" title="en/IndexedDB/IDBKeyRange">IDBKeyRange</a>.
            var key_range = driver.getKeyRange().lowerBound(0);

            callback && this.fetchByKeyRange(key_range, callback, each);
        },

        /**
         *
         * @param callback
         * @return {*}
         */
        each: function (callback) {
            logger.log('each');

            callback && this.fetchAll(callback, true);

            return this.$parent('each', arguments);
        },

        /**
         *
         * @param key
         * @param callback
         * @return {*}
         */
        exists: function (key, callback) {
            logger.log('exists', key);

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

            var keys = [],
                i,
                trans,
                store,
                req,
                empty = true,
                return_object = true,
                values = {};

            function req_onsuccess(e) {
                var result = e.target.result;

                if (result) {
                    empty = false;
                    values[result.key] = JSON.parse(result.value);
                }
            }

            function req_onerror(e) {
                callback && callback(e);
            }

            trans = this.db.transaction([this.table_name], driver.TRANS_TYPES.READ_ONLY);
            store = trans.objectStore(this.table_name);

            if (typeof key === 'string' || typeof key === 'number') {
                return_object = false;
                keys.push(key);
            } else {
                keys = key;
            }

            for (i = 0; i < keys.length; ++i) {
                req = store.get(keys[i]);

                req.onerror = req_onerror;
                req.onsuccess = req_onsuccess;
            }

            trans.oncomplete = function (e) {

                if (empty) {
                    values = null;
                }

                else if (return_object === false) {
                    values = values[key];
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

            callback && this.fetchAll(callback);

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
            logger.log('remove', key);

            var keys = [], trans, store, i, request;

            function request_onsuccess(e) {
                logger.log('objectStore delete success event', e);
            }

            function request_onerror(e) {
                logger.log('objectStore delete error event', e);
            }

            trans = this.db.transaction(this.table_name, driver.TRANS_TYPES.READ_WRITE);
            store = trans.objectStore(this.table_name);

            if (typeof key === 'string' || typeof key === 'number') {
                keys.push(key);
            } else {
                keys = key;
            }

            for (i = 0; i < keys.length; ++i) {
                request = store.delete(keys[i]);
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
         * @param key
         * @param value
         * @param callback
         * @return {*}
         */
        set: function (key, value, callback) {
            logger.log('set', key, value);

            var $this = this, map, trans, store, k, add_req;

            if (typeof key === 'string' || typeof key === 'number') {
                map = {};
                map[key] = value;
            } else {
                map = key;
            }

            trans = this.db.transaction([this.table_name], driver.TRANS_TYPES.READ_WRITE);
            store = trans.objectStore(this.table_name);

            function add_req_onsuccess(e) {
                logger.log('add request success event ', e);
            }

            function add_req_onerror(e) {
                logger.log('add request error event ', e);
            }

            for (k in map) {
                if (map.hasOwnProperty(k)) {
                    try {
                        add_req = store.put({
                            'key': k,
                            'value': JSON.stringify(map[k])
                        });
                        add_req.onsuccess = add_req_onsuccess;
                        add_req.onerror = add_req_onerror;
                    } catch (e) {
                        callback && callback($this.generateError(Bucket.Error.PERMISSION_ERR, 'A write operation was attempted in a read-only transaction', e));
                    }

                }
            }

            trans.oncomplete = function (e) {
                logger.log('transaction complete event', e);
                callback && callback(null);
            };

            trans.onerror = function (e) {
                logger.log('transaction error event', e);
                callback && callback($this.generateError(Bucket.Error.CONSTRAINT_ERR, 'Constraint error, key is already exists', e));
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

            trans = this.db.transaction(this.table_name, driver.TRANS_TYPES.READ_WRITE);
            store = trans.objectStore(this.table_name);
            req = store.count();

            req.onsuccess = function (e) {
                callback && callback(null, parseInt(e.target.result || 0, 10));
            };

            req.onerror = function (e) {
                callback && callback(e);
            };

            return this.$parent('getLength', arguments);
        },

        getDBConnection: function () {
            return this.db;
        },

        destroy: function () {
            this.db.close();
        }
    });

    driver.getDB = function () {
        return window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
    };
    driver.getTransaction = function () {
        return window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.oIDBTransaction || window.msIDBTransaction;
    };
    driver.getKeyRange = function () {
        return window.IDBKeyRange || window.webkitIDBKeyRange || window.mozIDBKeyRange || window.oIDBKeyRange || window.msIDBKeyRange;
    };

    driver.TRANS_TYPES = {
        READ_ONLY: 'readonly',
        READ_WRITE: 'readwrite',
        VERSION_CHANGE: 'versionchange'
    };

}.apply(Bucket, [Bucket, Bucket.utils]);
