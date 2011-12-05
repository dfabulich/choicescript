var fs = require('fs');
var path = require('path');
var dir = process.argv[2] || "web/mygame/scenes";
eval(fs.readFileSync("web/scene.js", "utf-8"));
eval(fs.readFileSync("web/util.js", "utf-8"));
eval(fs.readFileSync("headless.js", "utf-8"));

var list = fs.readdirSync(dir);

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i])) continue;
  var filePath = dir + '/' + list[i];
  var inputMod = fs.statSync(filePath).mtime.getTime();
  var outputMod = 0;
  if (path.existsSync(filePath + ".js")) {
    outputMod = fs.statSync(filePath + ".js").mtime.getTime();;
  }
  if (inputMod <= outputMod) {
    console.log(list[i] + " up to date");
    continue;
  }
  console.log(list[i]);
  var str = slurpFile(filePath);
  var scene = new Scene();
  scene.loadLines(str);
  
  var writer = fs.createWriteStream(filePath + ".js");
  writer.write("window.stats.scene.loadLinesFast(" + scene.temps.choice_crc + ", " + toJson(scene.lines)+ ", " + toJson(scene.labels) + ");", "utf-8");
  
  writer.end();
}

