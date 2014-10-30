
var pg = require('pg');

function DBConnection(connectionString) {
  this.connString = connectionString;
}

DBConnection.prototype.client = function(callback) {
  pg.connect(this.connString, function(err, client, done) {

    if(err) {
      throw err;
    }
    callback(client, function() {
      done();
    })
  });
}

DBConnection.prototype.end = function() {
  // WARNING: global effect
  pg.end();
}

DBConnection.prototype.query = function(queryString, values, callback) {
  this.client(function(client, done) {
    client.query(queryString, values, function(err, result) {
      done();
      if(err) {
        var errorWrapper = new Error('SQL query failed')
        errorWrapper.queryString = queryString
        errorWrapper.values = values
        errorWrapper.source = err
        callback(errorWrapper, undefined)
      } else {
        callback(undefined, result)
      }

    })
  })
}

module.exports = DBConnection;
