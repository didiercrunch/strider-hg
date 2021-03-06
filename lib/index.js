
var gitane = require('gitane')
  , exec = require('child_process').exec
  , shellescape = require('shell-escape')
  , path = require('path')
  , fs = require('fs')
  , _ = require('underscore')

module.exports = {
  gitUrl: gitUrl,
  sshUrl: sshUrl,
  httpUrl: httpUrl,
  gitCmd: gitCmd,
  gitaneCmd: gitaneCmd,
  shellEscape: shellEscape,
  Config: Config,
  Hg : Hg
}

function Config(basedConfig){
  this.sanitizeConfig = function(config) {
    config = config || {};
    config.auth = config.auth || {};

    this.url= config.url || "",
    this.display_url= config.display_url || "",
    this.auth =  {
      type: config.auth.type || "",
      privkey: config.auth.privkey || "",
      pubkey: config.auth.pubkey || "",
      username: config.auth.username || "",
      password: config.auth.password || ""
    }
  }
  
  this.sanitizeConfig(basedConfig);
  return this
}

function shellEscape(one) {
  if (!one) {
    throw new Error('trying to escape nothing', one)
  }
  return shellescape([one])
}

// returns [real, safe] urls
function gitUrl(config) {
  return (config.auth.type === 'ssh' ? sshUrl : httpUrl)(config)
}

function sshUrl(config) {
  var base = config.url.split('//')[1]
    , url = shellEscape('git@' + base.replace('/', ':'))
  return [url, url]
}

function httpUrl(config) {
  var base = config.url.split('//')[1]
    , url = config.auth.type + '://' + config.auth.username + ':' + config.auth.password + '@' + base
    , safe = config.auth.type + '://[username]:[password]@' + base
  return [url, safe]
}

function gitCmd(cmd, cwd, auth, context, done) {
  if (auth.type === 'ssh') {
    return gitaneCmd(cmd, cwd, auth.privkey, context, done)
  }
  context.cmd({
    cmd: cmd,
    cwd: cwd
  }, done)
}

// run a strider command with gitane
function gitaneCmd(cmd, dest, privkey, context, done) {
  var start = new Date()
  context.status('command.start', { command: cmd, time: start, plugin: context.plugin })
  gitane.run({
    emitter: {
      emit: context.status
    },
    cmd: cmd,
    baseDir: dest,
    privKey: privkey,
    detached: true
  }, function (err, stdout, stderr, exitCode) {
    var end = new Date()
      , elapsed = end.getTime() - start.getTime()
    if (err) {
      context.log('Gitane error:', err.message)
    }
    context.log('gitane command done %s; exit code %s; duration %s', cmd, exitCode, elapsed)
    context.status('command.done', {exitCode: exitCode, time: end, elapsed: elapsed})
    done(err ? 500 : exitCode, stdout + stderr)
  })
}

function Hg(){
  this.getMercurialBranchesCommandLine = function(config){
    var repoLocation = config.url;
    var pythonScript = fs.realpathSync(path.join(__dirname, 'get_branches.py'));
    var cmd = 'python ' + pythonScript + " " + repoLocation;
  }
 
  this.getNameOfMercurialBranchesOutOfScriptStdout = function(stdout){
    return _.filter(stdout.split("\n"),function(v){return !!v})
  }
 
  this.getMercurialBranchesForHttpBasedReposetories = function(config, done){
    var cmd = this.getMercurialBranchesCommandLine(config);
    exec(cmd, function (err, stdout, stderr) {
      if (err){
        return done(err);
      }else{
       return done(this.getNameOfMercurialBranchesOutOfScriptStdout(stdout));
      }
    })
  }
 
  this.getMercurialBranchesForSshBasedReposetories = function(config, privkey, done){
    var cmd = this.getMercurialBranchesCommandLine(config);
    gitane.run({
      cmd: cmd,
      baseDir: '/',
      privKey: config.auth.privkey || privkey,
      detached: true
    },
    function (err, stdout, stderr, exitCode) {
        if (err || exitCode !== 0){
          return done(err || new Error(stderr))
        }else{
          return done(this.getNameOfMercurialBranchesOutOfScriptStdout(stdout));
        }
    })
  }
 
  this.getMercurialBranches = function(config, privkey, done){
    if (config.auth.type === 'ssh') {
      privkey = config.auth.privkey || privkey;
      return this.getMercurialBranchesForSshBasedReposetories(config, privkey, done);
    }else{
      return this.getMercurialBranchesForHttpBasedReposetories(config, done);
    }
  }
}



