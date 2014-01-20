var expect = require('expect.js')
  , utils = require('../lib/index.js')

describe('The lib util interface', function () {
  describe('the Hg object', function () {
    it('should always pass', function(){
        expect(1).to.be(1);
    });
    var hg = new utils.Hg();
    it('should get the branched name from the script stdout', function () {
      var stdout = "a\nb\nc\n";
      expect(hg.getNameOfMercurialBranchesOutOfScriptStdout(stdout)).to.eql(["a", "b", "c"]);
    })
  })
  
  describe('the config object', function(){
    it('should be able to initiate properly', function () {
      var config = new utils.Config();
      expect(config.url).to.eql("");
      expect(config.auth.username).to.eql("");
      config = new utils.Config({url: "1", auth: {username: "2"}});
      expect(config.url).to.eql("1");
      expect(config.auth.username).to.eql("2");
    })
  
  })
})

