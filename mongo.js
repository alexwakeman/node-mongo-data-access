"use strict";
/*
 Singleton class to ensure database access limited to one connection and instance

 */
var MongoDataAccess = module.exports = function () {

    return MongoDataAccess.prototype.getInstance();
};

MongoDataAccess.prototype = (function () {

    // private variables (use get & set if required)
    var _db, // maintain persistent reference to mongo DB
        _mongoClient = require('mongodb').MongoClient,
        q = require('q'),
        _callback = function (err, data) {
            if (err) throw err;
            return data;
        };

    return {

        connect: function (settings) {

            if (!settings || typeof settings !== 'object') throw new Error('Setting argument must be an object { host: \'http://my.mongo.host:8899\' }');

            var host = settings.host,
                user = settings.user,
                pass = settings.password;

            if (!host) throw new Error('Host is required!');

            _mongoClient.connect(host, function (err, db) {

                if (err) throw err;
                _db = db;


                if (user) {

                    _db.authenticate(user, pass, function (err) {
                        if (err) console.log("Unable to authenticate MongoDB!");
                    });
                }
            });
        },

        disconnect: function () {
            _db.close();
        },

        addEntry: function (collectionName, doc, callback) {

            if (!callback) callback = _callback;

            _db.collection(collectionName, function (err, collection) {

                collection.insert(doc, {w: 1}, callback);
            });
        },

        findAll: function (collectionName, callback) {

            _db.collection(collectionName, function (err, collection) {

                collection.find().toArray(callback);
            });
        },

        promiseFindAll: function (collectionName) {

            var deferred = q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.find().toArray(function (err, data) {

                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        findById: function (collectionName, id, callback) { // callback(err, item)

            if (!callback) {
                console.error('Callback is required for findById.');
                return false;
            }

            _db.collection(collectionName, function (err, collection) {

                collection.findOne({_id: _db.bson_serializer.ObjectID.createFromHexString(id)}, callback);
            });
        },

        promiseFindById: function (collectionName, id) {

            var deferred = q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.findOne({_id: _db.bson_serializer.ObjectID.createFromHexString(id)}, function (err, data) {

                    // finish promise process
                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        promiseFindOneByObject: function (collectionName, whereObj) {

            // create promise object to return to caller
            var deferred = q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.findOne(whereObj, function (err, data) {

                    // finish promise process
                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        findOneByObject: function (collectionName, whereObj, callback) { // callback(err, item)

            _db.collection(collectionName, function (err, collection) {

                collection.findOne(whereObj, callback);
            });
        },

        findAllByObject: function (collectionName, whereObj, callback) { // callback(err, item)

            _db.collection(collectionName, function (err, collection) {

                collection.find(whereObj).toArray(callback);
            });
        },

        promiseFindAllByObject: function (collectionName, whereObj) {

            // create promise object to return to caller
            var deferred = q.defer();

            _db.collection(collectionName, function (err, collection) {

                collection.find(whereObj).toArray(function (err, data) {

                    // finish promise process
                    if (err) deferred.reject(err);
                    else deferred.resolve(data);
                });
            });

            return deferred.promise;
        },

        updateEntry: function (collectionName, id, doc, callback) {

            // cannot update if _id property is present in document
            if (doc._id) {
                delete doc._id;
            }

            _db.collection(collectionName, function (err, collection) {

                collection.update(
                    {_id: _db.bson_serializer.ObjectID.createFromHexString(id)},
                    {'$set': doc},
                    callback
                );
            });

            // return the ID here so it can be re-used in async operations
            return id;
        },

        removeEntry: function (collectionName, id, callback) {

            _db.collection(collectionName, function (err, collection) {
                collection.remove({_id: _db.bson_serializer.ObjectID.createFromHexString(id)}, callback)
            });
        },

        getInstance: function () {

            if (typeof MongoDataAccess.prototype.instance === undefined) {
                MongoDataAccess.prototype.instance = new MongoDataAccess();
            }
            return MongoDataAccess.prototype.instance;
        }
    }
})();