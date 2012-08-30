describe('IndexedDB', function () {
    var db_name = 'Chegg',
        table_name = 'test',
        db_version = 1,
        driver_const = Bucket.drivers['IndexedDB'],
        driver;

    beforeEach(function () {

        driver_const.stores = {};

        tests.getDriver = function () {
            driver = new Bucket.drivers['IndexedDB']({
                table_name: table_name,
                db_name: db_name
            });
            return driver;
        };

        tests.getValue = function (key, cb) {
            console.log('tests.getValue', key);

            var db = driver.getDBConnection(),
                trans = db.transaction([table_name], "readonly"),
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

        };

        tests.setValues = function (values, cb) {
            console.log('tests.setValues', values);
            var db = driver.getDBConnection(),
                trans = db.transaction([table_name], 'readwrite'),
                store = trans.objectStore(table_name),
                key,
                add_req;

            // set add request events handlers so we won't generate them inside the loop
            function add_req_onsuccess(e) {
                console.log('add request success event ', e);
            }

            function add_req_onerror(e) {
                console.log('add request error event ', e);
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
                console.log('transaction complete event', e);
                cb(null);
            };

            trans.onerror = function (e) {
                console.log('transaction error event', e);
                cb(e);
            };
        };

        tests.exists = function (key, cb) {
            console.log('tests.exists', key);

            tests.getValue(key, function (values) {
                cb && cb(values !== null);
            });
        };

        tests.clear = function (cb) {
            console.log('tests.clear');

            function getDB(cb) {
                var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB,
                    db_req = indexedDB.open(db_name, db_version);

                db_req.onsuccess = function (e) {
                    cb(e.target.result);
                };
            }

            getDB(function (db) {
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
        };

        tests.clear();
    });
    tests.runTests();
});
