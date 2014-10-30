
var assert = require('assert')
var ORM = require('../postgresql-orm.js')
var uuid = require('uuid')

describe('entity db', function() {

	// necessary schema:
	//
	// CREATE TABLE users
	// (
	//   id SERIAL,
	//   email character varying,
	//   first_name character varying
	// );

	console.log('Setting up postgres connection to: ', process.env.POSTGRESL_CONNECTION_STRING)
	ORM.setup(process.env.POSTGRESL_CONNECTION_STRING)
	var User = new ORM('user')
	var createdEntity
	it('create entity', function(done) {
		User.save({email: uuid.v4() + '@foo.bar'}, function(err, savedEntity) {
			assert.ok(!err, err)
			assert.ok(savedEntity)
			assert.ok(savedEntity.id)
			createdEntity = savedEntity;
			done()
		})
	})

	it('retrieve entity', function(done) {
		User.load({
			email: createdEntity.email
		}, function(err, loadedEntity) {
			assert.ok(!err, err)
			assert.ok(loadedEntity)
			assert.ok(loadedEntity.id)
			assert.equal(loadedEntity.id, createdEntity.id)
			done()
		})
	})

	it('update entity', function(done) {
		createdEntity.firstName = uuid.v4()
		User.save(createdEntity, function(err, updatedEntity) {
			assert.ok(!err, err)
			assert.ok(updatedEntity)
			assert.ok(updatedEntity.id)
			assert.equal(updatedEntity.id, createdEntity.id)
			assert.equal(updatedEntity.firstName, createdEntity.firstName)
			done()
		})
	})

	it('retrieve entity', function(done) {
		User.load({
			email: createdEntity.email
		}, function(err, loadedEntity) {
			assert.ok(!err, err)
			assert.ok(loadedEntity)
			assert.ok(loadedEntity.id)
			assert.equal(loadedEntity.id, createdEntity.id)
			done()
		})
	})

})
