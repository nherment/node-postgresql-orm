var DBConnection = require('./DBConnection.js')
var _ = require('lodash')
var assert = require('assert')

function EntityDB() { }

EntityDB.setup = function(connectionString) {
	this._db = new DBConnection(connectionString)
}

EntityDB.db = function() {
	return this._db
}

EntityDB.define = function(definition) {
	var entityDB = new EntityDB()
	entityDB.setDefinition(definition)
	if(!this._db) {
		throw new Error('call setup() first')
	}
	entityDB.setDB(this._db)
	return entityDB
}

EntityDB.prototype.setDefinition = function(definition) {
	this._definition = definition
	assert.ok(definition, 'definition required')
	assert.ok(definition.name, 'definition name required')
	this._type = definition.name
}

EntityDB.prototype.setDB = function(db) {
	this._db = db
}

EntityDB.prototype.dropTable = function(callback) {
	this._db.query("DROP TABLE IF EXISTS " + escape(this._definition.name) + " CASCADE", [], function(err, result) {

		callback(err)
	})
}

EntityDB.prototype.createTable = function(callback) {
	var queryStr = 'CREATE TABLE "' + escape(this._definition.name) + '" '
	var dataTypes = []
	for(var attr in this._definition.attributes) {
		var attrDef = this._definition.attributes[attr]
		var dataTypeStr = '"' + escape(camelToSnakeCase(attr)) + '" ' + attrDef.type
		if(attrDef.unique) {
			dataTypeStr += ' UNIQUE'
		}
		dataTypes.push(dataTypeStr)
	}
	dataTypes.push('id SERIAL')
	dataTypes.push('CONSTRAINT pk_' + this._definition.name + '_id PRIMARY KEY (id)')
	queryStr += '( '
	queryStr += dataTypes.join(', ')
	queryStr += ' )'

	this._db.query(queryStr, [], function(err, result) {
		callback(err)
	})
}

EntityDB.prototype.save = function(entity, callback) {
	if(!entity) {
		setImmediate(function() {
			callback(new Error('null entity cannot be saved'))
		})
	} else if(!entity.id) {
		this.create(entity, callback)
	} else {
		this.update(entity, callback)
	}
}

EntityDB.prototype.create = function(entity, callback) {
	var sqlStmt = this.buildInsertStmt(entity)
	this._db.query(sqlStmt.queryString,
					sqlStmt.values,
					function(err, result) {
		if(err) {
			return callback(err, undefined)
		}
		if(result && result.rows && result.rows.length > 0) {
			var createdEntity = _.cloneDeep(entity)
			createdEntity.id = result.rows[0].id
			callback(undefined, createdEntity)
		} else {
			callback(new Error('something went wrong: ' + JSON.stringify(result)), undefined)
		}

	})
}

EntityDB.prototype.update = function(entity, callback) {
	var sqlStmt = this.buildUpdateStmt(entity)
	var self = this
	this._db.query(sqlStmt.queryString,
					sqlStmt.values,
					function(err, result) {
		if(err) {
			return callback(err, undefined)
		}
		if(result && result.rows && result.rows.length > 0) {
			var updatedEntity = dbToJS(result.rows[0])
			updatedEntity._type = self._type
			callback(undefined, updatedEntity)
		} else {
			callback(new Error('something went wrong: ' + JSON.stringify(result)), undefined)
		}

	})
}

EntityDB.prototype.load = function(entity, callback) {
	var sqlStmt = this.buildSelectStmt(entity)
	var self = this
	this._db.query(sqlStmt.queryString,
					sqlStmt.values,
					function(err, result) {
		if(err) {
			return callback(err, undefined)
		}
		if(result && result.rows && result.rows.length > 0) {
			var foundEntity = dbToJS(result.rows[0])
			foundEntity._type = self._type
			callback(undefined, foundEntity)
		} else {
			// not found
			callback(undefined, null)
		}

	})
}

EntityDB.prototype.list = function(query, callback) {
	var sqlStmt = this.buildSelectStmt(query.filter, query.sort, query.limit, query.offset)
	var self = this
	// console.log(sqlStmt.queryString)
	this._db.query(sqlStmt.queryString,
		sqlStmt.values,
		function(err, result) {
			if(err) {
				return callback(err, undefined)
			}
			if(result && result.rows && result.rows.length > 0) {
				var entities = []
				for(var i = 0 ; i < result.rows.length ; i++) {
					var entity = dbToJS(result.rows[i])
					entity._type = self._type
					entities.push(entity)
				}

				callback(undefined, entities)
			} else {
				// not found
				callback(undefined, null)
			}
		}
	)
}

EntityDB.prototype.count = function(entity, callback) {
	var sqlStmt = this.buildCountStmt(entity)
	var self = this
	// console.log(sqlStmt.queryString)
	this._db.query(sqlStmt.queryString,
		sqlStmt.values,
		function(err, result) {
			if(err) {
				return callback(err, undefined)
			}
			if(result && result.rows && result.rows[0]) {

				callback(undefined, result.rows[0].count)
			} else {
				// not found
				callback(undefined, 0)
			}
		}
	)
}

