//usage: dir fileBaseName
var isRhino;
if (typeof java == "undefined") {
  isRhino = false;
  if (typeof fs == "undefined") fs = require('fs');
  if (typeof path == "undefined") path = require('path');
  var args = process.argv;
  args.shift();
  args.shift();
  print = console.log;
} else {
  isRhino = true;
  var args = arguments;
}
if (typeof xmlTranslatorTestOverride == "undefined") {
  var dir = args[0] || "web/mygame/scenes";
  if (isRhino) {
    load("web/scene.js");
    load("web/util.js");
    load("headless.js");
  } else {
    vm = require('vm');
    load = function(file) {
      vm.runInThisContext(fs.readFileSync(file), file);
    };
    load("web/scene.js");
    load("web/util.js");
    load("headless.js");
  }
}

var writer;

function XmlScene(name, stats, nav) {
  Scene.call(this, name, stats, nav);
  this.dedentChain = [];
};

function xmlEscape(str, attribute) {
  var element = !attribute;
  if (typeof(attribute) === "undefined") attribute = true;
  if (str == null) return null;
  var result = "" + str;
  result = result.replace(/&/g, "&amp;");
  if (attribute) {
    result = result.replace(/'/g, "&apos;").replace(/"/g, "&quot;");    
  } else {
    result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\[b\]/g, '<b>')
      .replace(/\[\/b\]/g, '</b>')
      .replace(/\[i\]/g, '<i>')
      .replace(/\[\/i\]/g, '</i>');
  }
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
    writer.write(xmlEscape(data, true));
    writer.write("'");
  }
  writer.write("/>\n");
}

function printNestedElement(tagName, data) {
  closePara();
  writer.write("<");
  writer.write(tagName);
  if (data) {
    writer.write(">");
    writer.write(data);
    writer.write("</");
    writer.write(tagName);
    writer.write(">\n");
  } else {
    writer.write(" />\n");
  }
}

XmlScene.prototype.image = function xmlImage(data) {
  var parts = data.split(" ");
  if (parts.length > 2) throw new Error(this.lineMsg() + "Couldn't parse image name/alignment: " + data);
  var alignment = parts[1]; // TODO do something with alignment
  var parts = parts[0].split(".");
  if (parts.length != 2) throw new Error(this.lineMsg() + "Couldn't parse image name: " + data);
  var imageName = parts[0];
  var imageType = parts[1];
  closePara();
  writer.write("<image name='");
  writer.write(imageName);
  writer.write("' type='");
  writer.write(imageType);
  writer.write("'/>\n");
}

XmlScene.prototype.title = function() {};
XmlScene.prototype.scene_list = function xml_scene_list() {
  this.parseSceneList();
};

XmlScene.prototype.kindle_image = XmlScene.prototype.image;

XmlScene.prototype.kindle_search = function kindle_search(data) {
  var result = /^\((.+)\) ([^\)]+)/.exec(data);
  var query = result[1];
  var buttonName = result[2];
  closePara();
  writer.write("<kindle-search query='");
  writer.write(xmlEscape(query));
  writer.write("'>");
  writer.write(this.replaceLine(buttonName));
  writer.write("</kindle-search>\n");
}

XmlScene.prototype.kindle_product = function kindle_product(data) {
  var result = /^\((.+)\) ([^\)]+)/.exec(data);
  var query = result[1];
  var buttonName = result[2];
  closePara();
  writer.write("<kindle-product asin='");
  writer.write(xmlEscape(query));
  writer.write("'>");
  writer.write(this.replaceLine(buttonName));
  writer.write("</kindle-product>\n");
}

XmlScene.prototype.page_break = function xmlPageBreak(data) {
  printNestedElement("page-break", this.replaceLine(data));
}

XmlScene.prototype.comment = function xmlComment(data) {
  printElement("comment");
}

XmlScene.prototype.bug = XmlScene.prototype.comment;

XmlScene.prototype.finish = function xmlFinish(data) {
  printNestedElement("finish", this.replaceLine(data));
  this.indent = this.getIndent(this.nextNonBlankLine());
}

XmlScene.prototype.autofinish = function xmlAutoFinish() {}

XmlScene.prototype["goto"] = function xmlGoto(data) {
  printElement("include", "label", (""+data).toLowerCase());
  this.indent = this.getIndent(this.nextNonBlankLine());
}

XmlScene.prototype.gosub = function xmlGosub(data) {
  printElement("gosub", "label", (""+data).toLowerCase());
  this.indent = this.getIndent(this.nextNonBlankLine());
}

