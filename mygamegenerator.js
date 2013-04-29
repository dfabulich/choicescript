var fs = require("fs");
eval(fs.readFileSync("headless.js", "utf-8"));


function parseSceneList(lines, lineNum) {
  var nextIndent = null;
  var scenes = [];
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
      if (!scenes.length && "startup" != line) scenes.push("startup");
      scenes.push(line);
  }
  return {scenes:scenes, lineNum:lineNum-1};
}

var lines = slurpFileLines("web/mygame/scenes/startup.txt");
var stats = {};
var scenes;
var create = /^\*create +(\w+) +(.*)/;
var result, variable, value;
for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (!line) { continue; }
  else if (/^\*(comment|title)/.test(line)) { continue; }
  else if (!!(result = create.exec(line))) {
    variable = result[1];
    value = eval(result[2]);
    stats[variable.toLowerCase()] = value;
  } else if (/^\*scene_list/.test(line)) {
    result = parseSceneList(lines, i);
    scenes = result.scenes;
    i = result.lineNum;
  } else {
    break;
  }
}

var mygame = "nav = new SceneNavigator(" + JSON.stringify(scenes) +
  ");\nstats = " + JSON.stringify(stats) + ";\n";

console.log(mygame);


