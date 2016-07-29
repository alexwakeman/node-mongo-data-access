/*
 	Requires npm packages `mongodb` & `q` to be installed

 	Copyright (C) 2016 Alex Wakeman

 	mongo-data-access is a CRUD boilerplate API for MongoDB.
 	Now you need a lot less boilerplate code for reading and updating Mongo.
 	Works with Promises too, for easy async MongoDB updates.
 */

var MongoDataAccess = module.exports = function () {};

MongoDataAccess.prototype = (function () {
	'use strict';
	var _db, // maintain persistent reference to Mongo
		_mongo = require('mongodb'),
		_mongoClient = _mongo.MongoClient,
		_ObjectID = _mongo.ObjectID,
		_q = require('q'),
		_callback = function (error, doc) { // re-usable fake callback function used when one is not necessary from the callee (e.g. deletions)
			if (error) console.error(error);
			return doc;
		};

	return {
		/**
		 * @param settings {Object} specifies the parameters for the Mongo connection { host: 'http://localhost:27017' [, user: 'admin', password: 'admin' ] }
		 */
		connect: function (settings) {
			if (!settings || typeof settings !== 'object') throw new Error('`settings` argument must be an object like { host: \'http://localhost:27017\' }');

			var host = settings.host,
				user = settings.user,
				pass = settings.password;

			if (!host) throw new Error('Host is required!');

			_mongoClient.connect(host, function (err, db) {
				if (err) throw err;
				_db = db;

				if (user && pass) {
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
		 * @param collectionName {String} name of the Mongo collection
		 * @param doc {Object} the document to store in the collection
		 * @param callback {Function} passes the success object from Mongo to the callee
		 */
		addEntry: function (collectionName, doc, callback) {
			if (!callback) callback = _callback;
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					callback(error);
					return;
				}
				collection.insert(doc, {w: 1}, function (error, doc) {
					if (error) console.error(error);
					callback(error, doc);
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param callback {Function} passes the success object from Mongo to the callee
		 */
		findAll: function (collectionName, callback) {
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					callback(error);
					return;
				}
				collection.find().toArray(function (error, doc) {
					if (error) console.error(error);
					callback(error, doc);
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @returns {*|promise} q promise object to await async process returning
		 */
		promiseFindAll: function (collectionName) {
			var deferred = _q.defer();
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					deferred.reject(error);
					return;
				}
				collection.find().toArray(function (error, doc) {
					if (error) {
						console.error(error);
						deferred.reject(error);
					} else {
						deferred.resolve(doc);
					}
				});
			});
			return deferred.promise;
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param id {String} Mongo id string (hexadecimal)
		 * @param callback {Function} passes the success object from Mongo to the callee
		 */
		findById: function (collectionName, id, callback) { // callback(err, item)
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					callback(error);
					return;
				}
				var oId = new _ObjectID(id); // generate a binary of id
				collection.find(oId).limit(1).next(function (error, doc) {
					if (error) console.error(error);
					callback(error, doc);
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param id {String} Mongo id string (hexadecimal)
		 * @returns {*|promise} q promise object to await async process returning
		 */
		promiseFindById: function (collectionName, id) {
			var deferred = _q.defer();
			var oId = new _ObjectID(id); // generate a binary of id
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					deferred.reject(error);
					return;
				}
				collection.find(oId).limit(1).next(function (error, doc) {
					if (error) {
						console.error(error);
						deferred.reject(error);
					} else {
						deferred.resolve(doc);
					}
				});
			});
			return deferred.promise;
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param whereObj {Object} a MongoClient query object
		 * @returns {*|promise} q promise object to await async process returning
		 */
		promiseFindOneByObject: function (collectionName, whereObj) {
			// create promise object to return to caller
			var deferred = _q.defer();
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					deferred.reject(error);
					return;
				}
				collection.find(whereObj).limit(1).next(function (error, doc) {
					if (error) {
						console.error(error);
						deferred.reject(error);
					} else {
						deferred.resolve(doc);
					}
				});
			});
			return deferred.promise;
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param whereObj {Object} a MongoClient query object
		 * @param callback {Function} passes the success object from Mongo to the callee
		 */
		findOneByObject: function (collectionName, whereObj, callback) { // callback(err, item)
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					callback(error);
					return;
				}
				collection.find(whereObj).limit(1).next(function (error, doc) {
					if (error) console.error(error);
					callback(error, doc);
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param whereObj {Object} a MongoClient query object
		 * @param callback {Function} passes the success object from Mongo to the callee
		 */
		findAllByObject: function (collectionName, whereObj, callback) { // callback(err, item)
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					callback(error);
					return;
				}
				collection.find(whereObj).toArray(function (error, doc) {
					if (error) console.error(error);
					callback(error, doc);
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param whereObj {Object} a MongoClient query object
		 * @returns {*|promise} q promise object to await async process returning
		 */
		promiseFindAllByObject: function (collectionName, whereObj) {
			// create promise object to return to caller
			var deferred = _q.defer();
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					deferred.reject(error);
					return;
				}
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
		 * @param collectionName {String} name of the Mongo collection
		 * @param id {String} Mongo id string (hexadecimal)
		 * @param doc {Object} the document to store in the collection
		 * @param callback {Function} passes the success object from Mongo to the callee
		 * @returns {String} the id of the updated document for convenience
		 */
		updateEntry: function (collectionName, id, doc, callback) {
			// cannot update if _id property is present in document
			var oId = new _ObjectID(id); // generate a binary of id
			if (doc._id) {
				delete doc._id;
			}
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					callback(error);
					return;
				}
				collection.update(
					oId,
					{'$set': doc},
					function (error, doc) {
						if (error) console.error(error);
						callback(error, doc);
					}
				);
			});
			// return the ID here so it can be re-used in async operations
			return id;
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param id {String} Mongo id string (hexadecimal)
		 * @param callback {Function} passes the success object from Mongo to the callee
		 */
		removeEntry: function (collectionName, id, callback) {
			var oId = new _ObjectID(id); // generate a binary of id
			_db.collection(collectionName, function (error, collection) {
				if (error) {
					console.error(error);
					callback(error);
					return;
				}
				collection.remove(oId, function (error, doc) {
					if (error) console.error(error);
					callback(error, doc);
				})
			});
		},

		/**
		 *
		 * @returns {Function|*} enforce singleton pattern
		 */
		getInstance: function () {
			if (typeof MongoDataAccess.prototype.instance === 'undefined') {
				MongoDataAccess.prototype.instance = new MongoDataAccess();
			}
			return MongoDataAccess.prototype.instance;
		}
	}
})();
