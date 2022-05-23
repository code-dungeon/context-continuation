{ ctx } = importModule('Context')
{ init } = importModule('util')
{ bind } = importModule('bind')
EventEmitter = require('events')
util = require('util')

# Tests that use the root context will cleanup with an `And`
# this is due to the root object working like a global

describe 'Context', ->
  describe 'running in root context', ->
    When -> ctx.key = 1
    Then -> ctx.key.should.equal(1)

  describe 'child async does not modify parent', ->
    Given ->
      ctx.key = 1
      @run = init( (done) ->
        process.nextTick( ->
          ctx.key = 2
        )
      )
    When (done) ->
      @run()
      process.nextTick(done)
    Then -> ctx.key.should.equal(1)

  describe 'child has access to parent values', ->
    Given ->
      ctx.key = 1
      @run = init( (done) ->
        process.nextTick(done)
      )
    When (done) -> @run(done)
    Then -> ctx.key.should.equal(1)

  describe 'deleting a key works', ->
    Given -> ctx.toDelete = 1
    When -> delete ctx.toDelete
    Then -> expect(ctx.toDelete).to.be.undefined

  describe 'has the execution context from invocation', ->
    Given ->
      @runInOneContext = init( =>
        ctx.key = 1
        @emitter = new EventEmitter()
        @emitter.on('event', () => @value = ctx.key)
      )
      @runInAnotherContext = init( (done) =>
        ctx.key = 2
        @emitter.emit('event')
        done()
      )
    When (done) ->
      @runInOneContext()
      @runInAnotherContext(done)
    Then -> @value.should.equal(2)

  describe 'has the bound execution context when using bind, not the one from invocation', ->
    Given ->
      @runInOneContext = init(() =>
        ctx.key = 1
        @emitter = new EventEmitter()
        @emitter.on('event', bind((arg) =>
          @value = ctx.key
          @arg = arg
        ))
      )
      @runInAnotherContext = init( (done) =>
        ctx.key = 2
        @emitter.emit('event', 'someval')
        done()
      )
    When (done) ->
      @runInOneContext()
      @runInAnotherContext(done)
    Then -> @value.should.equal(1)
    And -> @arg.should.equal('someval')

  describe 'for in works', ->
    Given ->
      ctx.firstName = 'John'
      ctx.lastName = 'Smith'
    When ->
      @keyValuePairs = []
      for key of ctx
        value = ctx[key]
        @keyValuePairs.push({
          key: key
          value: value
        })
    # Not checking the entire array because it will also contain rootContext values
    Then -> @keyValuePairs.should.deep.include({ key: 'firstName', value: 'John' })
    And -> @keyValuePairs.should.deep.include({ key: 'lastName', value: 'Smith' })

  describe 'own keys', ->
    Given ->
      ctx.firstName = 'John'
      ctx.lastName = 'Smith'
    When -> @keys = Object.keys(ctx)
    # Not checking the entire array because it will also contain rootContext values
    Then -> @keys.should.include('firstName')
    And -> @keys.should.include('lastName')
