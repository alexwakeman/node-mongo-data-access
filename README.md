Mongo DB interface for Node.js applications


Provides Q promise queries (chaining async operations), authentication, and generally a friendly interface.

== usage ==

To be used inside your Express server routes

	var MongoDataAccess = require('../data-access/mongo’);

	var db = new MongoDataAccess(); // create instance of this singleton

	db.connect({host: 'http://my.mongo.host:8800/'}); // connect to database


Using Q for async promises:

	q.all([
                db.promiseFindAllByObject('campaigns', query),
                db.promiseFindById('publishers', id)
            ])
                .then(function(data) {

                    var campaigns = data[0],
                        publisher = data[1];

                    // etc…
                });

	db.findAll('publishers', function(error, data) {
                if (error) {
                    res.status(500).send(error.message);
                }

                res.send(data);
            });

// POST

	var input = req.body;

	db.addEntry('publishers', input);

// PUT

	db.updateEntry('publishers', req.params.id, input, function(error) {
            if (error) {

                res.status(500).send(error.message);
            }
            res.status(200).send('');
        });

// DELETE

	db.removeEntry('publishers', req.params.id, function(error) {

            if (error) {

                res.status(500).send(error.message);
            }

            res.status(200).send('');
        });
