
var assert = require('assert')
var ORM = require('../postgresql-orm.js')
var uuid = require('uuid')

describe('entities count', function() {

	var testEntityDefinition = {
		name: 'test_entity_count',
		attributes: {
			name: {
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

	it('create entity a', function(done) {
		User.save({name: 'a'}, function(err, savedEntity) {
			assert.ok(!err, err)
			assert.ok(savedEntity)
			assert.ok(savedEntity.id)
			assert.equal(savedEntity.name, 'a')
			done()
		})
	})

	it('count entities', function(done) {
		User.count({}, function(err, count) {
			assert.ok(!err, err)
			assert.equal(count, 1)
			done()
		})
	})

	it('create entity a', function(done) {
		User.save({name: 'a'}, function(err, savedEntity) {
			assert.ok(!err, err)
			assert.ok(savedEntity)
			assert.ok(savedEntity.id)
			assert.equal(savedEntity.name, 'a')
			done()
		})
	})

	it('count entities', function(done) {
		User.count({}, function(err, count) {
			assert.ok(!err, err)
			assert.equal(count, 2)
			done()
		})
	})

	it('create entity b', function(done) {
		User.save({name: 'b'}, function(err, savedEntity) {
			assert.ok(!err, err)
			assert.ok(savedEntity)
			assert.ok(savedEntity.id)
			assert.equal(savedEntity.name, 'b')
			done()
		})
	})

	it('count entities', function(done) {
		User.count({}, function(err, count) {
			assert.ok(!err, err)
			assert.equal(count, 3)
			done()
		})
	})

	it('count entities', function(done) {
		User.count({name: 'a'}, function(err, count) {
			assert.ok(!err, err)
			assert.equal(count, 2)
			done()
		})
	})

	it('count entities', function(done) {
		User.count({name: 'b'}, function(err, count) {
			assert.ok(!err, err)
			assert.equal(count, 1)
			done()
		})
	})

	it('count entities', function(done) {
		User.count({name: 'c'}, function(err, count) {
			assert.ok(!err, err)
			assert.equal(count, 0)
			done()
		})
	})


})
