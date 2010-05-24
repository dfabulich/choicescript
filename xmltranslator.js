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
  this.dedentChain = [];
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
  printElement("paragraph-break");
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

XmlScene.prototype.autofinish = function xmlAutoFinish() {}

XmlScene.prototype["goto"] = function xmlGoto(data) {
  printElement("include", "label", data);
  this.indent = this.getIndent(this.nextNonBlankLine());
}

XmlScene.prototype.label = function xmlLabel(data) {
  printElement("label", "id", data);
}

XmlScene.prototype.temp = function xmlTemp(data) {
  printElement("temp", "variable", data);
}

XmlScene.prototype.create = function xmlCreate(data) {
  printElement("create", "variable", data);
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
  closePara();
  writer.write("<goto-ref>");
  this.evaluateExpr(this.tokenizeExr(data));
  writer.write("</goto-ref>\n");
}

XmlScene.prototype.printLine = function xmlPrintLine(data) {
  // TODO ${}
  printx(data);
}

XmlScene.prototype.print = function xmlPrint(data) {
  closePara();
  writer.write("<print>");
  this.evaluateExpr(this.tokenizeExpr(data));
  writer.write("</print>\n");
}

XmlScene.prototype.setref = function xmlSetRef(data) {
  closePara();
  writer.write("<set-ref><name>");
  var stack = this.tokenizeExpr(data);
  var reference = this.evaluateValueToken(stack.shift(), stack);
  writer.write("</name><value>");
  var value = this.evaluateExpr(stack);
  writer.write("</value></set-ref>");
}

