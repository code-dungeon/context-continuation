{ctx} = importModule('Context')

describe 'Context', ->
  describe 'BROKEN:(mocha-given) - modifications won\'t affect parent context in async code', ->
    Given -> 
      ctx.key = 1
    When ->
      new Promise( (resolve) =>
        ctx.key = 2
        resolve()
      )
      return
    Then -> ctx.key.should.equal(2) # Should be 2, mocha-given is wonky with the flow

  describe '$init', ->
    describe 'without an initializer', ->
      Given -> 
        ctx.$init()
        ctx.key = 1 
      When ->
        new Promise( (resolve) => 
          ctx.key = 2
          resolve()
        )
        return
      Then -> ctx.key.should.equal(2)
      And -> ctx.$merge.should.be.true

    describe 'with an initializer', ->
      Given -> 
        @fn = ctx.$init( ->
          ctx.key = 1 
        )
      When -> @fn()
      Then -> ctx.key.should.equal(1)
      And -> ctx.$merge.should.be.true

  describe '$merge', ->
    When -> @result = @ctx.$merge
    
    describe 'defaults to false', ->
      Given -> @ctx = ctx
      Then -> @result.should.be.false

    describe 'retains value', ->
      Given -> 
        @ctx = ctx
        @ctx.$merge = true
      Then -> @result.should.be.true
    

  describe 'setting and getting', ->
    Given -> @value = 1
    When -> ctx.key = @value
    Then -> ctx.key.should.equal(@value)

  describe 'using in operator', ->
    Given -> ctx.key = 1
    When -> @result = 'key' of ctx
    Then -> @result.should.be.true

  describe 'getting keys', ->
    Given -> ctx.key = 1
    When -> @result = Reflect.ownKeys(ctx)
    Then -> @result.should.eql(['key'])
