var Bucket = Bucket || {};

!function (ns, utils) {
    /**
     * @module Driver.WebSQL
     */

    var driver;

    driver = Bucket.registerDriver('WebSQL', {
        name: 'WebSQL',

        query: function (opts) {
            var db = this.db;

            this.addEvent('load', function(){
                db.transaction(
                    function (trans) {
                        trans.executeSql(opts.sql, opts.sqlArgs, opts.onSuccess, opts.onError);
                    }
                );
            });
        },

        openDB: function (callback) {
            this.logger.log('openDB initiated');

            var $this = this,
                db_size = 50 * 1024 * 1024; //in bytes

            function onSuccess() {
                callback && callback(null);
            }

            function onError(e) {
                callback && callback($this.generateError(e));
            }

            try {
                // right now i disregard version change in WebSQL
                this.db = openDatabase(this.db_name, '', this.db_name, db_size);
                // open transaction and try to create a table.
                this.db.transaction(
                    function (trans) {
                        trans.executeSql(
                            'CREATE TABLE IF NOT EXISTS ' + $this.table_name + ' (key PRIMARY KEY, value)', 
                            [], 
                            onSuccess, 
                            onError
                        );
                    }
                );
            } catch (e) {
                callback && callback($this.generateError(e));
            }
        },

        init: function (options) {
            // Database properties
            this.db_name = this.options.db_name;
            this.table_name = this.options.table_name;

            // Init instance's logger
            this.logger = ns.Logger.getLogger(this.name + " " + this.db_name + "_" + this.table_name, ns.Logger.logLevels.ERROR);
            this.logger.log('init');

            this.openDB(function (error) {
                if (error === null) {
                    this.state = driver.STATES.CONNECTED;
                    this.logger.log('openDB success fireEvent load:latched');
                    this.fireEvent('load:latched');
                } else {
                    this.state = driver.STATES.DISCONNECTED;
                    this.logger.log('openDB callback with error:', error);
                }
            }.bind(this));
        },

        clear: function (callback) {
            var $this = this;

            this.logger.log('clear');

            try {
                $this.query({
                    sql: 'DELETE FROM ' + this.table_name,
                    sqlArgs: [],
                    onSuccess: function (trans, res) {
                        callback && callback(null);
                    },
                    onError: function (e) {
                        callback && callback($this.generateError(e));
                    }
                });
            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('clear', arguments);
        },

        each: function (callback) {
            this.logger.log('each');

            callback && this.fetchAllByRange(callback, {each: true});

            return this.$parent('each', arguments);
        },

        exists: function (key, callback) {
            this.logger.log('exists', key);

            var $this = this;

            this.fetchAllByRange(function (e, values) {
                if(!e){
                    callback && callback(null, values !== null && values.length > 0);
                } else {
                    callback && callback($this.generateError(e));
                }
            }, {
                keys_only: true,
                where: key
            });
            return this.$parent('exists', arguments);
        },

        fetchAllByRange: function (callback, options) {
            var opts = options || {},
                $this = this,
                columns = opts.keys_only ? 'key' : '*',
                sql,
                keys = [],
                sqlArgs;

            if (opts.count) {
                columns = 'COUNT (' + columns + ') AS count';
            }

            sql = 'SELECT ' + columns + ' FROM ' + this.table_name;

            if (opts.where) {
                sql += ' WHERE key = ?';

                if (typeof opts.where === 'string' || typeof opts.where === 'number') {
                    keys[0] = opts.where;
                } else {
                    keys = opts.where;
                }

                sqlArgs = keys;
            }

            if (opts.where_in) {
                sql += ' WHERE key IN ( ' + opts.where_in + ' )';
            }

            try {
                $this.query({
                    sql: sql,
                    sqlArgs: sqlArgs,
                    onSuccess: function (trans, res) {
                        var values = opts.keys_only ? [] : {},
                            item, i;

                        if (opts.count) {
                            callback(null, res.rows.item(0).count);
                            return;
                        }

                        if (res.rows.length === 0) {
                            callback(null, null);
                            return;
                        }

                        if (opts.singular) {
                            callback(null, JSON.parse(res.rows.item(0).value));
                            return;
                        }

                        for (i = 0; i < res.rows.length; i++) {
                            item = res.rows.item(i);
                            if(item.value){
                                item.value = JSON.parse(item.value);
                            }

                            if (opts.each) {
                                callback(null, item.key, item.value);
                            }

                            if (opts.keys_only) {
                                values.push(item.key);
                            } else {
                                values[item.key] = item.value;
                            }
                        }

                        if (!opts.each) {
                            callback(null, values);
                        }
                    },
                    onError: function (e) {
                        callback($this.generateError(e));
                    }
                });
            } catch (e) {
                callback($this.generateError(e));
            }
        },

        get: function (key, callback) {
            this.logger.log('get', key);

            var keys = [],
                singular = false;

            if (typeof key === 'string' || typeof key === 'number') {
                keys[0] = key;
                singular = true;
            } else {
                keys = key;
            }

            keys = "'" + keys.join("', '") + "'";

            callback && this.fetchAllByRange(callback, {where_in: keys, singular: singular});

            return this.$parent('get', arguments);
        },

        getAll: function (callback) {
            this.logger.log('getAll');

            callback && this.fetchAllByRange(callback);

            return this.$parent('getAll', arguments);
        },

        getKeys: function (callback) {
            this.logger.log('getKeys');

            callback && this.fetchAllByRange(callback, {keys_only: true});

            return this.$parent('getKeys', arguments);
        },

        remove: function (key, callback) {
            var $this = this,
                keys = [];

            if (typeof key === 'string' || typeof key === 'number') {
                keys[0] = key;
            } else {
                keys = key;
            }

            keys = "'" + keys.join("', '") + "'";

            try {
                $this.query({
                    sql: 'DELETE FROM ' + this.table_name + ' WHERE key IN ( ' + keys + ' )',
                    sqlArgs: [],
                    onSuccess: function (trans, res) {
                        callback && callback(null);
                    },
                    onError: function (e) {
                        callback && callback($this.generateError(e));
                    }
                });
            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('remove', arguments);
        },

        set: function (key, value, callback) {
            this.logger.log('set', key, value);

            var $this = this,
                map;

            function buildSQL(map) {
                var k,
                    first = true,
                    sql = '',
                    sqlArgs = [];

                for (k in map) {
                    if (map.hasOwnProperty(k)) {
                        if (first) {
                            sql = 'INSERT OR REPLACE INTO ' + $this.table_name + ' (key, value) ';
                            first = false;
                        } else {
                            sql += ' UNION ';
                        }
                        sql += ' SELECT ?, ?';
                        sqlArgs.push(k, JSON.stringify(map[k]));
                    }
                }

                return {sql: sql, sqlArgs: sqlArgs};
            }

            function runQuery(opts) {
                $this.query({
                    sql: opts.sql,
                    sqlArgs: opts.sqlArgs,
                    onSuccess: function () {
                        callback && callback(null);
                    },
                    onError: function (e) {
                        callback && callback($this.generateError(e));
                    }
                });
            }

            if (typeof key === 'string' || typeof key === 'number') {
                map = {};
                map[key] = value;
            } else {
                map = key;
            }

            try {
                runQuery(buildSQL(map));
            } catch (e) {
                callback && callback($this.generateError(e));
            }

            return this.$parent('set', arguments);
        },

        test: function () {
            return !!window.openDatabase;
        },

        getLength: function (callback) {

            var $this = this;

            callback && this.fetchAllByRange(callback, {count: true});

            return this.$parent('getLength', arguments);
        },

        destroy: function () {
            // delete any local var or close db connection
        }
    });

    driver.STATES = {
        DISCONNECTED: 0,
        CONNECTING: 1,
        CONNECTED: 2
    };

}.apply(Bucket, [Bucket, Bucket.utils]);
