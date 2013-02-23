describe('IndexedDB', function () {
    var db_name = 'Chegg',
        real_table = 'test',
        table_name = 'test',
        driver_const = Bucket.drivers['IndexedDB'],
        idb_proto = driver_const.getObjectStore().prototype,
        driver;

    beforeEach(function () {

        driver_const.stores = {};

        tests.getDriver = function (db, table) {
            driver = new Bucket.drivers['IndexedDB']({
                table_name: table || real_table,
                db_name: db || db_name
            });
            return driver;
        };

        tests.getValue = function (key, cb) {
            console.log('tests.getValue', key);

            driver.getDBConnection(function (db) {
                var trans = db.transaction([table_name], "readonly"),
                    store = trans.objectStore(table_name),
                    req,
                    i,
                    keys = [],
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
                    cb && cb(e);
                }

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

                    if (empty === true) {
                        values = null;
                    }
                    else if (return_object === false) {
                        values = values[key];
                    }

                    cb && cb(values);
                };
            });
        };

        tests.setValues = function (values, cb) {
            console.log('tests.setValues', values);
            
            driver.getDBConnection(function(db){
                var trans = db.transaction([table_name], 'readwrite'),
                store = trans.objectStore(table_name),
                key,
                add_req;

                // set add request events handlers so we won't generate them inside the loop
                function add_req_onsuccess(e) {
                    //console.log('add request success event ', e);
                }
    
                function add_req_onerror(e) {
                    //console.log('add request error event ', e);
                }
    
                for (key in values) {
                    if (values.hasOwnProperty(key)) {
                        add_req = store.put({
                            'key': key,
                            'value': JSON.stringify(values[key])
                        });
    
                        add_req.onsuccess = add_req_onsuccess;
                        add_req.onerror = add_req_onerror;
                    }
                }
    
                trans.oncomplete = function (e) {
                    //console.log('transaction complete event', e);
                    cb(null);
                };
    
                trans.onerror = function (e) {
                    //console.log('transaction error event', e);
                    cb(e);
                };
            });
        };

        tests.exists = function (key, cb) {
            console.log('tests.exists', key);

            tests.getValue(key, function (values) {
                cb && cb(values !== null);
            });
        };

        tests.clear = function (cb) {
            console.log('tests.clear');

            if (!driver) {
                tests.getDriver();
            }

            tests.clean();

            driver.addEvent('load', function(){

                driver.getDBConnection(function (db) {
                    var trans = db.transaction([table_name], "readwrite"),
                        store = trans.objectStore(table_name);

                    store.clear();

                    trans.oncomplete = function (e) {
                        cb && cb(null);
                    };

                    trans.onerror = function (e) {
                        cb && cb(e);
                    };
                });

            });
        };

        tests.stubMethod = function (name, driver) {
            /*
                stub map. key is method name. value is which internal method to stub
                value can be either a method name (string) or and array
                array structure:
                    [ method_name, returned_value [, replace_transaction_object] ]

             */
            var map = {
                    set : 'put',
                    getLength : 'count',
                    remove : 'delete',
                    getAll : ['openCursor', {} ,true],
                    getKeys : ['openCursor', {} ,true],
                    exists : ['index',{
                        getKey : function () {
                            return {};
                        }
                    }],
                    each : ['openCursor', {}, true],
                    clear : ['clear', {}, true]
                },
                method = map[name] || name,
                method_name = method instanceof Array ? method[0] : method,
                stub_transaction = method instanceof Array && method[2],
                value = method instanceof Array ? method[1] : {},
                old, proto
            ;

            function run() {
                console.log('Stub method ' + name + ' was called:',arguments);
                return value;
            }

            if (stub_transaction){
                proto = driver.db;

                old = proto.transaction;

                proto.transaction = function(){
                    return {
                        objectStore : function(){
                            var obj = {};
                            obj[method[0]] = run;
                            return obj;
                        }
                    };
                };

                method_name = 'transaction';
            }else{
                proto = idb_proto;
                old = idb_proto[method_name];
                idb_proto[method_name] = run;
            }

            tests.cleanup.push(function () {
                console.log('restoring method '+name);

                proto[method_name] = old;
            });
        };

        tests.clear();
    });

    tests.runTests();

});
