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

function printElement(tagName, attributeName, data) {
  closePara();
  writer.write("<");
  writer.write(tagName);
  writer.write(" ")
  if (data) {
    writer.write(attributeName);
    writer.write("='");
    writer.write(xmlEscape(data));
    writer.write("'");
  }
  writer.write("/>\n");
}

XmlScene.prototype.page_break = function xmlPageBreak(data) {
  printElement("page-break", "text", data);
}

XmlScene.prototype.finish = function xmlFinish(data) {
  printElement("finish", "text", data);
  this.finished = true;
}

XmlScene.prototype["goto"] = function xmlGoto(data) {
  printElement("include", "label", data);
  this.finished = true;
}

XmlScene.prototype.label = function xmlLabel(data) {
  printElement("label", "id", data);
}

XmlScene.prototype.temp = function xmlTemp(data) {
  printElement("temp", "variable", data);
}

XmlScene.prototype.ending = function xmlEnding(data) {
  printElement("ending");
}

XmlScene.prototype.line_break = function xmlLineBreak(data) {
  printElement("line-break");
}

XmlScene.prototype.input_text = function xmlLineBreak(data) {
  printElement("input-text", "variable", data);
}

XmlScene.prototype.gotoref = function xmlGotoRef(data) {
  writer.write("<goto-ref>");
  this.evaluateExpr(this.tokenizeExr(data));
  writer.write("</goto-ref>\n");
}

XmlScene.prototype.print = function xmlPrint(data) {
  writer.write("<print>");
  this.evaluateExpr(this.tokenizeExr(data));
  writer.write("</print>\n");
}

XmlScene.prototype.setref = function xmlSetRef() {
  writer.write("<set-ref><name>");
  var stack = this.tokenizeExpr(line);
  var reference = this.evaluateValueToken(stack.shift(), stack);
  writer.write("</name><value>");
  var value = this.evaluateExpr(stack);
  this.setVar(reference, value);
  writer.write("</value></set-ref>");
}

XmlScene.prototype.set = function xmlSet(data) {
  var result = /^(\w*)(.*)/.exec(data);
  var variable = result[1];
  var expr = result[2];
  var stack = this.tokenizeExpr(expr);
  // if the first token is an operator, then it's implicitly based on the variable
  if (/OPERATOR|FAIRMATH/.test(stack[0].name)) stack.unshift({name:"VAR", value:variable, pos:"(implicit)"});
  writer.write("<set variable='" + variable + "'>");
  writer.write(this.evaluateExpr(stack));
  writer.write("</set>\n");
}

XmlScene.prototype["if"] = XmlScene.prototype.elseif = XmlScene.prototype.elsif = function xmlIf(data) {
  writer.write("<switch>");
  writer.write("<if>");
  writer.write("<test>");
  var stack = this.tokenizeExpr(data);
  writer.write(this.evaluateExpr(stack));
  writer.write("</test><result>");  
  var trueLine = this.lineNum + 1;
  var trueIndent = this.getIndent(this.nextNonBlankLine());
  this.skipTrueBranch();
  var subSceneLines = this.lines.slice(trueLine, this.lineNum+1);
  var subScene = new XmlScene();
  subScene.lines = subSceneLines;
  subScene.loaded = true;
  subScene.indent = trueIndent;
  subScene.execute();
  writer.write("</result></if>");
  writer.write("</switch>");
}

XmlScene.prototype.goto_scene = function xmlGotoScene(data) {
  printElement("goto-scene", "name", data);
  this.finished = true;
}

XmlScene.prototype.evaluateValueToken = function xmlEvaluateValueToken(token, stack) {
  var name = token.name;
  if ("OPEN_PARENTHESIS" == name) {
      return this.evaluateExpr(stack, "CLOSE_PARENTHESIS");
  } else if ("OPEN_CURLY" == name) {
      var value = this.evaluateExpr(stack, "CLOSE_CURLY");
      return "<reference>" + value + "</reference>";
  } else if ("NUMBER" == name) {
      return "<literal value='" + xmlEscape(token.value) + "'/>";
  } else if ("STRING" == name) {
      // strip off the quotes and unescape backslashes
      return "<literal value='" + xmlEscape(token.value.slice(1,-1).replace(/\\(.)/g, "$1")) + "'/>";
  } else if ("VAR" == name) {
      return "<variable name='" + token.value + "' />";
  } else {
      throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected NUMBER, STRING, VAR or PARENTHETICAL, was: " + name + " [" + token.value + "]");
  }
}