XmlScene.prototype.set = function xmlSet(data) {
  closePara();
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

XmlScene.prototype.executeSubScene = function executeSubScene(startLine, endLine, indent) {
  var subSceneLines = this.lines.slice(0, endLine);
  var subScene = new XmlScene();
  subScene.lines = subSceneLines;
  subScene.loaded = true;
  subScene.lineNum = startLine;
  subScene.indent = indent;
  subScene.execute();
}

XmlScene.prototype["if"] = XmlScene.prototype.elseif = XmlScene.prototype.elsif = function xmlIf(data, inChoice) {
  if (inChoice) return this.ifInChoice(data);
  closePara();
  writer.write("<switch>\n");
  var ifChainData = [data];
  var oldDent = this.indent;
  while (ifChainData.length) {
    var currentData = ifChainData.pop();
    writer.write("<if>\n");
    writer.write("<test>");
    var stack = this.tokenizeExpr(currentData);
    writer.write(this.evaluateExpr(stack));
    writer.write("</test>\n<result>");

    var trueLine = this.lineNum + 1;
    var trueIndent = this.getIndent(this.nextNonBlankLine());
    var oldIf = this["if"];
    this["if"] = function(data) {
      ifChainData.push(data);
    }
    this.skipTrueBranch();
    this["if"] = oldIf;
    var closedTag = false;
    this.dedentChain.push(function (newDent) {
      if (!closedTag && newDent <= oldDent) {
        closedTag = true;
        closePara();
        writer.write("</result></if>\n");
      }
    });
    this.executeSubScene(trueLine, this.lineNum, trueIndent);
    if (!closedTag) {
      closedTag = true;
      closePara();
      writer.write("</result></if>\n");
    }
    if ("*else" == trim(this.lines[this.lineNum])) {
      writer.write("<else>");
      this.lineNum++;
      this.execute();
      this.finished = false;
      closePara()
      writer.write("</else>");
    }
  }
  writer.write("</switch>");
}

XmlScene.prototype.ifInChoice = function xmlIfInChoice(data) {
  var oldDisplayOptionCondition = this.displayOptionCondition;
  var oldDent = this.indent;
  this.displayOptionCondition = data;
  this.dedentChain.push(function(newDent) {
    if (newDent <= oldDent) {
      this.displayOptionCondition = oldDisplayOptionCondition;
    }
  });
  this.indent = this.getIndent(this.nextNonBlankLine());
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

XmlScene.prototype.dedent = function xmlDedent(newDent) {
  var i = this.dedentChain.length;
  while (i--) {
    this.dedentChain[i].call(this, newDent);
  }
}
XmlScene.prototype.choice = function xmlChoice(data) {
  closePara();
  var groups = data.split(/ /);
  var options = this.parseOptions(this.indent, groups);
  var endLine = this.lineNum;
  var endIndent = this.indent;
  writer.write("<choice>\n");
  if (groups.length && groups[0]) {
    writer.write("<groups>\n");
    for (var i = 0; i < groups.length; i++) {
      writer.write("<group name='" + groups[i] + "'/>\n");
    }
    writer.write("</groups>\n");
  }
  var oldDent = this.indent;
  this.writeOption = function writeOption(option, endLine) {
    if (option.displayIf) {
      writer.write("<if><test>\n");
      writer.write(this.evaluateExpr(this.tokenizeExpr(option.displayIf)));
      writer.write("</test>\n");
    }
    writer.write("<option text='" + xmlEscape(option.name) + "'>\n");
    if (option.suboptions) {
      for (var i = 0; i < option.suboptions.length; i++) {
        this.writeOption(option.suboptions[i]);
      }
      return;
    }
    this.lineNum = option.line;
    this.indent = this.getIndent(this.nextNonBlankLine(true/*includingThisOne*/));
    this.finished = false;
    var closedTag = false;
    this.dedentChain.push(function (newDent) {
      if (!closedTag && newDent <= oldDent) {
        closedTag = true;
        closePara();
        writer.write("</option>\n");
        if (option.displayIf) writer.write("</if>\n");
      }
    });
    this.executeSubScene(option.line, option.endLine, this.indent);
    this.finished = false;
    if (!closedTag) {
      closedTag = true;
      closePara();
      writer.write("</option>\n");
      if (option.displayIf) writer.write("</if>\n");
    }
  }
  for (var i = 0; i < options.length; i++) {
    this.writeOption(options[i]);
  }
  writer.write("</choice>\n");
  this.lineNum = endLine;
  this.indent = endIndent;
}

XmlScene.prototype.rand = function xmlRand(data) {
  closePara();
  var args = data.split(/ /);
  var variable, minimum, maximum;
  variable = args[0];
  writer.write("<random variable='" + variable + "'><minimum>");
  minimum = this.evaluateValueExpr(args[1]);
  writer.write("</minimum><maximum>");
  maximum = this.evaluateValueExpr(args[2]);
  writer.write("</maximum></random>\n");
}

XmlScene.prototype.getVar = function xmlGetVar() {
  // Just don't throw when the variables aren't defined
}

XmlScene.prototype.stat_chart = function xmlStatChart() {
  closePara();
  var rows = this.parseStatChart();
  writer.write("<stat-chart>\n");
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if ("text" == row.type || "percent" == row.type) {
      writer.write("<"+row.type+" label='"+xmlEscape(row.label)+"' variable='"+row.variable+"' ")
      if (row.definition) writer.write(" definition='" + row.definition + "' ");
      writer.write("/>\n");
    } else if ("opposed_pair" == row.type) {
      writer.write("<opposed-pair variable='"+row.variable+"'>\n");
      writer.write("<label text='"+xmlEscape(row.label)+"' ")
      if (row.definition) writer.write(" definition='" + row.definition + "' ");
      writer.write("/>\n");
      writer.write("<label text='"+xmlEscape(row.opposed_label)+"' ")
      if (row.opposed_definition) writer.write(" definition='" + row.opposed_definition + "' ");
      writer.write("/>\n</opposed-pair>\n");
    }
  }
  writer.write("</stat-chart>\n");
}

var list = new java.io.File(dir).listFiles();
if (arguments[1]) {
  list = [new java.io.File(dir, arguments[1] + ".txt")];
}

var i = list.length;
while (i--) {
  if (!/\.txt$/.test(list[i].getName())) continue;
  print(list[i]);
  var str = slurpFile(list[i]);
  var scene = new XmlScene();
  scene.loadLines(str);
  
  var writer = new java.io.BufferedWriter(new java.io.FileWriter("/tp/" + list[i].getName() + ".xml"));
  //writer = {write: function(x){java.lang.System.out.print(x)}, close: function(){java.lang.System.out.println()}};
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
else dedentChain
${}
*/

/*Scene.validCommands = {"comment":1, "goto":1, "gotoref":1, "label":1, "looplimit":1, "finish":1, "abort":1,
    "choice":1, "create":1, "temp":1, "delete":1, "set":1, "setref":1, "print":1, "if":1, "rand":1,
    "page_break":1, "line_break":1, "script":1, "else":1, "elseif":1, "elsif":1, "reset":1,
    "goto_scene":1, "fake_choice":1, "input_text":1, "ending":1, "stat_chart":1};*/
