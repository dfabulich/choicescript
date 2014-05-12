if (typeof load == "undefined") {
  fs = require("fs");
  vm = require("vm");
  vm.runInThisContext(fs.readFileSync("headless.js"), "headless.js");
  print = console.log;
  args = process.argv;
  args.shift();
  args.shift();
} else {
  load("headless.js");
  args = arguments;
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
  var achievementName = parsed[1].toLowerCase();
  var visibility = parsed[2];
  var visible = (visibility != "hidden");
  parsed[2] = visible;
  var pointString = parsed[3];
  var title = parsed[4];
  var line = lines[++lineNum];
  var earnedDescription = line.trim();
  parsed[5] = earnedDescription;

  var preEarnedDescription = null;
  if (visible) {
    while(typeof(line = lines[++lineNum]) != "undefined") {
      if (line.trim()) break;
    }
    if (/^\s/.test(line)) {
      preEarnedDescription = line.trim();
    } else {
      // No indent means the next line is not a pre-earned description
      lineNum--;
    }
  }
  parsed[6] = preEarnedDescription;
  parsed.shift();
  achievements.push(parsed);
  return lineNum;
}

var lines = slurpFileLines("web/"+gameDir+"/scenes/startup.txt");
var stats = {}, purchases = {};
var scenes;
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

var mygameBuffer = ["nav = new SceneNavigator(["];

for (var i = 0; i < scenes.length; i++) {
  if (i > 0) mygameBuffer.push(',\n');
  mygameBuffer.push('"', scenes[i], '"');
}

mygameBuffer.push("]);\nstats = {");
var first = true;
for (var stat in stats) {
  if (first) {
    first = false;
  } else {
    mygameBuffer.push(",\n");
  }
  mygameBuffer.push('"', stat, "\":");
  if (typeof stats[stat] == "string") {
    mygameBuffer.push('"', stats[stat], '"');
  } else {
    mygameBuffer.push(stats[stat]);
  }
}

mygameBuffer.push("};\npurchases = {");
var first = true;
for (var purchase in purchases) {
  if (first) {
    first = false;
  } else {
    mygameBuffer.push(",\n");
  }
  mygameBuffer.push('"', purchase, "\":\"", purchases[purchase], "\"");
}
mygameBuffer.push("};\nachievements = [");
for (i = 0; i < achievements.length; i++) {
  var achievement = achievements[i];
  if (i) {
    mygameBuffer.push(",");
  }
  mygameBuffer.push("\n  ['");
  mygameBuffer.push(achievement[0]);
  mygameBuffer.push("',");
  mygameBuffer.push(achievement[1]);
  mygameBuffer.push(",");
  mygameBuffer.push(achievement[2]);
  mygameBuffer.push(",'");
  mygameBuffer.push(achievement[3].replace(/([\\'])/g, "\\$1"));
  mygameBuffer.push("','");
  mygameBuffer.push(achievement[4].replace(/([\\'])/g, "\\$1"));
  mygameBuffer.push("',");
  if (achievement[5] === null) {
    mygameBuffer.push("null");
  } else {
    mygameBuffer.push("'");
    mygameBuffer.push(achievement[5].replace(/([\\'])/g, "\\$1"));
    mygameBuffer.push("'");
  }
  mygameBuffer.push("]");
}
mygameBuffer.push("];");
print(mygameBuffer.join(""));


