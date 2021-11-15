describe 'index', ->
  Given -> @module = importModule('index')
  When -> @ctx = @module.ctx
  Then -> expect(@ctx).to.not.be.undefined
