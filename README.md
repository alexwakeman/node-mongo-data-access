A MongoDB interface for Node.js applications

Provides Promise wrapped MongoClient interface. Simplifies and removes boilerplate code.

== usage ==

```js
var MongoDataAccess = require('../utils/mongo-data-access'); // require module
var db = new MongoDataAccess(); // initialize
db.connect({ host: 'mongodb://127.0.0.1:27017/myDatabase' }); // connect to database

// after server is established and listening...

db.find('users', { email: 'user@mycompany.com' }, 1) // on `users` collection, look for doc with email: user@mycompany.com, limit the number of docs to 1
  .then((userDoc) => process(userDoc))
  .catch((error) => throw error);
```