function mathOperator(operator, v1, v2) {
  return "<math operator='"+operator+"'>"+ v1+ v2+"</math>";
}

function binaryOperator(element, v1, v2) {
  return "<"+element+">" + v1 + v2 + "</" + element + ">";
}

function not(text) {
  return "<not>" + text + "</not>";
}

Scene.operators = {
    "+": function add(v1,v2) { return mathOperator("+", v1, v2); }
    ,"-": function subtract(v1,v2) { return mathOperator("-", v1, v2); }
    ,"*": function multiply(v1,v2) { return mathOperator("*", v1, v2); }
    ,"/": function divide(v1,v2) { return mathOperator("/", v1, v2); }
    ,"&": function concatenate(v1,v2) { return binaryOperator("concatenate", v1, v2) }
    ,"%+": function fairAdd(v1, v2, line) { return mathOperator("%+", v1, v2); }
    ,"%-": function fairSubtract(v1, v2) { return mathOperator("%-", v1, v2); }
    ,"=": function equals(v1,v2) { return binaryOperator("equals", v1, v2) }
    ,"<": function lessThan(v1,v2) { return binaryOperator("lt", v1, v2) }
    ,">": function greaterThan(v1,v2) { return binaryOperator("gt", v1, v2) }
    ,"<=": function lessThanOrEquals(v1,v2) { return not(binaryOperator("gt", v1, v2)) }
    ,">=": function greaterThanOrEquals(v1,v2) { return not(binaryOperator("lt", v1, v2)) }
    ,"!=": function notEquals(v1,v2) { return not(binaryOperator("equals", v1, v2)) }
    ,"and": function and(v1, v2, line) { return binaryOperator("and", v1, v2); }
    ,"or": function or(v1, v2, line) { return binaryOperator("or", v1, v2); }
};


XmlScene.prototype.choice = XmlScene.prototype.fake_choice = function xmlChoice(data) {
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

XmlScene.prototype.rand = function xmlRand(data) {
  var args = data.split(/ /);
  var variable, minimum, maximum;
  variable = args[0];
  writer.write("<random variable='" + variable + "'><minimum>");
  minimum = this.evaluateValueExpr(args[1]);
  writer.write("</minimum><maximum>");
  maximum = this.evaluateValueExpr(args[2]);
  writer.write("</maximum></rand>\n");
}

var list = new java.io.File(dir).listFiles();
list = [new java.io.File(dir, "hello.txt")];

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i].getName())) continue;
  print(list[i]);
  var str = slurpFile(list[i]);
  var scene = new XmlScene();
  scene.loadLines(str);
  
  var writer = new java.io.BufferedWriter(new java.io.FileWriter("/tp/" + list[i].getName() + ".xml"));
  writer.write("<!DOCTYPE vignette [ \n" + 
			"<!ATTLIST label id ID #REQUIRED>\n" + 
			"]>");
  writer.write("<vignette>\n");
  scene.execute();
  writer.write("</vignette>\n");
  writer.close();
  //throw new Error("halt");
}

/*
else
elseif
input_text
stat_chart

where should we closePara?
*/

/*Scene.validCommands = {"comment":1, "goto":1, "gotoref":1, "label":1, "looplimit":1, "finish":1, "abort":1,
    "choice":1, "create":1, "temp":1, "delete":1, "set":1, "setref":1, "print":1, "if":1, "rand":1,
    "page_break":1, "line_break":1, "script":1, "else":1, "elseif":1, "elsif":1, "reset":1,
    "goto_scene":1, "fake_choice":1, "input_text":1, "ending":1, "stat_chart":1};*/