XmlScene.prototype.restore_purchases = function xmlRestorePurchases(data) {
  printElement("restore-purchases", "label", (""+data).toLowerCase());
}

XmlScene.prototype.delay_break = function xmlDelayBreak(data) {
  printElement("delay-break", "seconds", (""+data).toLowerCase());
}

XmlScene.prototype["return"] = function xmlReturn(data) {
  printElement("return", "id", (""+data).toLowerCase());
}

XmlScene.prototype.label = function xmlLabel(data) {
  printElement("label", "id", (""+data).toLowerCase());
}

XmlScene.prototype.temp = function xmlTemp(data) {
  var result = /^(\w*)(.*)/.exec(data);
  if (!result) throw new Error(this.lineMsg()+"Invalid temp instruction, no variable specified: " + data);
  var variable = result[1];
  var expr = trim(result[2]);
  debugger;
  printElement("temp", "variable", (""+variable).toLowerCase());
  if (expr) this.set(data);
}

XmlScene.prototype.create = function xmlCreate(data) {
  var result = /^(\w*)(.*)/.exec(data);
  if (!result) throw new Error(this.lineMsg()+"Invalid create instruction, no variable specified: " + data);
  var variable = result[1];
  printElement("create", "variable", (""+variable).toLowerCase());
  this.set(data);
}


XmlScene.prototype.ending = function xmlEnding(data) {
  closePara();
  writer.write("<label id='_ending'/>\n"
+"<choice>\n"
+"<option reuse='allow'>\n"
+"<text>Play again.</text>\n"
+"<restart />\n"
+"</option>\n"
+"<option reuse='allow'>\n"
+"<text>Play more games like this.</text>\n"
+"<more-games now='true'/>\n"
+"<include label='_ending'/>\n"
+"</option>\n"
+"<if><test>\n"
+"<not><variable name='choice_kindle' /></not></test>\n"
+"<option reuse='allow'>\n"
+"<text>Share this game with friends.</text>\n"
+"<share-this-game now='true'/>\n"
+"<include label='_ending'/>\n"
+"</option>\n"
+"</if>\n"
+"<if><test>\n"
+"<variable name='choice_kindle' /></test>\n"
+"<option reuse='allow'>\n"
+"<text>Review this game on the Kindle Store.</text>\n"
+"<share-this-game now='true'/>\n"
+"<include label='_ending'/>\n"
+"</option>\n"
+"</if>\n"
+"<if><test>\n"
+"<variable name='choice_subscribe_allowed' /></test>\n"
+"<option reuse='allow'>\n"
+"<text>Email me when new games are available.</text>\n"
+"<subscribe now='true'/>\n"
+"<include label='_ending'/>\n"
+"</option>\n"
+"</if>\n"
+"</choice>\n"
);
}

XmlScene.prototype.delay_ending = XmlScene.prototype.ending;

XmlScene.prototype.advertisement = function xmlAdvertisement() {
  printElement("advertisement");
}

XmlScene.prototype.share_this_game = function xmlShareThisGame(data) {
  printElement("share-this-game", "now", trim(data) == "now");
}

XmlScene.prototype.link = function xmlLink(data) {
  var result = /^(\S+)\s*(.*)/.exec(data);
  if (!result) throw new Error(this.lineMsg() + "invalid line; this line should have an URL: " + data);
  var href = result[1];
  var anchorText = trim(result[2]) || href;
  var amazonPrefix = "http://www.amazon.com/s?rh=n%3A133140011%2Ck%3A"
  if (href.lastIndexOf(amazonPrefix, 0) === 0) {
    var query = href.substring(amazonPrefix.length);
    if (/^[A-Z0-9]+$/.test(query)) {
      writer.write("<kindle-product asin='");
      writer.write(xmlEscape(query));
      writer.write("'>");
      writer.write(this.replaceLine(anchorText));
      writer.write("</kindle-product>\n");
    } else {
      writer.write("<kindle-search query='");
      writer.write(xmlEscape(decodeURIComponent(query)));
      writer.write("'>");
      writer.write(this.replaceLine(anchorText));
      writer.write("</kindle-search>\n");
    }
  }
  closePara();
  writer.write("<link href='"+href+"'>"+anchorText+"</link>\n");
}

XmlScene.prototype.link_button = XmlScene.prototype.link;

