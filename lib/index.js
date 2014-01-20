
var gitane = require('gitane')
  , exec = require('child_process').exec
  , shellescape = require('shell-escape')
  , path = require('path')
  , _ = require('underscore')

module.exports = {
  gitUrl: gitUrl,
  sshUrl: sshUrl,
  httpUrl: httpUrl,
  gitCmd: gitCmd,
  gitaneCmd: gitaneCmd,
  processBranches: processBranches,
  getBranches: getBranches,
  shellEscape: shellEscape
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

function processBranches(data, done) {
  done(null, data.trim().split(/\n+/).map(function (line) {
    return line.split(/\s+/)[1].split('/').slice(-1)[0]
  }))
}



function getBranches(config, privkey, done) {
  if (config.auth.type === 'ssh') {
    gitane.run({
      cmd: 'git ls-remote -h ' + gitUrl(config)[0],
      baseDir: '/',
      privKey: config.auth.privkey || privkey,
      detached: true
    }, function (err, stdout, stderr, exitCode) {
      if (err || exitCode !== 0) return done(err || new Error(stderr))
      processBranches(stdout, done)
    })
  } else {
    exec('git ls-remote -h ' + httpUrl(config)[0], function (err, stdout, stderr) {
      if (err) return done(err)
      processBranches(stdout, done)
    })
  }
}

function getMercurialBranches(repoLocation){
  var pythonScript = path.join(__dirname, 'get_branches.py');
  var cmd = 'python ' + pythonScript + " " + repoLocation;
  exec(cmd, function (err, stdout, stderr) {
    if (err){
      return console.log(err)
    }else{
      return console.log(_.filter(stdout.split("\n"),function(v){return !!v} ))
    }
  })
}
getMercurialBranches('ssh://hg@bitbucket.org/ustraca/crypto')
console.log("ok?")

