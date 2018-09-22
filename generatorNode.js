var fs = require('fs');
var path = require('path');
var inputDir = process.argv[2] || "web/mygame/scenes";
var outputDir = process.argv[3] || "web/mygame/scenes";
eval(fs.readFileSync("web/scene.js", "utf-8"));
eval(fs.readFileSync("web/util.js", "utf-8"));
eval(fs.readFileSync("headless.js", "utf-8"));

var list = fs.readdirSync(inputDir);

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i])) continue;
  var filePath = inputDir + '/' + list[i];
  var inputMod = fs.statSync(filePath).mtime.getTime();
  var outputMod = 0;
  if (fs.existsSync(filePath + ".json")) {
    outputMod = fs.statSync(filePath + ".json").mtime.getTime();;
  }
  if (inputMod <= outputMod) {
    console.log(list[i] + " up to date");
    continue;
  }
  console.log(list[i]);
  var str = slurpFile(filePath);
  var scene = new Scene();
  scene.loadLines(str);
  
  var writer = fs.createWriteStream(outputDir + '/' + list[i].replace(/ /g, "_") + ".json");
  writer.write("{\"crc\":" + scene.crc + ", \"lines\":" + toJson(scene.lines)+ ", \"labels\":" + toJson(scene.labels) + "}", "utf-8");
  
  writer.end();
}