XmlScene.prototype.restore_game = function xmlRestoreGame() {
  unrestorables = this.parseRestoreGame();
  closePara();
  writer.write("<restore-game>");
  for (var episode in unrestorables) {
    writer.write("<scene name='"+episode+"'>")
    writer.write(xmlEscape(unrestorables[episode], false));
    writer.write("</scene>");
  }
  writer.write("</restore-game>\n");
}

XmlScene.prototype.save_game = function xmlSaveGame() {
  printElement("save-game");
}

XmlScene.prototype.show_password = function xmlShowPassword(data) {
  closePara();
  printElement("paragraph-break");
  printx("Please name your saved game below:");
  printElement("temp", "variable", "saved_game_name");
  printElement("input-text", "variable", "saved_game_name");
  closePara();
  this.save_game("saved_game_name");
}

XmlScene.prototype.subscribe = function xmlSubscribe(data) {
  printElement("subscribe", "now", trim(data) == "now");
}

XmlScene.prototype.reset = function xmlReset(data) {
  printElement("reset-stats");
}

XmlScene.prototype.restart = function xmlRestart(data) {
  printElement("restart");
}

XmlScene.prototype.more_games = function xmlMoreGames(data) {
  printElement("more-games", "now", trim(data) == "now");
}

XmlScene.prototype.line_break = function xmlLineBreak(data) {
  printElement("line-break");
}

XmlScene.prototype.input_text = function xmlLineBreak(data) {
  printElement("input-text", "variable", data.toLowerCase());
}

XmlScene.prototype.gotoref = function xmlGotoRef(data) {
  closePara();
  writer.write("<goto-ref>");
  writer.write(this.evaluateExpr(this.tokenizeExpr(data)));
  writer.write("</goto-ref>\n");
}

XmlScene.prototype.printLine = function xmlPrintLine(data) {
  printx(this.replaceLine(data.replace(/^ */, "") + ' '));
}

XmlScene.prototype.replaceLine = function xmlReplaceLine(data) {
  return xmlEscape(data, false).replace(/\$(\!?\!?)\{([a-zA-Z][_\w]+)\}/g, function (matched, capitalize, variable) {
    var capitalizeValue = "false";
    if (capitalize == "!") {
      capitalizeValue = "true";
    } else if (capitalize == "!!") {
      capitalizeValue = "all";
    }
    return "<print capitalize='" + capitalizeValue + "'><variable name='" + variable + "'/></print>";
  });
}

XmlScene.prototype.replaceVariables = function xmlReplaceVariables() {}

XmlScene.prototype.print = function xmlPrint(data) {
  closePara();
  writer.write("<print>");
  writer.write(this.evaluateExpr(this.tokenizeExpr(data)));
  writer.write("</print>\n");
}

XmlScene.prototype.setref = function xmlSetRef(data) {
  closePara();
  writer.write("<set-ref><name>");
  var stack = this.tokenizeExpr(data);
  writer.write(this.evaluateValueToken(stack.shift(), stack));
  writer.write("</name><value>");
  writer.write(this.evaluateExpr(stack));
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
  writer.write("<set variable='" + (""+variable).toLowerCase() + "'>");
  writer.write(this.evaluateExpr(stack));
  writer.write("</set>\n");
}

XmlScene.prototype.executeSubScene = function executeSubScene(startLine, endLine, indent) {
  //print(startLine + ":" + endLine);
  var subSceneLines;
  if (typeof(endLine) != "undefined") {
    subSceneLines = this.lines.slice(0, endLine);
  } else {
    subSceneLines = this.lines;
  }
  var subScene = new XmlScene();
  subScene.lines = subSceneLines;
  subScene.loaded = true;
  subScene.lineNum = startLine;
  subScene.indent = indent;
  subScene.execute();
}

XmlScene.prototype["if"] = function xmlIf(data, inChoice) {
  if (inChoice) return this.ifInChoice(data);
  closePara();
  writer.write("<switch line='"+(this.lineNum+1)+"'>\n");
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
    var endLine = this.lineNum;
    if (!/\s*\*els/.test(this.lines[this.lineNum])) {
      // skipTrueBranch retreats one step from the last line
      // except for *else commands, which it skips
      // our endLine is this.lineNum if the block ends with *else
      // or this.lineNum+1 if the block just ends naturally.
      endLine++;
    }
    this["if"] = oldIf;
    var closedTag = false;
    this.dedentChain.push(function (newDent) {
      if (!closedTag && newDent <= oldDent) {
        closedTag = true;
        closePara();
        writer.write("</result></if>\n");
      }
    });
    this.executeSubScene(trueLine, endLine, trueIndent);
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
  if (this.displayOptionConditions) {
    this.displayOptionConditions.push(data);
  } else {
    this.displayOptionConditions = [data];
  }
  var oldDent = this.indent;
  this.dedentChain.push(function(newDent) {
    if (newDent <= oldDent) {
      this.oldDisplayOptionCondition = this.displayOptionConditions.pop();
      if (this.displayOptionConditions.length == 0) this.displayOptionConditions = null;
      return true;
    } else {
      return false;
    }
  });
  this.indent = this.getIndent(this.nextNonBlankLine());
  this.previousElseIf = null;
}

