(function (root, factory) {
    if (typeof exports === 'object'){
        var Bucket = require('Bucket/Bucket');

        module.exports = factory(Bucket.Bucket);
    } else if (typeof define === 'function' && define.amd) {
        define(['Bucket/Bucket'], function (Bucket) {
            return factory(Bucket.Bucket);
        });
    } else {
        factory(root.Bucket);
    }
}(this, function (Bucket) {
    /**
     * @module Driver.IndexedDB
     */

    var driver,
        db_version = 1;

    /**
     * @class Driver.IndexedDB
     *
     * @constructor
     * @extends Driver
     */
    driver = Bucket.registerDriver('IndexedDB', {
        name: 'IndexedDB',
        wrap : ['exists','get','set','fetchByKeyRange','clear','remove','getLength','getDBConnection'],
        
        openDB: function (callback) {
            this.logger.log('_openDB start');

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

                $this.logger.log('onupgradeneeded occur, new version is: ', db.version);

                //TODO: data migration between versions

                // Clear all ObjectStores in this database
                while (db.objectStoreNames.length > 0) {
                    db.deleteObjectStore(db.objectStoreNames[0]);
                }

                try {
                    store = db.createObjectStore($this.table_name, {'keyPath': 'key'});
                    store.createIndex("key", "key", {unique: true});
                    if (trans !== null) {
                        trans.oncomplete = function (e) {
                            callback && callback(null);
                        };
                    } else {
                        callback && callback(null);
                    }
                } catch (e) {
                    callback && callback($this.generateError(e));
                }
            }

            db_req = driver.getDB().open(this.db_name, db_version);
            this.logger.log('open DB request', db_req);

            db_req.onsuccess = function (e) {
                $this.logger.log('open DB request success event', e);
                // keep db reference.
                $this.db = e.target.result;

                // if the version isn't change fire opendb and break logic.
                if (parseInt(db_version, 10) === parseInt($this.db.version || 0, 10)) {
                    callback && callback(null);
                    return;
                }

                $this.logger.log('request version is higher then current, performing upgrade...');

                // use older version of database onupgradeneeded (webkit)
                if (typeof $this.db.setVersion === 'function') {
                    var version_req;

                    version_req = $this.db.setVersion(db_version);

                    version_req.onsuccess = onupgradeneeded;

                    version_req.onerror = function (e) {
                        $this.logger.log('setVersion error event', e);
                    };

                    version_req.onblocked = function (e) {
                        $this.logger.log('setVersion blocked event', e);
                    };

                    $this.logger.log('manual version upgrade for webkit', version_req);
                }
            };

            db_req.onupgradeneeded = onupgradeneeded;

            db_req.onerror = function (e) {
                $this.logger.log('error in db request', e);
                callback && callback($this.generateError(e));
            };
        },

        init: function () {
            var timeout = this.initTimeout(null,'init');
            // Database properties
            this.db_name = this.options.db_name + "." + this.options.table_name;
            this.table_name = this.options.table_name;
            
            // Init instance's logger
            this.logger = ns.Logger.getLogger(this.name + " " + this.db_name + "_" + this.table_name, ns.Logger.logLevels.ERROR);
            this.logger.log('init');

            this.wrapMethods();

            // Initiate connection to the indexedDB database;
            this.state = driver.STATES.CONNECTING;
            this.openDB(function (error) {
                this.clearTimeout(timeout);

                if (error === null) {
                    this.state = driver.STATES.CONNECTED;
                    this.logger.log('openDB success fireEvent load:latched');
                    this.fireEvent('load:latched');
                } else {
                    this.state = driver.STATES.DISCONNECTED;
                    this.logger.log('openDB callback with error:', error);
                    this.generateError(error);
                }
            }.bind(this));

            return this;
        },

        wrapMethods: function () {
            var i,
                name,
                method_list = this.wrap,
                $this = this;
            
            function wrap(name,method){
                $this[name] = function () {
                    var timeout,
                        args= Array.prototype.splice.call(arguments,0),
                        cb_index ,cb;

                    function run(){
                        timeout = $this.initTimeout(cb, name);
                        method.apply($this,args);
                    }

                    for (cb_index=0; cb = args[cb_index]; cb_index++){
                        if (typeof cb =='function') break;
                    }

                    if (!cb){
                        args.push(function(){
                            $this.clearTimeout(timeout);
                        });
                    }else {
                        args[cb_index] = function(){
                            $this.clearTimeout(timeout);
                            cb.apply(null, arguments);
                        };
                    }

                    if (this.state === driver.STATES.CONNECTED) {
                        run();
                    } else {
                        this.addEvent('load:once', function () {
                            run();
                        });
                    }
                }.bind($this);
            }
            
            for (i = 0; name = method_list[i]; i++) {
                wrap(name,this[name]);
            }
        },

        clear: function (callback) {
            this.logger.log('clear');

            var $this = this,
                trans,
                store,
                clear_req;

            try {
                trans = this.db.transaction([this.table_name], driver.TRANS_TYPES.READ_WRITE);
                store = trans.objectStore(this.table_name);
                clear_req = store.clear();

                clear_req.onsuccess = function (e) {
                    $this.logger.log('objectStore clear success event', e);
                };

                clear_req.onerror = function (e) {
                    $this.logger.log('objectStore clear error event', e);
                };

                trans.oncomplete = function (e) {
                    $this.logger.log('clear transaction complete event', e);
                    callback && callback(null);
                };

                trans.onerror = function (e) {
                    $this.logger.log('clear transaction error event', e);
                    callback && callback($this.generateError(e));
                };
            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('clear', arguments);
        },

        fetchByKeyRange: function (callback, each, key_range) {
            var $this = this,
                cursor,
                trans,
                store,
                items = {};

            try {
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
                    result['continue']();
                };

                cursor.onerror = function (e) {
                    callback && callback($this.generateError(e));
                };


                if (!each) {
                    trans.oncomplete = function (e) {
                        callback && callback(null, items);
                    };
                }
            } catch (e) {
                callback && callback($this.generateError(e));
            }
        },

        fetchAll: function (callback, each) {
            callback && this.fetchByKeyRange(callback, each, null);
        },

        each: function (callback) {
            this.logger.log('each');

            callback && this.fetchAll(callback, true);

            return this.$parent('each', arguments);
        },

        exists: function (key, callback) {
            this.logger.log('exists', key);

            var $this = this,
                trans,
                store,
                index,
                get_req;

            function req_onsuccess(e) {
                callback && callback(null, e.target.result != null);
            }

            try {
                trans = this.db.transaction([this.table_name], driver.TRANS_TYPES.READ_ONLY);
                store = trans.objectStore(this.table_name);
                index = store.index('key');
                get_req = index.getKey(key);
                get_req.onsuccess = req_onsuccess;

                trans.onerror = function (e) {
                    callback && callback($this.generateError(e));
                };
            } catch (e) {
                callback && callback($this.generateError(e));
            }
            
            return this.$parent('exists', arguments);
        },

        get: function (key, callback) {
            this.logger.log('get', key);

            var $this = this,
                keys = [],
                i,
                trans,
                store,
                req,
                count = 0,
                empty = true,
                return_object = true,
                values = {};

            function req_onsuccess(e) {
                var result = e.target.result;

                if (result) {
                    empty = false;
                    values[result.key] = JSON.parse(result.value);
                }

                count++;

                if (count == keys.length) finish();
            }

            function req_onerror(e) {
                callback && callback($this.generateError(e));
            }

            function finish(){
                if (empty) {
                    values = null;
                }

                else if (return_object === false) {
                    values = values[key];
                }

                callback && callback(null, values);
            }

            try {
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
            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('get', arguments);
        },

        getAll: function (callback) {
            this.logger.log('getAll');

            callback && this.fetchAll(callback);

            return this.$parent('getAll', arguments);
        },

        getKeys: function (callback) {
            this.logger.log('getKeys');

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

        remove: function (key, callback) {
            this.logger.log('remove', key);

            var $this = this,
                keys = [],
                trans,
                store,
                i,
                request;

            function request_onsuccess(e) {
                $this.logger.log('objectStore delete success event', e);
            }

            function request_onerror(e) {
                $this.logger.log('objectStore delete error event', e);
            }

            try {
                trans = this.db.transaction(this.table_name, driver.TRANS_TYPES.READ_WRITE);
                store = trans.objectStore(this.table_name);

                if (typeof key === 'string' || typeof key === 'number') {
                    keys.push(key);
                } else {
                    keys = key;
                }

                for (i = 0; i < keys.length; ++i) {
                    request = store['delete'](keys[i]);
                    request.onsuccess = request_onsuccess;
                    request.onerror = request_onerror;
                }

                trans.oncomplete = function (e) {
                    $this.logger.log('remove transaction complete event', e);
                    callback && callback(null);
                };

                trans.onerror = function (e) {
                    $this.logger.log('remove transaction error event', e);
                    callback && callback($this.generateError(e));
                };

            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('remove', arguments);
        },

        set: function (key, value, callback) {
            this.logger.log('set', key, value);

            var $this = this,
                map,
                trans,
                store,
                k,
                add_req;

            if (typeof key === 'string' || typeof key === 'number') {
                map = {};
                map[key] = value;
            } else {
                map = key;
            }

            try {
                trans = this.db.transaction([this.table_name], driver.TRANS_TYPES.READ_WRITE);
                store = trans.objectStore(this.table_name);

                function add_req_onsuccess(e) {
                    $this.logger.log('add request success event ', e);
                }

                function add_req_onerror(e) {
                    $this.logger.log('add request error event ', e);
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
                            callback && callback($this.generateError(e));
                        }
                    }
                }

                trans.oncomplete = function (e) {
                    $this.logger.log('add transaction complete event', e);
                    callback && callback(null);
                };

                trans.onerror = function (e) {
                    $this.logger.log('add transaction error event', e);
                    callback && callback($this.generateError(e));
                };
            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('set', arguments);
        },

        test: function () {
            var result = !!driver.getDB();
            
            if(/firefox/.test(navigator.userAgent.toLowerCase())){
                result = result && (16 <= parseInt(navigator.userAgent.toLowerCase().match(/firefox\/(\d*)/)[1]));
            }
            
            if(window.webkitIndexedDB){
                result = false;
            }
            
            return result;
        },

        getLength: function (callback) {
            this.logger.log('getLength');

            var $this = this,
                trans,
                store,
                req;

            try {
                trans = this.db.transaction(this.table_name, driver.TRANS_TYPES.READ_WRITE);
                store = trans.objectStore(this.table_name);
                req = store.count();

                req.onsuccess = function (e) {
                    callback && callback(null, parseInt(e.target.result || 0, 10));
                };

                req.onerror = function (e) {
                    callback && callback(e);
                };
            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('getLength', arguments);
        },

        getDBConnection: function (cb) {
            cb(this.db);
        },

        generateError: function (e) {
            var type, msg;

            if (e.code) {
                type = driver.ERROR_MAP[e.code];
                msg = e.message;
            } else if (e.target) {
                type = driver.ERROR_MAP[e.target.errorCode];
                msg = (e.target.webkitErrorMessage) ? e.target.webkitErrorMessage : e.target.error.name;
            }else {
                type = arguments[0];
                msg = arguments[1];
            }

            return this.$parent('generateError', [type, msg, e]);
        },

        destroy: function () {
            var err;
            try {
                this.db.close();
            } catch (e) {
                err = this.generateError(e);
            }

            return this.$parent('destroy',{error:err});
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
    driver.getObjectStore = function() {
        return window.IDBObjectStore || window.webkitIDBObjectStore || window.mozIDBObjectStore || window.oIDBObjectStore || window.msIDBObjectStore;
    };

    driver.TRANS_TYPES = {
        READ_ONLY: 'readonly',
        READ_WRITE: 'readwrite',
        VERSION_CHANGE: 'versionchange'
    };

    driver.STATES = {
        DISCONNECTED: 0,
        CONNECTING: 1,
        CONNECTED: 2
    };

    driver.ERROR_MAP = {};
    driver.ERROR_MAP[DOMException.NOT_FOUND_ERR] = Bucket.Error.NOT_FOUND_ERR;
    driver.ERROR_MAP[DOMException.CONSTRAINT_ERR] = Bucket.Error.CONSTRAINT_ERR;
    driver.ERROR_MAP[DOMException.NOT_ALLOWED_ERR] = Bucket.Error.PERMISSION_ERR;
    driver.ERROR_MAP[DOMException.READ_ONLY_ERR] = Bucket.Error.PERMISSION_ERR;
    driver.ERROR_MAP[DOMException.QUOTA_ERR] = Bucket.Error.QUOTA_ERR;
}));
