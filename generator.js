var dir = arguments[0] || "web/mygame/scenes";
load("web/scene.js");
load("web/util.js");


function slurpFile(name) {
    var lines = [];
    var reader = new java.io.BufferedReader(new java.io.FileReader(name));
    var line;
    while (line = reader.readLine()) {
         lines.push(line);
    }
    return lines.join('\n');
}

var list = new java.io.File(dir).listFiles();

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i].getName())) continue;
  print(list[i]);
  var str = slurpFile(list[i]);
  var scene = new Scene();
  scene.loadLines(str);
  
  var writer = new java.io.BufferedWriter(new java.io.FileWriter(list[i].getAbsolutePath()+".js"));
  writer.write("window.stats.scene.loadLinesFast(" + scene.temps.choice_crc + ", " + toJson(scene.lines)+ ", " + toJson(scene.labels) + ");");
  
  writer.close();
}

