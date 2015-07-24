
/*
  - MongoDataAccess is a singleton class to ensure database access limited to one connection and instance.

  - MongoDataAccess requires npm packages mongodb & _q to be installed

  - MongoDataAccess callbacks only need to have one argument e.g. function(document) { }, as error handling is within MongoDataAccess 
 */

"use strict";

var MongoDataAccess = module.exports = function () {

    return MongoDataAccess.prototype.getInstance();
};

MongoDataAccess.prototype = (function () {

    // private variables (use get & set if required)
    var _db, // maintain persistent reference to Mongo DB
        _mongoClient = require('mongodb').MongoClient,
        _q = require('q'),
        _callback = function (err, data) {
            if (err) console.error(err);
            return data;
        };

    return {

        /**
         *
         * @param settings {object} an object specifying the parameters for the Mongo connection { host: 'http://localhost:27017' [, user: 'admin', pass: 'admin' ] }
         */
        connect: function (settings) {

            if (!settings || typeof settings !== 'object') throw new Error('Setting argument must be an object { host: \'http://localhost:27017\' }');

            var host = settings.host,
                user = settings.user,
                pass = settings.password;

            if (!host) throw new Error('Host is required!');

            _mongoClient.connect(host, function (err, db) {

                if (err) throw err;
                _db = db;

                if (user) {
                    _db.authenticate(user, pass, function (err) {
                        if (err) console.log('Unable to authenticate MongoDB!');
                    });
                }
            });
        },

        /**
         * Close the Mongo connection
         */
        disconnect: function () {
            _db.close();
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param doc {object} the document to store in the collection
         * @param callback {function} passes the success object from Mongo to the callee
         */
        addEntry: function (collectionName, doc, callback) {

            if (!callback) callback = _callback;

            _db.collection(collectionName, function (err, collection) {

                collection.insert(doc, {w: 1}, function(err, success) {
                    if (err) console.error(err);
                    callback(success);
                });
            });
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param callback {function} passes the success object from Mongo to the callee
         */
        findAll: function (collectionName, callback) {

            _db.collection(collectionName, function (err, collection) {

                collection.find().toArray(function(err, success) {
                    if (err) console.error(err);
                    callback(success);
                });
            });
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @returns {*|promise} q promise object to await async process returning
         */
        promiseFindAll: function (collectionName) {

            var deferred = _q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.find().toArray(function (err, data) {

                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param id {string} Mongo id string (hexadecimal)
         * @param callback {function} passes the success object from Mongo to the callee
         */
        findById: function (collectionName, id, callback) { // callback(err, item)

            _db.collection(collectionName, function (err, collection) {

                collection.findOne({ _id: _db.bson_serializer.ObjectID.createFromHexString(id) }, function(err, success) {
                    if (err) console.error(err);
                    callback(success);
                });
            });
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param id {string} Mongo id string (hexadecimal)
         * @returns {*|promise} q promise object to await async process returning
         */
        promiseFindById: function (collectionName, id) {

            var deferred = _q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.findOne({ _id: _db.bson_serializer.ObjectID.createFromHexString(id) }, function (err, data) {

                    // finish promise process
                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param whereObj {object} a MongoClient query object
         * @returns {*|promise} q promise object to await async process returning
         */
        promiseFindOneByObject: function (collectionName, whereObj) {

            // create promise object to return to caller
            var deferred = _q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.findOne(whereObj, function (err, data) {

                    // finish promise process
                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param whereObj {object} a MongoClient query object
         * @param callback {function} passes the success object from Mongo to the callee
         */
        findOneByObject: function (collectionName, whereObj, callback) { // callback(err, item)

            _db.collection(collectionName, function (err, collection) {

                collection.findOne(whereObj, function(err, success) {
                    if (err) console.error(err);
                    callback(success);
                });
            });
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param whereObj {object} a MongoClient query object
         * @param callback {function} passes the success object from Mongo to the callee
         */
        findAllByObject: function (collectionName, whereObj, callback) { // callback(err, item)

            _db.collection(collectionName, function (err, collection) {

                collection.find(whereObj).toArray(function(err, success) {
                    if (err) console.error(err);
                    callback(success);
                });
            });
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param whereObj {object} a MongoClient query object
         * @returns {*|promise} q promise object to await async process returning
         */
        promiseFindAllByObject: function (collectionName, whereObj) {

            // create promise object to return to caller
            var deferred = _q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.find(whereObj).toArray(function (err, data) {

                    // finish promise process
                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param id {string} Mongo id string (hexadecimal)
         * @param doc {object} the document to store in the collection
         * @param callback {function} passes the success object from Mongo to the callee
         * @returns {string} the id of the updated document for convenience
         */
        updateEntry: function (collectionName, id, doc, callback) {

            // cannot update if _id property is present in document
            if (doc._id) {
                delete doc._id;
            }

            _db.collection(collectionName, function (err, collection) {

                collection.update(
                    { _id: _db.bson_serializer.ObjectID.createFromHexString(id) },
                    { '$set': doc },
                    function(err, success) {
                        if (err) console.error(err);
                        callback(success);
                    }
                );
            });

            // return the ID here so it can be re-used in async operations
            return id;
        },

        /**
         *
         * @param collectionName {string} name of the Mongo collection
         * @param id {string} Mongo id string (hexadecimal)
         * @param callback {function} passes the success object from Mongo to the callee
         */
        removeEntry: function (collectionName, id, callback) {

            _db.collection(collectionName, function (err, collection) {
                collection.remove({ _id: _db.bson_serializer.ObjectID.createFromHexString(id) }, function(err, success) {
                    if (err) console.error(err);
                    callback(success);
                })
            });
        },

        /**
         *
         * @returns {Function|*} guarantees only one instance of the class
         */
        getInstance: function () {

            if (typeof MongoDataAccess.prototype.instance === undefined) {
                MongoDataAccess.prototype.instance = new MongoDataAccess();
            }
            return MongoDataAccess.prototype.instance;
        }
    }
})();