var dir = arguments[0] || "web/mygame/scenes";
load("web/scene.js");
load("web/util.js");
load("headless.js");

var list = new java.io.File(dir).listFiles();

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i].getName())) continue;
  var inputMod = list[i].lastModified();
  var outputMod = new java.io.File(list[i].getAbsolutePath()+".js").lastModified();
  if (inputMod <= outputMod) {
    print(list[i] + " up to date");
    continue;
  }
  print(list[i]);
  var str = slurpFile(list[i]);
  var scene = new Scene();
  scene.loadLines(str);
  
  var writer = new java.io.BufferedWriter(new java.io.OutputStreamWriter(new java.io.FileOutputStream(list[i].getAbsolutePath()+".js"), "UTF-8"));
  writer.write("window.stats.scene.loadLinesFast(" + scene.temps.choice_crc + ", " + toJson(scene.lines)+ ", " + toJson(scene.labels) + ");");
  
  writer.close();
}

