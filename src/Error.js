(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(function () {
            return factory();
        });
    } else {
        root.Bucket = root.Bucket || {};
        root.Bucket.Error = factory();
    }
}(this, function (){
/**
 * @module BucketError
 */

    /**
     * @class BucketError
     * @constructor
     * @extends Error
     */
    function BucketError(type, msg, original_error) {
        this.name = 'Bucket Error';
        this.type = type;
        this.message = msg;
        this.original = original_error;
    };

    BucketError.prototype = new Error();
    BucketError.prototype.constructor = BucketError;
    BucketError.prototype.toString = function () {
        return this.type + " " + this.name + " " + this.message;
    };

    /**
     * Default error
     * @property DEFAULT
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    Error.DEFAULT_ERR = "DEFAULT";

    /**
     * Signifies an error that happened due to database size limit overflow
     * @property QUOTA_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    BucketError.QUOTA_ERR = "QUOTA";

    /**
     * Signifies an error that happened due to an action that was not permitted
     *
     * @property PERMISSION_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    BucketError.PERMISSION_ERR = "PERMISSION";

    /**
     * Signifies an error that happened due to an action that violated DB constraints
     *
     * @property CONSTRAINT_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    BucketError.CONSTRAINT_ERR = "CONSTRAINT";

    /**
     * Signifies an error that happened due to a missing table, objectStore;
     *
     * @property NOTFOUND_ERR
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    BucketError.NOT_FOUND_ERR = "NOTFOUND";

    /**
     * Timeout Error
     * @property TIMEOUT
     * @type {String}
     * @readOnly
     * @static
     * @final
     */
    BucketError.TIMEOUT = "TIMEOUT";

    return BucketError;
}));