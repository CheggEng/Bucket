describe('IndexedDB', function () {
    var db_name = 'Chegg',
        table_name = 'test',
        db_version = 2,
        driver_const = jStore.drivers['IndexedDB'],
        driver,
        openDB;

    window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.oIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.mozIDBKeyRange || window.oIDBKeyRange || window.msIDBKeyRange;

    openDB = function (options) {
        var db_req = indexedDB.open(db_name, db_version);

        function onupgradeneeded(e) {
            console.log('test onupgradeneeded', e);

            var db, store;

            switch (e.type) {
                case 'success':
                    db = e.currentTarget.result.db;
                    break;

                case 'upgradeneeded':
                    db = e.currentTarget.result;
                    break;
            }

            store = db.createObjectStore(this.table_name, {'keyPath': 'key'});
            store.createIndex("key", "key", {unique: false});

            options.onsuccess_cb && options.onsuccess_cb(db);
        }

        db_req.onsuccess = function (e) {
            var db = e.target.result;
            
            options.onsuccess_cb && options.onsuccess_cb(db);
            // if the version isn't change fire opendb and break logic.
            if (parseInt(db_version, 10) === parseInt(db.version || 0, 10)) {
                //options.onsuccess_cb && options.onsuccess_cb(db);
                return;
            }

            // use older version of database onupgradeneeded (webkit)
            if (typeof db.setVersion === "function") {
                var version_req = db.setVersion(db_version);
                version_req.onsuccess = onupgradeneeded;
            }
        };

        db_req.onerror = function (e) {
            console.log('test db_req error event', e);
        };

        db_req.onupgradeneeded = onupgradeneeded;
    };

    beforeEach(function () {

        driver_const.stores = {};

        tests.getDriver = function () {
            driver = new jStore.drivers['IndexedDB']({
                table_name: table_name,
                db_name: db_name
            });
            return driver;
        };

        tests.getValue = function (key, cb) {
            console.log('tests.getValue', key);
            openDB({
                onsuccess_cb: function (db) {
                    var trans, store, req;

                    trans = db.transaction([table_name], "readonly");
                    store = trans.objectStore(table_name);
                    req = store.get(key);

                    req.onerror = function (e) {
                        cb && cb(null);
                    };

                    req.onsuccess = function (e) {
                        cb && cb(JSON.parse(req.result.value));
                    };
                }
            });
        };

        tests.setValues = function (values, cb) {
            console.log('tests.setValues', values);
            openDB({
                onsuccess_cb: function (db) {
                    var trans, store, key, add_req, add_req_onsuccess, add_req_onerror;

                    trans = db.transaction([table_name], 'readwrite');
                    store = trans.objectStore(table_name);

                    // set add request events handlers so we won't generate them inside the loop
                    add_req_onsuccess = function (e) {
                        console.log('add request success event ', e);
                    };

                    add_req_onerror = function (e) {
                        console.log('add request error event ', e);
                    };

                    for (key in values) {
                        if (values.hasOwnProperty(key)) {
                            add_req = store.add({
                                'key': key,
                                'value': JSON.stringify(values[key])
                            });

                            add_req.onsuccess = add_req_onsuccess;
                            add_req.onerror = add_req_onerror;
                        }
                    }

                    trans.oncomplete = function (e) {
                        console.log('transaction complete event', e);
                        cb();
                    };

                    trans.onerror = function (e) {
                        console.log('transaction error event', e);
                        cb(e);
                    };
                }
            });
        };

        tests.exists = function (keys, cb) {
            console.log('tests.exists', keys);
            cb && cb(null);
        };

        tests.clear = function (cb) {
            console.log('tests.clear');

            openDB({
                onsuccess_cb: function (db) {
                    var cursor, keyRange, items = {},
                        trans = db.transaction([table_name], "readonly"),
                        store = trans.objectStore(table_name);

                    // We select the range of data we want to make queries over 
                    // In this case, we get everything. 
                    // To see how you set ranges, see <a href="/en/IndexedDB/IDBKeyRange" title="en/IndexedDB/IDBKeyRange">IDBKeyRange</a>.
                    keyRange = IDBKeyRange.lowerBound(0);

                    // We open a cursor and attach events.
                    cursor = store.openCursor(keyRange);

                    cursor.onsuccess = function (e) {
                        console.log(e);
                        var result = e.target.result;
                        if (result === null) {
                            return;
                        }

                        items[result.key] = result.value;
                        // The success event handler is fired once for each entry.
                        // So call "continue" on your result object.
                        // This lets you iterate across the data

                        result.continue();
                    };

                    trans.oncomplete = function (e) {
                        var trans, store, key, request;

                        trans = db.transaction(table_name, 'readwrite');
                        store = trans.objectStore(table_name);

                        for (key in items) {
                            request = store.delete(key);
                        }

                        trans.onerror = function (e) {
                            cb && cb(null);
                        };

                        trans.oncomplete = function (e) {
                            cb && cb(null);
                        };
                    };
                }
            });

        };

        tests.clear();
    });
    tests.runTests();
});
