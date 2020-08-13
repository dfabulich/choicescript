var fs = require('fs');
var path = require('path');
var inputDir = process.argv[2] || "web/mygame/scenes";
var outputDir = process.argv[3] || "web/mygame/scenes";
var singleFile = process.argv[4] || false;
eval(fs.readFileSync("web/scene.js", "utf-8"));
eval(fs.readFileSync("web/util.js", "utf-8"));
eval(fs.readFileSync("headless.js", "utf-8"));

var list = fs.readdirSync(inputDir);

var i = list.length;
var writer;
var first = true;

if (singleFile) {
  writer = fs.createWriteStream(outputDir + "/allScenes.js");
  writer.write("oldStats = stats;\n", "utf-8");
  writer.write("allScenes = {", "utf-8");
}

while (i--) {
  if (!/\.txt$/.test(list[i])) continue;
  var filePath = inputDir + '/' + list[i];
  var inputMod = fs.statSync(filePath).mtime.getTime();
  if (singleFile) {
    if (first) {
      first = false;
    } else {
      writer.write(",", "utf-8");
    }
    writer.write('"');
    writer.write(list[i].replace(/\.txt/, ""), "utf-8");
    writer.write('":');
  } else {
    var outputMod = 0;
    if (fs.existsSync(filePath + ".json")) {
      outputMod = fs.statSync(filePath + ".json").mtime.getTime();;
    }
    if (inputMod <= outputMod) {
      console.log(list[i] + " up to date");
      continue;
    }
    writer = fs.createWriteStream(outputDir + '/' + list[i].replace(/ /g, "_") + ".json");
  }
  console.log(list[i]);
  var str = slurpFile(filePath);
  var scene = new Scene();
  scene.name = list[i].replace('.txt', '');
  scene.loadLines(str);
  
  writer.write("{\"crc\":" + scene.crc + ", \"lines\":" + toJson(scene.lines)+ ", \"labels\":" + toJson(scene.labels) + "}", "utf-8");
  
  if (!singleFile) writer.end();
}

if (singleFile) {
  writer.write("}\n", "utf-8");
  var mygame = fs.readFileSync("web/mygame/mygame.js", "utf-8");
  writer.write(mygame.substring(1), "utf-8");
  writer.write("\nstats = oldStats;");
  writer.write(";\nreinjectNavigator();");
  writer.end();
}

