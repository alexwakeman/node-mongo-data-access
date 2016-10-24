/*
 	Requires npm packages `mongodb` to be installed

 	Copyright (C) 2016 Alex Wakeman

 	mongo-data-access is a CRUD boilerplate API for MongoDB.
 	Meaning a lot less boilerplate code for reading and updating MongoDB.
 	Works asynchronously using native ECMA-6 Promise.
 */

var MongoDataAccess = module.exports = function() {};

MongoDataAccess.prototype = (() => {
	'use strict';
	var db, // maintain persistent reference to Mongo
		mongo = require('mongodb'),
		mongoClient = mongo.MongoClient,
		ObjectID = mongo.ObjectID;

	var _this = {
		/**
		 *
		 * @param settings {Object} specifies the parameters for the Mongo connection { host: 'mongodb://127.0.0.1:27017/dbName' [, user: 'admin', password: 'admin' ] }
		 */
		connect: (settings) => {
			if (!settings || typeof settings !== 'object') {
				throw new Error('`settings` argument must be an object like { host: \'mongodb://127.0.0.1:27017/dbName\' }');
			}

			if (!settings.host) {
				throw new Error('Host address for MongoDB is required.');
			}

			var host = settings.host,
				user = settings.user,
				pass = settings.password;

			mongoClient.connect(host, (error, _db) => {
				if (error) throw error;
				db = _db;
				if (user && pass) {
					db.authenticate(user, pass, (error) => {
						if (error) throw error;
					});
				}
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param query {Object} a Mongo query object
		 * @param limit? {Number} max number of results
		 * @param sort? {Object} optional sort operator e.g. { age: -1 } https://docs.mongodb.com/manual/reference/method/cursor.sort/
		 * @param page? {Number} optional page number. Starts at 1. Omitting will provide all results, capped by limit.
		 * @returns {Promise} results returned. if limit of `1` is passed, results array is discarded in favour of first result within it.
		 */
		find: (collectionName, query, limit, sort, page) => {
			if (query.hasOwnProperty('_id') && typeof query._id === 'string') {
				query._id = new ObjectID(query._id);
			}
			return new Promise((resolve, reject) => {
				db.collection(collectionName, (error, collection) => {
					var cur, startIndex, endIndex, maxIndex;
					if (error) {
						return handleErrorResolve(reject, error);
					}

					cur = collection.find(query);

					if (limit && typeof limit === 'number' && limit > 0) {
						cur.limit(parseInt(limit));
					}

					if (sort) {
						cur.sort(sort);
					}
					cur.toArray(callback);

					function callback(error, data) {
						if (error) {
							return handleErrorResolve(reject, error);
						}

						if (limit && limit === 1) {
							resolve(data[0]);
						} else if (data.length > 1) {
							if (page && typeof page === 'number' && page > 0) {
								// do the pagination in the app logic instead of using MongoD, as it is more efficient
								// see https://docs.mongodb.com/manual/reference/method/cursor.skip/
								maxIndex = data.length - 1;
								startIndex = (page - 1) * limit;
								startIndex = startIndex >= maxIndex ? startIndex - limit : startIndex;
								endIndex = startIndex + limit;
								endIndex = endIndex > data.length - 1 ? data.length - 1 : endIndex;
								data = data.slice(startIndex, endIndex);
							}
							resolve(data);
						} else {
							resolve(null);
						}
					}
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param input {Object} the document to store in the collection
		 * @returns {Promise} the input document with _id property set by Mongo after insert
		 */
		insertOne: (collectionName, input) => {
			return new Promise((resolve, reject) => {
				db.collection(collectionName, (error, collection) => {
					if (error) {
						return handleErrorResolve(reject, error);
					}
					collection.insert(input, {w: 1}, (error, resultObj) => {
						if (!error && resultObj.result.n === 1) { // only give the input its ID if write op was ok
							input._id = resultObj.insertedIds[0];
						}
						handleErrorResolve(reject, error, resolve, input);
					});
				});
			});
		},

		/**
		 * Replace existing document with given document
		 * @param collectionName {String} name of the Mongo collection
		 * @param document {Object} the document to store in the collection
		 * @returns {Promise} wrapping the updated document
		 */
		updateDocument: (collectionName, document) => {
			return new Promise((resolve, reject) => {
				var duplicateDoc = {};
				if (!collectionName || !document) {
					return handleErrorResolve(reject, new Error('All params are required.'));
				}
				if (document._id) {
					/*
						Duplicate the document because we need to remove ID,
						and therefore mutate the user input, in an Async function.
						The document will be altered in the calling function, which is
						not desirable.
						Therefore: treat user input as immutable.
					 */
					if (typeof document._id === 'string') {
						document._id = _this.getBsonObjectId(document._id);
					}
					Object.keys(document).forEach((key) => {
						duplicateDoc[key] = document[key];
					});
					delete duplicateDoc._id;
				} else {
					throw new Error('Document must have an _id property');
				}
				db.collection(collectionName, (error, collection) => {
					if (error) {
						return handleErrorResolve(reject, error);
					}
					collection.update(
						{ _id: document._id },
						{ $set: duplicateDoc },
						(error) => {
							handleErrorResolve(reject, error, resolve, document)
						}
					);
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param findObj {Object} a Mongo query object
		 * @param updateObj {Object} object containing Mongo update operators
		 * @returns {Promise}
		 */
		update: (collectionName, findObj, updateObj) => {
			return new Promise((resolve, reject) => {
				if (!collectionName || !findObj || !updateObj) {
					return handleErrorResolve(reject, new Error('All params are required.'));
				}
				db.collection(collectionName, (error, collection) => {
					if (error) {
						return handleErrorResolve(reject, error);
					}
					collection.update(
						findObj,
						updateObj,
						{ multi: true },
						(error) => {
							handleErrorResolve(reject, error, resolve)
						}
					);
				});
			});
		},

		/**
		 * Remove an entry from an embedded array, which matches pullObj specification
		 * @param collectionName {String} name of the Mongo collection
		 * @param findObj {Object}
		 * @param pullObj {Object} a MongoDB $pull update compatible object https://docs.mongodb.com/manual/reference/operator/update/pull/
		 * @returns {Promise}
		 */
		pull: (collectionName, findObj, pullObj) => {
			return new Promise((resolve, reject) => {
				if (!pullObj || typeof pullObj !== 'object') return handleErrorResolve(reject, new Error('pullObj param must be of type `object`.'));
				db.collection(collectionName, (error, collection) => {
					if (error) {
						return handleErrorResolve(reject, error);
					}
					collection.update(
						findObj,
						{ $pull: pullObj },
						{ multi: true },
						(error, doc) => {
							handleErrorResolve(reject, error, resolve)
						}
					);
				});
			});
		},

		/**
		 *
		 * @param collectionName {String} name of the Mongo collection
		 * @param query {Object} Mongo query object
		 * @param justOne? {Boolean} indicates if many or one doc to be removed
		 */
		remove: (collectionName, query, justOne) => {
			return new Promise((resolve, reject) => {
				if (!query) handleErrorResolve(reject, new Error('query object is required.'));
				if (!justOne && justOne !== false) justOne = true; // default to just one document
				db.collection(collectionName, (error, collection) => {
					handleErrorResolve(reject, error);
					collection.remove(query, { justOne: justOne } , (error) => handleErrorResolve(reject, error, resolve));
				});
			});
		},

		/**
		 * Close the Mongo connection
		 */
		close: () => db.close(),

		/**
		 *
		 * @param id {String} string based ObjectId hexadecimal value
		 * @returns {*}
		 */
		getBsonObjectId: (id) => new ObjectID(id)
	};

	/**
	 *
	 * @param reject {Function} - a Promise instance's reject method
	 * @param error {MongoError|Error} - an Error type instance
	 * @param resolve? {Function} - a Promise instance's resolve method (optional)
	 * @param doc? {Object|String|Boolean} - document to return to Promise .then() callback
	 */
	function handleErrorResolve(reject, error, resolve, doc) {
		if (error) {
			if (console && console.error) console.error(error);
			reject(error);
		} else if (resolve) {
			resolve(doc || true);
		}
	}

	return _this;
})();
