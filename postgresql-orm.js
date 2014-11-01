var DBConnection = require('./DBConnection.js')
var _ = require('lodash')

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
}

EntityDB.prototype.setDB = function(db) {
	this._db = db
}

EntityDB.prototype.setType = function(entity) {
	entity._type = this._definition.name
}

EntityDB.prototype.dropTable = function(callback) {
	this._db.query("DROP TABLE IF EXISTS " + escape(this._definition.name), [], function(err, result) {
		callback(err)
	})
}

EntityDB.prototype.createTable = function(callback) {
	var queryStr = "CREATE TABLE " + escape(this._definition.name)
	var dataTypes = []
	for(var attr in this._definition.attributes) {
		var attrDef = this._definition.attributes[attr]
		var dataTypeStr = escape(camelToSnakeCase(attr)) + ' ' + attrDef.type
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
	this.setType(entity)
	var sqlStmt = buildInsertStmt(entity)
	this._db.query(sqlStmt.queryString,
					sqlStmt.values,
					function(err, result) {
		if(err) {
			console.log(err)
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
	this.setType(entity)
	var sqlStmt = buildUpdateStmt(entity)
	this._db.query(sqlStmt.queryString,
					sqlStmt.values,
					function(err, result) {
		if(err) {
			console.log(err)
			return callback(err, undefined)
		}
		if(result && result.rows && result.rows.length > 0) {
			var updatedEntity = dbToJS(result.rows[0])
			updatedEntity._type = entity._type
			callback(undefined, updatedEntity)
		} else {
			callback(new Error('something went wrong: ' + JSON.stringify(result)), undefined)
		}

	})
}

EntityDB.prototype.load = function(entity, callback) {
	this.setType(entity)
	var sqlStmt = buildSelectStmt(entity)
	this._db.query(sqlStmt.queryString,
					sqlStmt.values,
					function(err, result) {
		if(err) {
			console.log(err)
			return callback(err, undefined)
		}
		if(result && result.rows && result.rows.length > 0) {
			var foundEntity = dbToJS(result.rows[0])
			foundEntity._type = entity._type
			callback(undefined, foundEntity)
		} else {
			// not found
			callback(undefined, null)
		}

	})
}

function buildSelectStmt(entity) {
	var preparedStmt = prepareStatement(entity)
	var params = []
	for(var i = 0 ; i < preparedStmt.params.length ; i++) {
		params.push(preparedStmt.fields[i] + '=' + preparedStmt.params)
	}
	return {
		queryString: 'SELECT * FROM ' +
									preparedStmt.tableName +
									' WHERE ' + params.join(' AND '),
		values: preparedStmt.values
	}
}

function buildInsertStmt(entity) {
	var preparedStmt = prepareStatement(entity)
	return {
		queryString: 'INSERT INTO ' +
									preparedStmt.tableName +
									' (' + preparedStmt.fields.join(',') + ')' +
									' values (' + preparedStmt.params.join(',') + ')' +
									'  RETURNING id',
		values: preparedStmt.values
	}
}

function buildUpdateStmt(entity) {
	var id = entity.id
	var preparedStmt = prepareStatement(entity)
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

function prepareStatement(entity) {
	var tableName = escape(entity._type)
	var fields = []
	var params = []
	var values = []

	for(var attr in entity) {
		if(entity.hasOwnProperty(attr) && !/^_/.test(attr) && attr !== 'id') {
			fields.push('"' + escape(camelToSnakeCase(attr)) + '"')
			params.push('$' + (params.length+1) )
			values.push(entity[attr])
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
