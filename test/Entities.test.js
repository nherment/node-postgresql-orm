
var assert = require('assert')
var ORM = require('../postgresql-orm.js')
var uuid = require('uuid')

describe('entity db', function() {

	var testEntityDefinition = {
		name: 'test_entity',
		key: 'name',
		attributes: {
			email: {
				type: 'character varying',
				unique: true
			},
			firstName: {
				type: 'character varying'
			},
			lastName: {
				type: 'character varying'
			},
			createdDate: {
				type: 'timestamp with time zone'
			}
		}
	}

	console.log('Setting up postgres connection to: ', process.env.POSTGRESL_CONNECTION_STRING)

	ORM.setup(process.env.POSTGRESL_CONNECTION_STRING)

	var User = ORM.define(testEntityDefinition)

	var createdEntity

	it('drop existing table if any', function(done) {
		User.dropTable(done)
	})

	it('create table', function(done) {
		User.createTable(done)
	})

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

	it('verify entity update', function(done) {
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

	it('create entity violates unicity constraint', function(done) {
		User.save({email: createdEntity.email}, function(err, savedEntity) {
			assert.ok(err)
			console.log(err)
			assert.ok(!savedEntity)
			done()
		})
	})

})
