var inputDir = arguments[0] || "web/mygame/scenes";
var outputDir = arguments[1] || "web/mygame/scenes";
load("web/scene.js");
load("web/util.js");
load("headless.js");

var list = new java.io.File(inputDir).listFiles();

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i].getName())) continue;
  var inputMod = list[i].lastModified();
  var outputMod = new java.io.File(list[i].getAbsolutePath()+".json").lastModified();
  if (inputMod <= outputMod) {
    print(list[i] + " up to date");
    continue;
  }
  print(list[i]);
  var str = slurpFile(list[i]);
  var scene = new Scene();
  scene.loadLines(str);
  
  var writer = new java.io.BufferedWriter(new java.io.OutputStreamWriter(new java.io.FileOutputStream(outputDir+"/"+list[i].getName().replaceAll(" ", "_") +".json"), "UTF-8"));
  writer.write("{\"crc\":" + scene.temps.choice_crc + ", \"lines\":" + toJson(scene.lines)+ ", \"labels\":" + toJson(scene.labels) + "}");
  
  writer.close();
}

