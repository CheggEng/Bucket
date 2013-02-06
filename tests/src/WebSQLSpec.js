describe('WebSQL', function () {
    var db_name = 'Chegg',
        real_table = 'test',
        table_name = 'Chegg_test',
        driver_const = Bucket.drivers['WebSQL'],
        driver,
        db;

    beforeEach(function () {

        driver_const.stores = {};

        tests.getDriver = function (db, table) {
            driver = new Bucket.drivers['WebSQL']({
                table_name: table || real_table,
                db_name: db ||db_name
            });
            return driver;
        };

        db = openDatabase('Bucket', '', 'Bucket', 50 * 1024 * 1024);

        tests.query = function (cb) {
            db.transaction(
                function (trans) {
                    trans.executeSql(cb.sql, cb.sqlArgs, cb.onSuccess, cb.onError);
                }
            );
        };

        tests.getValue = function (key, cb) {
            tests.query({
                sql: 'SELECT value FROM ' + table_name + ' WHERE key=?',
                sqlArgs: [key],
                onSuccess: function (trans, res) {
                    if (res.rows.length > 0) {
                        cb(JSON.parse(res.rows.item(0).value));
                    } else {
                        cb(null);
                    }
                },
                onError: function (e) {
                    cb(e);
                }
            });
            console.log('tests.getValue', key);
        };

        tests.setValues = function (values, cb) {
            function buildSQL(values) {
                var k,
                    first = true,
                    sql = '',
                    sqlArgs = [];

                sql = 'INSERT OR REPLACE INTO ' + table_name + ' (key, value) ';
                for (k in values) {
                    if (values.hasOwnProperty(k)) {
                        if (!first) {
                            sql += ' UNION ';
                        } else {
                            first = false;
                        }
                        sql += ' SELECT ?, ?';
                        sqlArgs.push(k, JSON.stringify(values[k]));
                    }
                }
                return {sql: sql, sqlArgs: sqlArgs};
            }

            function runQuery(opts) {
                tests.query({
                    sql: opts.sql,
                    sqlArgs: opts.sqlArgs,
                    onSuccess: function () {
                        cb(null);
                    },
                    onError: function (e) {
                        cb(e);
                    }
                });
            }

            try {
                runQuery(buildSQL(values));
            } catch (e) {
                cb(e);
            }

            console.log('tests.setValues', values);
        };

        tests.exists = function (key, cb) {
            console.log('tests.exists', key);

            tests.getValue(key, function (values) {
                cb && cb(values !== null);
            });
        };

        tests.clear = function () {
            tests.query({
                sql: 'DELETE FROM ' + table_name,
                sqlArgs: [],
                onSuccess: function () {

                },
                onError: function () {

                }
            });

            console.log('tests.clear');
        };

        tests.clear();
    });
    tests.runTests();



});
