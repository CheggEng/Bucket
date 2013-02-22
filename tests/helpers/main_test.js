var tests = tests || {};
tests.runTests = function runTests() {


    var
    /* Should return a driver*/
        getDriver = function () {
            return new Bucket.Driver();
        },

        /**
         * @param string key
         * @async
         * @return string value
         */
            getValue = function (key, cb) {
            cb && cb();
        },

        /**
         * @param object map key=>value map
         *
         * @async
         */
            setValues = function (map, cb) {
            cb && cb();
        },

        /**
         * @param array keys
         * @async
         * @return bool true if any of the keys exists, false otherwise
         */
            exists = function (keys, cb) {
            cb && cb();
        },

        /**
         * remove all driver stored items
         * @async
         */
            clear = function (cb) {
            cb && cb();
        }
        ;

    function resetTests() {
        tests.getDriver = getDriver;
        tests.getValue = getValue;
        tests.setValues = setValues;
        tests.exists = exists;
        tests.clear = clear;
    }

    afterEach(resetTests);

    resetTests();

    /*
     * initialized the test - will set the async check, wait for the driver to be ready, and then start the test
     *
     * @param int cb_count how many async callbacks should complete on the test
     * @param function cb will be passed the driver when ready
     * @param string [message] alternative message when async timeout is done
     *
     * @async
     *
     * @return Driver
     */
    function initTest(cb_count, cb, msg) {
        var driver = tests.getDriver();
        tests.done = 0;

        waitsFor(function () {
            return tests.done == cb_count;
        }, msg || "all tests should have finished running", 1000);

        driver.addEvent('load:once', function () {
            cb(driver)
        }, "waiting for load event");
    }

    it("Should fire a load event", function () {
        initTest(1, function () {
            tests.done++
        });
    });

    it("Should use the set method properly", function () {
        initTest(3, function (driver) {
            driver.set("foo", "bar", function (err) {
                expect(err).toEqual(null, "there should be no error");

                tests.getValue('foo', function (value) {
                    expect(value).toEqual('bar', 'setting values using singular form should work');
                    tests.done++;
                });
            });

            driver.set({
                "baz":"bla",
                "arieh":"glazer"
            }, null, function (err) {
                expect(err).toEqual(null, "there should be no error");

                tests.getValue("baz", function (value) {
                    expect(value).toEqual("bla", "settings values using plural from should work");
                    tests.done++;
                });

                tests.getValue('arieh', function (value) {
                    expect(value).toEqual('glazer', "setting values using plural form should work");
                    tests.done++;
                });
            });
        });
    });

    it("Should get values properly", function () {
        initTest(4, function (driver) {
            tests.setValues({"arieh":"glazer", "nir":"geier", "yehuda":"gilad"}, function () {
                tests.done++;

                driver.get("arieh", function (err, value) {
                    expect(err).toEqual(null, "there should be no error");
                    expect(value).toEqual("glazer", "getting singular value should work");
                    tests.done++;
                });

                driver.get(["nir", "yehuda", "shahaf"], function (err, map) {
                    expect(err).toEqual(null, "there should be no error");
                    expect(JSON.stringify(map)).toEqual(JSON.stringify({"nir":"geier", "yehuda":"gilad"}));
                    tests.done++;
                });

                driver.get('shahaf', function(err, value){
                    expect(err).toEqual(null, "there should be no error");
                    expect(value).toEqual(null);
                    tests.done++;
                });
            });
        });
    });
    
    it("Should return object when asking for array of elements", function () {
        initTest(2, function (driver) {
            
            tests.setValues({"arieh":"glazer", "yehuda":"gilad"}, function () {
                tests.done++;
                
                driver.get(["arieh"], function (err, map) {
                    expect(err).toEqual(null, "there should be no error");
                    expect(JSON.stringify(map)).toEqual(JSON.stringify({"arieh":"glazer"}), 'expecting object to be returned');
                    tests.done++;
                });
            });
        });
    });

    it("Should remove values properly", function () {
        initTest(4, function (driver) {
            tests.setValues({"arieh":"glazer", "nir":"geier", "yehuda":"gilad"}, function () {
                driver.remove("arieh", function (err) {
                    expect(err).toEqual(null, "there should be no error");
                    tests.done++;

                    tests.exists(["arieh"], function (exists) {
                        expect(exists).toEqual(false, "single key should be removed");
                        tests.done++;
                    });
                });

                driver.remove(['nir', 'yehuda'], function (err) {
                    expect(err).toEqual(null, "there should be no error");
                    tests.done++;

                    tests.exists(["nir", 'yehuda'], function (exists) {
                        expect(exists).toEqual(false, "multiple keys should be removed");
                        tests.done++;
                    });
                });
            });
        });
    });

    it("Should clear storage properly", function () {
        initTest(2, function (driver) {
            tests.setValues({"arieh":"glazer", "nir":"geier", "yehuda":"gilad"}, function () {
                driver.clear(function (err) {
                    expect(err).toEqual(null, "there should be no error");
                    tests.done++;

                    tests.exists(['arieh', 'nir', 'yehuda'], function (exists) {
                        expect(exists).toEqual(false, "all keys should be removed");
                        tests.done++;
                    });
                });
            });
        });
    });

    it("Should have a working getLength method", function () {
        initTest(1, function (driver) {
            tests.setValues({"arieh":"glazer", "nir":"geier", "yehuda":"gilad"}, function () {
                driver.getLength(function (err, len) {
                    expect(err).toEqual(null, "there should be no error");
                    tests.done++;
                    expect(len).toEqual(3, "should have a propper count");
                });
            });
        });
    });

    it("Should have a working each method", function () {
        var values = {"arieh":"glazer", "nir":"geier", "yehuda":"gilad"};
        initTest(3, function (driver) {
            tests.setValues(values, function () {
                driver.each(function (err, key, value) {
                    expect(err).toEqual(null, "there should be no error");
                    tests.done++;
                    expect(values[key]).toEqual(value);
                });
            });
        });
    });

    it("Should have a working getKeys method", function () {
        var exp_keys = ["arieh", "nir", "yehuda"];

        initTest(1, function (driver) {
            tests.setValues({"arieh":"glazer", "nir":"geier", "yehuda":"gilad"}, function () {
                driver.getKeys(function (err, keys) {
                    var i, key;
                    tests.done++;

                    for (i = 0; key = keys[i]; i++) {
                        expect(exp_keys.indexOf(key)).toBeGreaterThan(-1);
                    }
                });
            });
        });
    });

    it("Should have a working getAll method", function () {
        var values = {"arieh":"glazer", "nir":"geier", "yehuda":"gilad"};
        initTest(1, function (driver) {
            tests.setValues(values, function () {
                driver.getAll(function (err, results) {
                    tests.done++;
                    expect(JSON.stringify(results)).toEqual(JSON.stringify(values));
                });
            });
        });
    });


    it("Should be able to check if falsey values exists", function () {
        var driver = tests.getDriver(), done = 0;

        driver.addEvent('load', function () {
            tests.setValues({foo:false}, function () {
                driver.exists('foo', function (err, flag) {
                    done++;
                    expect(flag).toEqual(true, "Value should exist");
                });
            });
        });
    });

    it("Should support 2 simultaneous databases", function(){
        var db1 = tests.getDriver('Test', 'test1'),
            db2 = tests.getDriver('Test', 'test2'),
            test = {done:0};

        var s = new Stack(
            function(){
                test.done++;
                db1.addEvent('load', this.next);
            },
            function(){
                test.done++;
                db2.addEvent('load', this.next);

            },
            function(){
                test.done++;
                db1.set('a','a', this.next);
            },
            function(){
                test.done++;
                db2.set('a','b', this.next);
            },
            function(){
                test.done++;
                db1.get('a', this.next);
            },
            function(err, value){
                test.done++;
                test.value1 = value;
                db2.get('a', this.next);
            },
            function(err, value){
                test.done++;

                expect(test.value1).toEqual('a');
                expect(value).toEqual('b');
            }
        );

        waitsFor(
            function(){
                return test.done == 7;
            },
            "all steps should have ran",
            2000
        );

        s.run();
    });

//    it("Should have a functioning exists method", function () {
//        initTest(2, function (driver) {
//            tests.setValues({"arieh":"glazer"}, function () {
//                driver.exists('arieh', function (err, exists) {
//                    tests.done++;
//                    expect(exists).toBeTruthy();
//                });
//
//                driver.exists("nir", function (err, exists) {
//                    tests.done++;
//                    expect(exists).toBeFalsy();
//                });
//            });
//        });
//    });

};
