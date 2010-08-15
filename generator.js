var dir = arguments[0] || "web/mygame/scenes";
load("web/scene.js");
load("web/util.js");


function slurpFile(name) {
    var lines = [];
    var reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(name), "UTF-8"));
    var line;
    var lineBuilder;
    while (line = reader.readLine()) {
      lineBuilder = [];
      for (var i = 0; i < line.length(); i++) {
        var ch = line.charAt(i);
        if (ch > 127) {
          var hex = ""+java.lang.Integer.toHexString(ch)
          while (hex.length < 4) {
            hex = "0" + hex;
          }
          lineBuilder.push("\\u" + hex);
        } else {
          lineBuilder.push(String.fromCharCode(ch));
        }
      }
      lines.push(lineBuilder.join(''));
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

