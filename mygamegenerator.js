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
beta = (args[1] === '"beta"');

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

function parseCheckPurchase(data) {
  var products = data.split(" ");
  for (var i = 0; i < products.length; i++) {
    var product = products[i];
    if (!productMap[product]) {
      purchases["fake:"+product] = product;
    }
  }
}

function parseCreateValue(value) {
  if (/^true$/i.test(value)) value = "true";
  if (/^false$/i.test(value)) value = "false";
  if (/^".*"$/.test(value)) value = value.slice(1, -1).replace(/\\(.)/g, "$1");
  return value;
}

function parseCreateArray(line) {
  var result = /^(\w+)\s+(.*)/.exec(line);
  var variable = result[1].toLowerCase();
  var values = result[2].split(/\s+/);
  var length = Number(values.shift());
  if (values.length === 1) {
    var value = parseCreateValue(values[0]);
    for (var i = 0; i < length; i++) {
      stats[variable + "_" + (i + 1)] = value;
    }
  } else {
    for (var i = 0; i < length; i++) {
      var value = parseCreateValue(values[i]);
      stats[variable + "_" + (i + 1)] = value;
    }
  }
}

var lines = slurpFileLines("web/"+gameDir+"/scenes/startup.txt");
var stats = {}, purchases = {}, productMap = {};
var scenes = ["startup"];
var create = /^\*create +(\w+) +(.*)/;
var result, variable, value;
var achievements = [];

var ignoredInitialCommands = {"comment":1, "author":1, "bug": 1};

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
    value = parseCreateValue(result[2].trim());
    stats[variable.toLowerCase()] = value;
  } else if (command == "create_array") {
    parseCreateArray(data);
  } else if (command == "scene_list") {
    result = parseSceneList(lines, i);
    scenes = result.scenes;
    purchases = result.purchases;
    i = result.lineNum;
  } else if (command == "title") {
    stats.choice_title = data;
  } else if (command == "achievement") {
    i = parseAchievement(data, lines, i);
  } else if (command == "product") {
    // ignore products for now; we compute them from check_purchases
    // *product this only has an effect on quicktest
  } else {
    break;
  }
}

for (var scene in purchases) {
  productMap[purchases[scene]] = scene;
}

var sceneDir = fs.readdirSync("web/"+gameDir+"/scenes");
for (i = 0; i < sceneDir.length; i++) {
  var lines = slurpFileLines("web/"+gameDir+"/scenes/" + sceneDir[i]);
  for (var j = 0; j < lines.length; j++) {
    var line = (""+lines[j]).trim();
    if (!line) { continue; }
    var result = /^\s*\*(\w+)(.*)/.exec(line);
    if (!result) continue;
    var command = result[1].toLowerCase();
    var data = result[2].trim();
    if (command == "check_purchase") {
      parseCheckPurchase(data);
    } else if (command == "delay_ending") {
      purchases["fake:skiponce"] = "skiponce";
    }
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

if (beta) {
  console.log("{}");
} else {
  logJson(purchases);
}

console.log(";\nachievements = ");
logJson(achievements);
console.log(";\n");

if (args[1] === '"beta"' || args[1] === '"beta-iap"') {
  console.log("beta = " + args[1] + ";\n");
}

console.log("nav.setStartingStatsClone(stats);");
console.log("if (achievements.length) {\n  nav.loadAchievements(achievements);\n}");
console.log("\nif (nav.loadProducts) nav.loadProducts([], purchases);\n");