EntityDB.prototype.delete = function(entity, callback) {
	var sqlStmt = this.buildDeleteStmt(entity)
	this._db.query(sqlStmt.queryString,
					sqlStmt.values,
					function(err, result) {
		if(err) {
			return callback(err, undefined)
		}
		if(result) {
			callback(undefined, result.rowCount)
		} else {
			callback(new Error('something went wrong: ' + JSON.stringify(result)), undefined)
		}

	})
}

EntityDB.prototype.buildCountStmt = function(entity) {
	var preparedStmt = this.prepareStatement(entity)
	var params = []
	for(var i = 0 ; i < preparedStmt.params.length ; i++) {
		params.push(preparedStmt.fields[i] + '=' + preparedStmt.params)
	}

	var queryString = 'SELECT count(*) FROM ' + preparedStmt.tableName
	if(params.length > 0) {
		queryString += ' WHERE ' + params.join(' AND ')
	}

	return {
		queryString: queryString,
		values: preparedStmt.values
	}
}

EntityDB.prototype.buildSelectStmt = function(entity, sort, limit, offset) {

	var preparedStmt = this.prepareStatement(entity)
	var params = []
	for(var i = 0 ; i < preparedStmt.params.length ; i++) {
		params.push(preparedStmt.fields[i] + '=' + preparedStmt.params)
	}

	var queryString = 'SELECT * FROM ' + preparedStmt.tableName

	if(params.length > 0) {
		queryString += ' WHERE ' + params.join(' AND ')
	}

	if(sort) {
		var sortStmt = ''
		for(var attributeName in sort) {
			sortStmt += ' ' + escape(camelToSnakeCase(attributeName))
			if(sort[attributeName] && sort[attributeName].toLowerCase && sort[attributeName].toLowerCase() === 'desc') {
				sortStmt += ' DESC'
			} else {
				sortStmt += ' ASC'
			}
		}
		if(sortStmt) {
			queryString += ' ORDER BY' + sortStmt
		}
	}
	if(limit) {
		queryString += ' LIMIT ' + parseInt(limit)
	}
	if(offset) {
		queryString += ' OFFSET ' + parseInt(offset)
	}
	return {
		queryString: queryString,
		values: preparedStmt.values
	}
}

EntityDB.prototype.buildInsertStmt = function(entity) {
	var preparedStmt = this.prepareStatement(entity)
	return {
		queryString: 'INSERT INTO ' +
									'"' + preparedStmt.tableName + '"' +
									' (' + preparedStmt.fields.join(',') + ')' +
									' values (' + preparedStmt.params.join(',') + ')' +
									'  RETURNING id',
		values: preparedStmt.values
	}
}

EntityDB.prototype.buildUpdateStmt = function(entity) {
	var id = entity.id
	var preparedStmt = this.prepareStatement(entity)
	var params = []
	for(var i = 0 ; i < preparedStmt.params.length ; i++) {
		params.push(preparedStmt.fields[i] + '=' + preparedStmt.params[i])
	}
	return {
		queryString: 'UPDATE ' +
									preparedStmt.tableName +
									' SET ' + params.join(', ') +
									' WHERE id='+escape(id)+
									'  RETURNING *',
		values: preparedStmt.values
	}
}

EntityDB.prototype.buildDeleteStmt = function(entity) {
	var preparedStmt = this.prepareStatement(entity)
	var params = []
	for(var i = 0 ; i < preparedStmt.params.length ; i++) {
		params.push(preparedStmt.fields[i] + '=' + preparedStmt.params[i])
	}
	return {
		queryString: 'DELETE FROM ' +
									preparedStmt.tableName +
									' WHERE ' + params.join(' AND '),
		values: preparedStmt.values
	}
}

EntityDB.prototype.prepareStatement = function(entity) {
	var tableName = escape(this._type)
	var fields = []
	var params = []
	var values = []
	if(entity) {
		for(var attr in entity) {
			if(entity.hasOwnProperty(attr) && !/^_/.test(attr) && attr !== 'id') {
				fields.push('"' + escape(camelToSnakeCase(attr)) + '"')
				params.push('$' + (params.length+1) )
				values.push(entity[attr])
			}
		}
	}

	return {
		tableName: tableName,
		fields: fields,
		params: params,
		values: values
	}
}

var escape = function(input) {
  if(input instanceof Date) {
    return input
  }
  var str = "" + input;
  return str.replace(/[\0\b\t\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\b":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\t":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\"+char;

    }
  });
};

var upperCaseRegExp = /[A-Z]/g

function camelToSnakeCase(field) {
	upperCaseRegExp.lastIndex = 0
	return field.replace(upperCaseRegExp, function(str, offset) {
		return('_'+str.toLowerCase());
	})
}

function snakeToCamelCase(column) {
	var arr = column.split('_')
	var field = arr[0]
	for(var i = 1 ; i < arr.length ; i++) {
		field += arr[i][0].toUpperCase() + arr[i].slice(1, arr[i].length)
	}

	return field
}

function dbToJS(dbEntity) {
	var jsEntity = {}
	for(var attr in dbEntity) {
		if(dbEntity.hasOwnProperty(attr)) {
			jsEntity[snakeToCamelCase(attr)] = dbEntity[attr]
		}
	}
	return jsEntity
}

module.exports = EntityDB
