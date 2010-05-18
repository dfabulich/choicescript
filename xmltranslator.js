var dir = arguments[0] || "web/mygame/scenes";
load("web/scene.js");
load("web/util.js");
load("headless.js");

function slurpFile(name) {
    var lines = [];
    var reader = new java.io.BufferedReader(new java.io.FileReader(name));
    var line;
    while (line = reader.readLine()) {
         lines.push(line);
    }
    return lines.join('\n');
}

var writer;

function XmlScene(name, stats, nav) {
  Scene.call(this, name, stats, nav);
};

function xmlEscape(str) {
  if (str == null) return null;
  var result = str
  result = result.replace(/&/g, "&amp;");
  result = result.replace(/'/g, "&apos;");
  result = result.replace(/"/g, "&quot;");
  result = result.replace(/</g, "&lt;");
  result = result.replace(/>/g, "&gt;");
  return result;
}

XmlScene.prototype = new Scene();

var inPara = false;
printx = function printx(msg) {
  if (!msg) return;
  if (!inPara) {
    writer.write("<p>");
    inPara = true;
  }
  writer.write(msg);
}

function closePara() {
  if (inPara) writer.write("</p>\n");
  inPara = false;
}

XmlScene.prototype.paragraph  = function xmlParagraph() {
  closePara();
}

XmlScene.prototype.page_break = function xmlPageBreak(data) {
  closePara();
  writer.write("<page-break ");
  if (data) writer.write("text='" + xmlEscape(data) + "'");
  writer.write("/>\n"); 
}

XmlScene.prototype.finish = function xmlFinish(data) {
  closePara();
  writer.write("<finish ");
  if (data) writer.write("text='" + xmlEscape(data) + "'");
  writer.write("/>\n");
  this.finished = true;
}

XmlScene.prototype.choice = function xmlChoice(data) {
  closePara();
  var groups = data.split(/ /);
  var options = this.parseOptions(this.indent, groups);
  writer.write("<choice>\n");
  if (groups.length && groups[0]) {
    writer.write("<groups>\n");
    for (var i = 0; i < groups.length; i++) {
      writer.write("<group name='" + groups[i] + "'/>\n");
    }
    writer.write("</groups>\n");
  }
  this.writeOption = function writeOption(option) {
    writer.write("<option text='" + xmlEscape(option.name) + "'>\n");
    if (option.suboptions) {
      for (var i = 0; i < option.suboptions.length; i++) {
        writeOption(option.suboptions[i]);
      }
      return;
    }
    this.lineNum = option.line;
    this.indent = this.getIndent(this.nextNonBlankLine(true/*includingThisOne*/));
    this.finished = false;
    this.execute();
    closePara();
    writer.write("</option>\n");
  }
  for (var i = 0; i < options.length; i++) {
    this.writeOption(options[i]);
  }
  writer.write("</choice>\n");
}

var list = new java.io.File(dir).listFiles();
list = [new java.io.File(dir, "startup.txt")];

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i].getName())) continue;
  print(list[i]);
  var str = slurpFile(list[i]);
  var scene = new XmlScene();
  scene.loadLines(str);
  
  var writer = new java.io.BufferedWriter(new java.io.FileWriter("/tp/" + list[i].getName() + ".xml"));
  writer.write("<vignette>\n");
  scene.execute();
  writer.write("</vignette>\n");
  writer.close();
  //throw new Error("halt");
}

