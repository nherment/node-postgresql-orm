
var assert = require('assert')
var ORM = require('../postgresql-orm.js')
var uuid = require('uuid')

describe('entities list', function() {

	var testEntityDefinition = {
		name: 'test_entity_list',
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

	it('create entity b', function(done) {
		User.save({name: 'b'}, function(err, savedEntity) {
			assert.ok(!err, err)
			assert.ok(savedEntity)
			assert.ok(savedEntity.id)
			assert.equal(savedEntity.name, 'b')
			done()
		})
	})

	it('create entity c', function(done) {
		User.save({name: 'c'}, function(err, savedEntity) {
			assert.ok(!err, err)
			assert.ok(savedEntity)
			assert.ok(savedEntity.id)
			assert.equal(savedEntity.name, 'c')
			done()
		})
	})

	it('list entities, by name ascending', function(done) {
		User.list({
			sort: {
				name: 'asc'
			}
		}, function(err, sortedEntities) {
			assert.ok(!err, err)
			assert.ok(sortedEntities)
			assert.equal(sortedEntities.length, 3)
			assert.equal(sortedEntities[0].name, 'a')
			assert.equal(sortedEntities[1].name, 'b')
			assert.equal(sortedEntities[2].name, 'c')
			done()
		})
	})

	it('list entities, by name descending', function(done) {
		User.list({
			sort: {
				name: 'desc'
			}
		}, function(err, sortedEntities) {
			assert.ok(!err, err)
			assert.ok(sortedEntities)
			assert.equal(sortedEntities.length, 3)
			assert.equal(sortedEntities[0].name, 'c')
			assert.equal(sortedEntities[1].name, 'b')
			assert.equal(sortedEntities[2].name, 'a')
			done()
		})
	})

	it('list entities, by name ascending, limit 2', function(done) {
		User.list({
			sort: {
				name: 'asc'
			},
			limit: 2
		}, function(err, sortedEntities) {
			assert.ok(!err, err)
			assert.ok(sortedEntities)
			assert.equal(sortedEntities.length, 2)
			assert.equal(sortedEntities[0].name, 'a')
			assert.equal(sortedEntities[1].name, 'b')
			done()
		})
	})

	it('list entities, by name descending, limit 2', function(done) {
		User.list({
			sort: {
				name: 'desc'
			},
			limit: 2
		}, function(err, sortedEntities) {
			assert.ok(!err, err)
			assert.ok(sortedEntities)
			assert.equal(sortedEntities.length, 2)
			assert.equal(sortedEntities[0].name, 'c')
			assert.equal(sortedEntities[1].name, 'b')
			done()
		})
	})

	it('list entities, by name ascending, limit 2, offset 1', function(done) {
		User.list({
			sort: {
				name: 'asc'
			},
			limit: 2,
			offset: 1
		}, function(err, sortedEntities) {
			assert.ok(!err, err)
			assert.ok(sortedEntities)
			assert.equal(sortedEntities.length, 2)
			assert.equal(sortedEntities[0].name, 'b')
			assert.equal(sortedEntities[1].name, 'c')
			done()
		})
	})

	it('list entities, by name descending, limit 2, offset 1', function(done) {
		User.list({
			sort: {
				name: 'desc'
			},
			limit: 2,
			offset: 1
		}, function(err, sortedEntities) {
			assert.ok(!err, err)
			assert.ok(sortedEntities)
			assert.equal(sortedEntities.length, 2)
			assert.equal(sortedEntities[0].name, 'b')
			assert.equal(sortedEntities[1].name, 'a')
			done()
		})
	})


})
