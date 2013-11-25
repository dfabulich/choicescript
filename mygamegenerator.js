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
        debugger;
        line = purchaseMatch[2];
        var product = purchaseMatch[1].trim() || "adfree";
        purchases[line] = product;
      }
      if (!scenes.length && "startup" != line) scenes.push("startup");
      scenes.push(line);
  }
  return {scenes:scenes, purchases:purchases, lineNum:lineNum-1};
}

var lines = slurpFileLines("web/"+gameDir+"/scenes/startup.txt");
var stats = {}, purchases = {};
var scenes;
var create = /^\*create +(\w+) +(.*)/;
var result, variable, value;
for (var i = 0; i < lines.length; i++) {
  var line = (""+lines[i]).replace(/^\s*/, "").replace(/\s*$/, "");
  if (!line) { continue; }
  else if (/^\*(comment|title)/.test(line)) { continue; }
  else if (!!(result = create.exec(line))) {
    variable = result[1];
    value = eval(result[2]);
    stats[variable.toLowerCase()] = value;
  } else if (/^\*scene_list/.test(line)) {
    result = parseSceneList(lines, i);
    scenes = result.scenes;
    purchases = result.purchases;
    i = result.lineNum;
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
mygameBuffer.push("};\n");
print(mygameBuffer.join(""));


