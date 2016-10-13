Mongo DB interface for Node.js applications


Provides Q promise queries (chaining async operations), authentication, and generally a friendly interface.

== usage ==

```js
var MongoDataAccess = require('../data-access/mongo’);

var db = new MongoDataAccess(); // create instance of this singleton

db.connect({host: 'http://my.mongo.host:8800/'}); // connect to database
```
