if (typeof load == "undefined") {
  fs = require("fs");
  vm = require("vm");
  vm.runInThisContext(fs.readFileSync("headless.js"), "headless.js");
  args = process.argv;
  args.shift();
  args.shift();
} else {
  load("headless.js");
  args = arguments;
  console = {log: print};
}

gameDir = args[0] || "mygame";

function parseSceneList(lines, lineNum) {
  var nextIndent = null;
  var scenes = [];
  var purchases = {};
  var line;
  while(typeof (line = lines[++lineNum]) != "undefined") {
      if (!line.trim()) continue;

      var indent = /^(\s*)/.exec(line)[1].length;
      if (nextIndent === null || nextIndent === undefined) {
          // initialize nextIndent with whatever indentation the line turns out to be
          // ...unless it's not indented at all
          if (indent === 0) throw new Error("invalid scene_list indent, expected at least one row");
          this.indent = nextIndent = indent;
      }
      if (indent === 0) break;
      if (indent != this.indent) {
          // all scenes are supposed to be at the same indentation level
          throw new Error("invalid scene_list indent, expected "+this.indent+", was " + indent);
      }

      line = line.trim();
      var purchaseMatch = /^\$(\w*)\s+(.*)/.exec(line);
      if (purchaseMatch) {
        line = purchaseMatch[2];
        var product = purchaseMatch[1].trim() || "adfree";
        purchases[line] = product;
      }
      if (!scenes.length && "startup" != line) scenes.push("startup");
      scenes.push(line);
  }
  return {scenes:scenes, purchases:purchases, lineNum:lineNum-1};
}

function parseAchievement(data, lines, lineNum) {
  var nextIndent = null;
  var parsed = /(\S+)\s+(\S+)\s+(\S+)\s+(.*)/.exec(data);
  var achievementName = parsed[1] = parsed[1].toLowerCase();
  var visibility = parsed[2];
  var visible = (visibility != "hidden");
  parsed[2] = visible;
  var pointString = parsed[3];
  parsed[3] = pointString*1;
  var title = parsed[4];
  var line = lines[++lineNum];
  var preEarnedDescription = line.trim();
  parsed[6] = preEarnedDescription;

  var postEarnedDescription = null;
  while(typeof(line = lines[++lineNum]) != "undefined") {
    if (line.trim()) break;
  }
  if (/^\s/.test(line)) {
    postEarnedDescription = line.trim();
  } else {
    // No indent means the next line is not a post-earned description
    lineNum--;
  }
  if (postEarnedDescription === null) postEarnedDescription = preEarnedDescription;
  parsed[5] = postEarnedDescription;
  parsed.shift();
  achievements.push(parsed);
  return lineNum;
}

var lines = slurpFileLines("web/"+gameDir+"/scenes/startup.txt");
var stats = {}, purchases = {};
var scenes = ["startup"];
var create = /^\*create +(\w+) +(.*)/;
var result, variable, value;
var achievements = [];

var ignoredInitialCommands = {"comment":1, "title":1, "author":1};

for (var i = 0; i < lines.length; i++) {
  var line = (""+lines[i]).trim();
  if (!line) { continue; }
  var result = /^\s*\*(\w+)(.*)/.exec(line);
  if (!result) break;
  var command = result[1].toLowerCase();
  var data = result[2].trim();
  if (ignoredInitialCommands[command]) { continue; }
  else if (command == "create") {
    var result = /^(\w*)(.*)/.exec(data);
    variable = result[1];
    value = JSON.parse(result[2]);
    stats[variable.toLowerCase()] = value;
  } else if (command == "scene_list") {
    result = parseSceneList(lines, i);
    scenes = result.scenes;
    purchases = result.purchases;
    i = result.lineNum;
  } else if (command == "achievement") {
    i = parseAchievement(data, lines, i);
  } else {
    break;
  }
}

console.log("\ufeffnav = new SceneNavigator(");

function logJson(x) {
  var json = JSON.stringify(x, null, " ");
  json = json.replace(/[\u007f-\uffff]/g, function(c) {
    return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);
  });
  console.log(json);
}

logJson(scenes);

console.log(");\nstats = ");

logJson(stats);

console.log(";\npurchases = ");

logJson(purchases);

console.log(";\nachievements = ");
logJson(achievements);
console.log(";");