XmlScene.prototype["else"] = function xml_else(data, inChoice) {
    if (inChoice) {
      if (this.previousElseIf) {
        this.ifInChoice("(" + this.elseIfOptionChain + " or (" + this.previousElseIf + ")) = false");
      } else {
        this.ifInChoice("("+this.oldDisplayOptionCondition+") = false");
      }
      return;
    }
    throw new Error(this.lineMsg() + "It is illegal to fall in to an *else statement; you must *goto or *finish before the end of the indented block.");
}

XmlScene.prototype.elsif = XmlScene.prototype.elseif = function xml_elseif(data, inChoice) {
    if (!inChoice) throw new Error(this.lineMsg() + "It is illegal to fall in to an *elseif statement; you must *goto or *finish before the end of the indented block.");
    if (this.previousElseIf) {
      this.elseIfOptionChain = "(" + this.elseIfOptionChain + " or (" + this.previousElseIf + "))";
    } else {
      this.elseIfOptionChain = "(" + this.oldDisplayOptionCondition + ")";
    }
    this.ifInChoice("("+data+") and ("+this.elseIfOptionChain+" = false)");
    this.previousElseIf = data;
}


XmlScene.prototype.parseOptionIf = function xmlParseOptionIf(data) {
  var parsed = /^\s*\((.*)\)\s+(#.*)/.exec(data);
  if (!parsed) {
    return;
  }
  return {result:true, line:parsed[2], condition:parsed[1]};
}


XmlScene.prototype.goto_scene = function xmlGotoScene(data) {
  printElement("goto-scene", "name", data);
}

XmlScene.prototype.evaluateValueToken = function xmlEvaluateValueToken(token, stack) {
  var name = token.name;
  if ("OPEN_PARENTHESIS" == name) {
      return this.evaluateExpr(stack, "CLOSE_PARENTHESIS");
  } else if ("OPEN_CURLY" == name) {
      var value = this.evaluateExpr(stack, "CLOSE_CURLY");
      return "<reference>" + value + "</reference>";
  } else if ("FUNCTION" == name) {
      var functionName = /^\w+/.exec(token.value)[0];
      var value = this.evaluateExpr(stack, "CLOSE_PARENTHESIS");
      return "<"+functionName+">" + value + "</"+functionName+">";
  } else if ("NUMBER" == name) {
      return "<text>" + xmlEscape(token.value, true) + "</text>";
  } else if ("STRING" == name) {
      // strip off the quotes and unescape backslashes
      return "<text>" + this.replaceLine(token.value.slice(1,-1).replace(/\\(.)/g, "$1"), true) + "</text>";
  } else if ("VAR" == name) {
      return "<variable name='" + token.value.toLowerCase() + "' />";
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
    ,"%": function modulus(v1,v2) { return mathOperator("%", v1, v2); }
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
    if (!this.dedentChain[i]) continue;
    var result = this.dedentChain[i].call(this, newDent);
    if (result) delete this.dedentChain[i]
  }
}
XmlScene.prototype.choice = function xmlChoice(data) {
  closePara();
  var groups = data.split(/ /);
  var startLine = this.lineNum+1;
  var options = this.parseOptions(this.indent, groups);

  var endLine = this.lineNum;
  var endIndent = this.indent;
  writer.write("<choice line='"+(startLine)+"'>\n");
  if (groups.length && groups[0]) {
    writer.write("<groups>\n");
    for (var i = 0; i < groups.length; i++) {
      writer.write("<group name='" + groups[i] + "'/>\n");
    }
    writer.write("</groups>\n");
  }
  var oldDent = this.indent;
  this.writeOption = function writeOption(option) {
    if (option.displayIf) {
      var displayIfExpression = option.displayIf[0];
      for (var i = 1; i < option.displayIf.length; i++) {
        displayIfExpression = "("+displayIfExpression+") and ("+option.displayIf[i]+")";
      }
      writer.write("<if><test>\n");
      writer.write(this.evaluateExpr(this.tokenizeExpr(displayIfExpression)));
      writer.write("</test>\n");
    }
    writer.write("<option reuse='");
    writer.write(option.reuse || "allow");
    writer.write("'>\n");
    if (option.selectableIf) {
      writer.write("<selectable-if><test>\n");
      writer.write(this.evaluateExpr(this.tokenizeExpr(option.selectableIf)));
      writer.write("</test></selectable-if>\n");
    }
    writer.write("<text>");
    writer.write(this.replaceLine(option.name));
    writer.write("</text>\n");
    if (option.suboptions) {
      for (var i = 0; i < option.suboptions.length; i++) {
        this.writeOption(option.suboptions[i]);
      }
      writer.write("</option>\n");
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
        return true;
      } else {
        return false;
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

// Don't throw errors on conflicting options; just translate them
XmlScene.prototype.conflictingOptions = function() {};

XmlScene.prototype.rand = function xmlRand(data) {
  closePara();
  var args = data.split(/ /);
  var variable, minimum, maximum;
  variable = args[0];
  writer.write("<random variable='" + variable.toLowerCase() + "'><minimum>");
  writer.write(this.evaluateValueExpr(args[1]));
  writer.write("</minimum><maximum>");
  writer.write(this.evaluateValueExpr(args[2]));
  writer.write("</maximum></random>\n");
}

XmlScene.prototype.input_number = function xmlInputNumber(data) {
  closePara();
  var args = data.split(/ /);
  var variable, minimum, maximum;
  variable = args[0];
  writer.write("<input-number variable='" + variable.toLowerCase() + "'><minimum>");
  writer.write(this.evaluateValueExpr(args[1]));
  writer.write("</minimum><maximum>");
  writer.write(this.evaluateValueExpr(args[2]));
  writer.write("</maximum></input-number>\n");
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
      writer.write("<");
      writer.write(row.type);
      writer.write(">\n");
      writer.write(this.evaluateValueExpr(row.variable));
      writer.write("<label>");
      writer.write(this.replaceLine(row.label));
      writer.write("</label>");
      if (row.definition) {
        writer.write("<definition>");
        writer.write(this.replaceLine(row.label));
        writer.write("</definition>");
      }
      writer.write("\n</");
      writer.write(row.type);
      writer.write(">\n");
    } else if ("opposed_pair" == row.type) {
      writer.write("<opposed-pair>\n");
      writer.write(this.evaluateValueExpr(row.variable));
      writer.write("\n<label>");
      writer.write(this.replaceLine(row.label));
      writer.write("</label>");
      if (row.definition) {
        writer.write("<definition>");
        writer.write(this.replaceLine(row.label));
        writer.write("</definition>");
      }
      writer.write("\n<label>");
      writer.write(this.replaceLine(row.opposed_label));
      writer.write("</label>");
      if (row.opposed_definition) {
        writer.write("<definition>");
        writer.write(this.replaceLine(row.label));
        writer.write("</definition>");
      }
      writer.write("\n</opposed-pair>\n");
    }
  }
  writer.write("</stat-chart>\n");
}

XmlScene.prototype.goto_random_scene = function xmlGotoRandomScene(data) {
  closePara();
  var options = this.parseGotoRandomScene(data);
  var allowReuseGlobally = /\ballow_reuse\b/.test(data);
  var allowNoSelection = /\ballow_no_selection\b/.test(data);
  writer.write("<goto-random-scene allowReuse='"+allowReuseGlobally+"'>\n");
  for (var i = 0; i < options.length; i++) {
    var option = options[i];
    writer.write("  <scene name='");
    writer.write(option.name);
    writer.write("' allowReuse='");
    writer.write(option.allowReuse);
    writer.write("'");
    if (option.conditional) {
      writer.write(">");
      writer.write(this.evaluateExpr(this.tokenizeExpr(option.conditional)));
      writer.write("</scene>\n");
    } else {
      writer.write("/>\n");
    }
  }
  writer.write("</goto-random-scene>\n");
}

XmlScene.prototype.check_purchase = function xmlCheckPurchase(data) {
  writer.write("<check-purchase>\n");
  var products = data.split(/ /);
  for (var i = 0; i < products.length; i++) {
    writer.write("<product name='"+products[i]+"' />\n");
  }
  writer.write("</check-purchase>\n");
}

XmlScene.prototype.purchase = function xmlPurchase(data) {
  var result = /^(\w+)\s+(\S+)\s+(.*)/.exec(data);
  if (!result) throw new Error(this.lineMsg() + "invalid line; can't parse purchaseable product: " + data);
  var product = result[1];
  var priceGuess = trim(result[2]);
  var label = trim(result[3]);
  writer.write("<purchase product='"+product+"' priceGuess='"+priceGuess+"' label='"+label+"' />\n");
}

if (args[1]) {
  if (isRhino) {
    list = [new java.io.File(dir, args[1] + ".txt")];
  } else {
    list = [args[1] + ".txt"];
  }
} else if (true) {
  if (isRhino) {
    var list = new java.io.File(dir).listFiles();
  } else {
    var list = fs.readdirSync(dir);
  }
} else {
  if (isRhino) {
    load("web/navigator.js");
    load("web/mygame/mygame.js");
    list = [];
    if (typeof(nav) != "undefined") {
      var statsFile = new java.io.File(dir, "choicescript_stats.txt");
      if (statsFile.exists()) list.push(statsFile);
      for (nextScene = nav.getStartupScene(); nextScene; nextScene = nav.nextSceneName(nextScene)) {
        list.push(new java.io.File(dir, nextScene + ".txt"));
      }
    }
  } else {
    eval(fs.readFileSync("web/navigator.js", "utf-8"));
    eval(fs.readFileSync("web/mygame/mygame.js", "utf-8"));
    list = [];
    if (typeof(nav) != "undefined") {
      if (fs.existsSync(dir + "/choicescript_stats.txt")) list.push("choicescript_stats.txt");
      for (nextScene = nav.getStartupScene(); nextScene; nextScene = nav.nextSceneName(nextScene)) {
        list.push(nextScene + ".txt");
      }
    }
  }
  
}

if (typeof xmlTranslatorTestOverride != "undefined") {
  xmlTranslatorTestOverride();
} else {
  var i = list.length;
  var translatorLastModified = fileLastMod("xmltranslator.js");
  while (i--) {
    var fileName;
    var filePath;
    if (isRhino) {
      fileName = list[i].getName();
      filePath = list[i].getAbsolutePath();
    } else {
      fileName = list[i];
      filePath = dir + "/" + list[i];
    }
    if (/(menu|hello)/.test(fileName)) continue;
    if (!/\.txt$/.test(fileName)) continue;
    var inputMod = fileLastMod(filePath);
    if (inputMod < translatorLastModified) inputMod = translatorLastModified;
    var outputDir = "./xmloutput/";
    mkdirs(dir);
    var outputFilePath = outputDir + fileName + ".xml";
    var outputMod = fileLastMod(outputFilePath);
    if (inputMod <= outputMod) {
      print(list[i] + " up to date");
      continue;
    }
    print(list[i]);
    var str = slurpFile(filePath);
    var scene = new XmlScene();
    scene.name = fileName.replace(/\.txt$/i, "");
    scene.loadLines(str);
    var writer;
    if (isRhino) {
      writer = new java.io.BufferedWriter(new java.io.OutputStreamWriter(new java.io.FileOutputStream(outputFilePath), "UTF-8"));
    } else {
      writer = fs.createWriteStream(outputFilePath, {flags: 'w', encoding: 'utf-8', mode: 0666});
    }
    
    //writer = {write: function(x){java.lang.System.out.print(x)}, close: function(){java.lang.System.out.println()}};
    writer.write("<!DOCTYPE vignette [ \n" + 
  			"<!ATTLIST label id ID #REQUIRED>\n" + 
  			"]>");
    writer.write("<vignette>\n");
    scene.execute();
    closePara();
    writer.write("</vignette>\n");
    if (isRhino) {
      writer.close();
    } else {
      writer.end();
    }
    
    //throw new Error("halt");
  }
}

/*
else dedentChain
${}
*/

/*Scene.validCommands = {"comment":1, "goto":1, "gotoref":1, "label":1, "looplimit":1, "finish":1, "abort":1,
    "choice":1, "create":1, "temp":1, "delete":1, "set":1, "setref":1, "print":1, "if":1, "rand":1,
    "page_break":1, "line_break":1, "script":1, "else":1, "elseif":1, "elsif":1, "reset":1,
    "goto_scene":1, "fake_choice":1, "input_text":1, "ending":1, "stat_chart":1};*/
