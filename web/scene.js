/*
 * Copyright 2010 by Dan Fabulich.
 *
 * Dan Fabulich licenses this file to you under the
 * ChoiceScript License, Version 1.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.choiceofgames.com/LICENSE-1.0.txt
 *
 * See the License for the specific language governing
 * permissions and limitations under the License.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied.
 */
function Scene(name, stats, nav, options) {
    if (!name) name = "";
    if (!stats) stats = {implicit_control_flow:false};
    if (stats["implicit_control_flow"] === undefined) stats["implicit_control_flow"] = false;
    // the name of the scene
    this.name = name;

    // the permanent statistics and the temporary values
    this.stats = stats;
    // implicit_control_flow controls whether goto is necessary to leave options (true means no)
    // _choiceEnds stores the line numbers to jump to when choice #options end.
    this.temps = {choice_reuse:"allow", choice_user_restored:false, _choiceEnds:{}};

    // the navigator determines which scene comes next
    this.nav = nav;

    options = options || {};

    // should we print debugging information?
    this.debugMode = options.debugMode || false;

    // used for stats screen, and maybe other secondary views someday
    this.secondaryMode = options.secondaryMode;

    this.saveSlot = options.saveSlot || "";

    // the array of lines in the scene file
    this.lines = [];

    // the current line number (WARNING 0-based!)
    this.lineNum = 0;
    this.rollbackLineCoverage();

    // when this is true, the main printLoop will halt
    this.finished = false;

    // map of label names to line numbers
    this.labels = {};

    // the current amount of indentation
    this.indent = 0;

    // Did the previous line contain text?
    this.prevLine = "empty";

    // Have we ever printed any text?
    this.screenEmpty = true;

    // Have we run any commands (except for create and scene_list) yet?
    this.initialCommands = true;

    this.stats.sceneName = name;

    // for easy reachability from the window
    this.stats.scene = this;

    // where should we print text?
    this.target = null;

    this.accumulatedParagraph = [];
}

Scene.prototype.reexecute = function reexecute() {
  this.lineNum = this.stats.testEntryPoint || 0;
  this.finished = 0;
  this.indent = this.getIndent(this.lines[this.lineNum]);
  this.prevLine = "empty";
  this.screenEmpty = true;
  this.execute();
};

// the main loop of the scene
Scene.prototype.printLoop = function printLoop() {
    var line;
    for (;!this.finished && this.lineNum < this.lines.length; this.lineNum++) {
        line = this.lines[this.lineNum];
        if (!trim(line)) {
            this.paragraph();
            continue;
        }
        var indent = this.getIndent(line);
        if (indent > this.indent) {
            // ignore indentation level of *comments
            if (/\s*\*comment\b/.test(line)) continue;
            throw new Error(this.lineMsg() + "increasing indent not allowed, expected " + this.indent + " was " + indent);
        } else if (indent < this.indent) {
            this.dedent(indent);
        }
        // Ability to end a choice #option without goto is guarded by implicit_control_flow variable
        if (this.temps._choiceEnds[this.lineNum] && 
                (this.stats["implicit_control_flow"] || this.temps._fakeChoiceDepth > 0)) {
            // Skip to the end of the choice if we hit the end of an #option
            this.rollbackLineCoverage();
            this.lineNum = this.temps._choiceEnds[this.lineNum];
            this.rollbackLineCoverage();
            if (this.temps._fakeChoiceDepth > 0) {
                this.temps._fakeChoiceDepth--;
            }
            continue;
        }
        this.indent = indent;
        if (/^\s*#/.test(line)) {
            throw new Error(this.lineMsg() + "It is illegal to fall out of a *choice statement; you must *goto or *finish before the end of the indented block.");
        }
        if (!this.runCommand(line)) {
            this.prevLine = "text";
            this.screenEmpty = false;
            this.printLine(line);
        }
    }
    this.rollbackLineCoverage();
    if (!this.finished) {
        this.autofinish();
    }
    this.save("temp");
    if (this.skipFooter) {
        this.skipFooter = false;
    } else {
        printFooter();
    }
};

Scene.prototype.dedent = function dedent(newDent) {};

Scene.prototype.printLine = function printLine(line) {
    if (!line) return null;
    line = this.replaceVariables(line.replace(/^ */, ""));
    this.accumulatedParagraph.push(line);
    // insert extra space unless the line ends with hyphen or dash
    if (!/([-\u2011-\u2014]|\[c\/\])$/.test(line)) this.accumulatedParagraph.push(' ');
};

Scene.prototype.replaceVariables = function (line) {
  line = String(line);
  var replacer = /([$@](\!?\!?)\{)/;
  var index = 0;
  var output = [];
  for (var result = replacer.exec(line); result; result = replacer.exec(line.substring(index))) {
    output.push(line.substring(index, index + result.index));
    var curlies = 0;
    var closingCurly = -1;
    var exprStart = index + result.index + result[1].length;
    for (var i = exprStart; i < line.length; i++) {
      var c = line.charAt(i);
      if (c === "{") {
        curlies++;
      } else if (c === "}") {
        if (curlies) {
          curlies--;
        } else {
          closingCurly = i;
          break;
        }
      }
    }
    if (closingCurly == -1) {
      throw new Error(this.lineMsg() + "invalid "+result[0]+"} variable substitution at letter " + (index + result.index + 1));
    }
    var body = line.substring(exprStart, closingCurly);
    var stack, value;
    if (result[0].charAt(0) === "$") {
      stack = this.tokenizeExpr(body);
      value = this.evaluateExpr(stack);
    } else {
      var expr;
      var options;
      if (/^\s*\(/.test(body)) {
        var parens = 0;
        var closingParen = -1;
        for (var i = 1; i < body.length; i++) {
          var c = body.charAt(i);
          if (c === "(") {
            parens++;
          } else if (c === ")") {
            if (parens) {
              parens--;
            } else {
              closingParen = i;
              break;
            }
          }
        }
        if (closingParen == -1) {
          throw new Error(this.lineMsg() + "invalid "+result[0]+"} at letter " + (index + result.index + 1) + "; missing closing parenthesis )");
        }
        if (body.charAt(closingParen+1) != " ") {
          throw new Error(this.lineMsg() + "invalid "+result[0]+"} at letter " + (index + result.index + 1) + "; there should be a space after the closing parenthesis )");
        }
        expr = body.substring(1, closingParen);
        options = body.substring(closingParen+2).split("|");
      } else {
        if (!/^\S+ /.test(body)) {
          throw new Error(this.lineMsg() + "invalid "+result[0]+"} at letter " + (index + result.index + 1) + "; there should be a space after the first word");
        }
        var spaceIndex = body.indexOf(' ');
        expr = body.substring(0, spaceIndex);
        options = body.substring(spaceIndex+1).split("|");
      }
      if (options.length < 2) {
        throw new Error(this.lineMsg() + "invalid "+result[0]+"} at letter " + (index + result.index + 1) + "; there should be at least one pipe | to separate options");
      }
      stack = this.tokenizeExpr(expr);
      value = this.evaluateExpr(stack);
      if (typeof value === "boolean" || /^(true|false)$/i.test(value)) {
        value = bool(value) ? 1 : 2;
      }
      value = num(value, this.lineNum+1);
      if ((value | 0) !== value) {
        throw new Error(this.lineMsg() + "invalid "+result[0]+"} at letter " + (index + result.index + 1) + "; '"+expr+"' is equal to " + value + " which is not a whole integer number");
      } else if (value < 1) {
        throw new Error(this.lineMsg() + "invalid "+result[0]+"} at letter " + (index + result.index + 1) + "; '"+expr+"' is equal to " + value + " which is not a positive number");
      } else if (value > options.length) {
        throw new Error(this.lineMsg() + "invalid "+result[0]+"} at letter " + (index + result.index + 1) + "; '"+expr+"' is equal to " + value + " but there are only " + options.length + " options");
      }
      value = options[value-1];
      value = this.replaceVariables(value);
    }
    var capitalize = result[2];
    if (capitalize) value = String(value);
    if (capitalize == "!") {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (capitalize == "!!") {
      value = value.toUpperCase();
    }
    if (typeof highlightGenderPronouns != "undefined" && highlightGenderPronouns && /\b(he|him|his|she|her|hers)\b/gi.test(value)) {
      // this zero-width space will give us a hint for highlighting
      output.push("\u200b");
    }
    output.push(value);
    index = closingCurly+1;
  }
  if (index === 0) return line;
  output.push(line.substring(index));
  return output.join("");
};

Scene.prototype.paragraph = function paragraph() {
    printParagraph(this.accumulatedParagraph.join(""));
    this.accumulatedParagraph = [];
    this.prevLine = "empty";
};

Scene.prototype.loadSceneFast = function loadSceneFast(url) {
    if (this.loading) return;
    this.loading = true;
    var result;
    if (window.cachedResults && window.cachedResults[this.name]) {
      result = window.cachedResults[this.name];
      return this.loadLinesFast(result.crc, result.lines, result.labels);
    } else if (typeof allScenes != "undefined") {
      result = allScenes[this.name];
      if (!result) throw new Error("Couldn't load scene '" + this.name + "'\nThe file doesn't exist.");
      return this.loadLinesFast(result.crc, result.lines, result.labels);
    } else if (typeof isIosApp != "undefined") {
      startLoading();
      var self = this;
      var startedWaiting = new Date().getTime();

      function retryScenes(command) {
        if (!command) command = "retryscenes";
        clearScreen(function() {
          startLoading();
          if (command == "retryscenes") curl();
          window.downloadState = null;
          callIos(command);
          startedWaiting = new Date().getTime();
          awaitAllScenes();
        });
      }

      function awaitAllScenes() {
        if (typeof allScenes != "undefined") {
          result = allScenes[self.name];
          if (!result) throw new Error("Couldn't load scene '" + self.name + "'\nThe file doesn't exist.");
          self.loadLinesFast(result.crc, result.lines, result.labels);
        } else if (window.downloadState == "failed" || (new Date().getTime() - startedWaiting) > 5000) {
          doneLoading();
          if (window.downloadRequired) {
            println("We weren't able to download the latest version of the game.");
            println("");
            printButton("Try Again", main, false, retryScenes);
          } else {
            println("We weren't able to download the latest version of the game. Please try downloading again. The latest version may contain important fixes.");
            println("");
            var retry = {name: "Try downloading again."};
            var ignore = {name: "Continue playing without the latest version."}
            printOptions([""], [retry, ignore], function(option) {
              if (option == retry) {
                retryScenes();
              } else {
                retryScenes("requestscenesforce");
              }
            });
          }
        } else {
          setTimeout(awaitAllScenes, 0);
        }
      }
      return awaitAllScenes();
    }
    startLoading();
    if (!url) {
        url = Scene.baseUrl + "/" + this.name.replace(/ /g, "_") + ".txt.json";
    }
    var xhr = findXhr();
    xhr.open("GET", url, true);
    var self = this;
    var done = false;
    xhr.onreadystatechange = function() {
        if (done) return;
        if (xhr.readyState != 4) return;
        if (xhr.status == 403) {
          try {
            var err = JSON.parse(xhr.responseText);
            if (err.error == "not registered") {
              return isRegistered(function(registered) {
                if (registered) {
                  logout();
                  loginDiv();
                }
                return clearScreen(function() {
                  loginForm(main, 0/*optional*/,
                    "Please sign in to access this part of the game.", function() {
                      clearScreen(loadAndRestoreGame);
                    });
                });
              });
            }
          } catch (e) {} // JSON parse failure? must not be a login prompt
        }
        done = true;

        var result;
        try {
          result = jsonParse(xhr.responseText);
        } catch (e) {
          if (window.console) console.error(e, e.stack);
        }
        if (window.isWeb && (xhr.status != 200 || !result)) {
          var status = xhr.status;
          if (status == 200 || !status) status = "network";
          main.innerHTML = "<p>Our apologies; there was a " + status + " error while loading game data."+
          "  Please refresh your browser now; if that doesn't work, please click the Restart button and email "+getSupportEmail()+" with details.</p>"+
          " <p><button onclick='window.location.reload();'>Refresh Now</button></p>";
          return;
        } else if (xhr.responseText === "") {
          throw new Error("Couldn't load " + url + "\nThe file is probably missing or empty.");
        }
        
        if (!window.cachedResults) window.cachedResults = {};
        cachedResults[self.name] = result;
        self.loadLinesFast(result.crc, result.lines, result.labels);
    };
    if (isIE) {
      // IE8 swallows errors in onreadystatechange if xhr.send is in a try block
      xhr.send(null);
    } else {
      try {
        xhr.send(null);
      } catch (e) {
        if (window.location.protocol == "file:" && !window.isMobile) {
          if (/Chrome/.test(navigator.userAgent)) {
            window.onerror("We're sorry, Google Chrome has blocked ChoiceScript from functioning.  (\"file:\" URLs cannot "+
            "load files in Chrome.)  ChoiceScript works just fine in Chrome, but only on a published website like "+
            "choiceofgames.com.  For the time being, please try another browser like Mozilla Firefox.");
            return;
          }
        }
        window.onerror("Couldn't load URL: " + url + "\n" + e);
      }
    }
};

Scene.prototype.loadLinesFast = function loadLinesFast(crc, lines, labels) {
  this.crc = crc;
  this.lines = lines;
  this.labels = labels;
  this.loading = false;
  this.loaded = true;
  var self = this;
  if (this.executing) {
    safeCall(this, function() {
      doneLoading();
      self.execute();
    });
  }
};

// load the scene file from the specified URL (or from default URL by name)
Scene.prototype.loadScene = function loadScene(url) {
    if (this.loading) return;
    this.loading = true;
    startLoading();
    if (!url) {
        url = Scene.baseUrl + "/" + this.name + ".txt";
    }
    var xhr = findXhr();
    xhr.open("GET", url, true);
    var self = this;
    var done = false;
    xhr.onreadystatechange = function() {
        if (done) return;
        if (xhr.readyState != 4) return;
        done = true;
        if (xhr.status == 403) {
          try {
            var err = JSON.parse(xhr.responseText);
            if (err.error == "not registered") {
              return isRegistered(function(registered) {
                if (registered) {
                  logout();
                  loginDiv();
                }
                return clearScreen(function() {
                  loginForm(main, 0/*optional*/,
                    "Please sign in to access this part of the game.", function() {
                      clearScreen(loadAndRestoreGame);
                    });
                });
              });
            }
          } catch (e) {} // JSON parse failure? must not be a login prompt
        }
        if (window.isWeb && xhr.status != 200) {
            var status = xhr.status || "network";
            main.innerHTML = "<p>Our apologies; there was a " + status + " error while loading game data."+
            "  Please refresh your browser now; if that doesn't work, please email "+getSupportEmail()+" with details.</p>"+
            " <p><button onclick='window.location.reload();'>Refresh Now</button></p>";
            return;
        } else if (xhr.responseText === "") {
          if (window.location.protocol == "file:" && !window.isMobile && /Chrome/.test(navigator.userAgent)) {
            window.onerror("We're sorry, Google Chrome has blocked ChoiceScript from functioning.  (\"file:\" URLs cannot "+
            "load files in Chrome.)  ChoiceScript works just fine in Chrome, but only on a published website like "+
            "choiceofgames.com.  For the time being, please try another browser like Mozilla Firefox.");
            return;
          } else {
            window.onerror("Couldn't load " + url + "\nThe file is probably missing or empty.");
            return;
          }
        }
        var result = xhr.responseText;
        scene = result;
        scene = scene.replace(/\r/g, "");
        this.loading = false;
        self.loadLines(scene);
        if (self.executing) {
            safeCall(self, function () {
              doneLoading();
              self.execute();
            });
        }
    };
    if (isIE) {
      // IE8 swallows errors in onreadystatechange if xhr.send is in a try block
      xhr.send(null);
    } else {
      try {
        xhr.send(null);
      } catch (e) {
        if (window.location.protocol == "file:" && !window.isMobile) {
          if (/Chrome/.test(navigator.userAgent)) {
            window.onerror("We're sorry, Google Chrome has blocked ChoiceScript from functioning.  (\"file:\" URLs cannot "+
            "load files in Chrome.)  ChoiceScript works just fine in Chrome, but only on a published website like "+
            "choiceofgames.com.  For the time being, please try another browser like Mozilla Firefox.");
            return;
          } else if (e.code === 1012 /*NS_ERROR_DOM_BAD_URI*/) {
            window.onerror("Couldn't load scene file: " + url + "\nThe file is probably missing.");
            return;
          }
        }
        window.onerror("Couldn't load URL: " + url + "\n" + e);
      }
    }
};

Scene.prototype.checkSum = function checkSum() {
  if (this.temps.choice_crc) {
    if (!this.randomtest && !this.quicktest && this.temps.choice_crc != this.crc && this.lineNum) {
      // The scene has changed; restart the scene from backup
      if (typeof alertify !== 'undefined') {
        if (!initStore()) {
          alertify.log(this.name + ".txt has updated. Restarting chapter.");
        } else {
          alertify.log("The game has updated. Restarting chapter.");
        }
      }
      var self = this;
      safeTimeout(function() {
        clearScreen(function() {
          loadAndRestoreGame("backup", self.name);
        });
      }, 0);
      return false;
    } else {
      return true;
    }
  } else {
    this.temps.choice_crc = this.crc;
    return true;
  }
};

Scene.prototype.loadLines = function loadLines(str) {
    this.crc = crc32(str);
    this.lines = str.split(/\r?\n/);
    this.parseLabels();
    this.loaded = true;
};

// launch the vignette as soon as it's available
Scene.prototype.execute = function execute() {
    if (!this.loaded) {
        this.executing = true;
        if (Scene.generatedFast || (typeof generatedFast != "undefined" && generatedFast) || typeof allScenes != 'undefined') {
          this.loadSceneFast();
        } else {
          this.loadScene();
        }
        return;
    }
    if (!this.checkSum()) {
      return;
    }
    if (this.nav) this.nav.repairStats(stats);
    if (!this.temps._choiceEnds) this.temps._choiceEnds = {};
    doneLoading();
    if (typeof this.targetLabel != "undefined") {
      var label = this.targetLabel.label.toLowerCase();
      if (typeof(this.labels[label]) != "undefined") {
          this.lineNum = this.labels[label];
          this.indent = this.getIndent(this.lines[this.lineNum]);
          delete this.targetLabel;
      } else {
          throw new Error(this.targetLabel.origin + " line " + (this.targetLabel.originLine+1) + ": "+this.name+" doesn't contain label " + label);
      }
    }
    // this backup slot will only be used when the scene crc changes during upgrades
    if (!this.lineNum) {
      var subsceneStack = this.stats.choice_subscene_stack || [];
      if (!subsceneStack.length) this.save("backup");
    }
    this.printLoop();
};

// loop through the file looking for *label commands
Scene.prototype.parseLabels = function parseLabels() {
    var lineLength = this.lines.length;
    var oldLineNum = this.lineNum;
    var screenshots = ("choicescript_screenshots" == this.name);
    var seenChoiceWithoutSet = 0;
    for (this.lineNum = 0; this.lineNum < lineLength; this.lineNum++) {
        this.rollbackLineCoverage();
        var line = this.lines[this.lineNum];
        // strip byte order mark
        if (this.lineNum == 0 && line.charCodeAt(0) == 65279) lines[0] = line.substring(1);
        var invalidCharacter = line.match(/^(.*)\ufffd/);
        if (invalidCharacter) throw new Error(this.lineMsg() + "invalid character. (ChoiceScript text should be saved in the UTF-8 encoding.) " + invalidCharacter[0]);
        var result = /^(\s*)\*(\w+)(.*)/.exec(line);
        if (!result) continue;
        var indentation = result[1];
        var indent = indentation.length;
        var command = result[2].toLowerCase();
        var data = trim(result[3]);
        if ("label" == command) {
            data = data.toLowerCase();
            if (/\s/.test(data)) throw new Error(this.lineMsg() + "label '"+data+"' is not allowed to contain spaces");
            if (this.labels.hasOwnProperty(data)) {
              throw new Error(this.lineMsg() + "label '"+data+"' already defined on line " + (this.labels[data]*1+1));
            }
            this.labels[data] = this.lineNum;
        } else if (screenshots) {
          if ("fake_choice" == command) {
            if (seenChoiceWithoutSet) throw new Error(this.lineMsg() +
              "In choicescript_screenshots, you need to *set at least one variable between *fake_choice commands, so the stat screen looks interesting. " +
              "There was no *set since the last *fake_choice on line " + seenChoiceWithoutSet + ".");
            seenChoiceWithoutSet = this.lineNum+1;
          } else if ("set" == command) {
            seenChoiceWithoutSet = 0;
          }
        }
    }
    this.rollbackLineCoverage();
    this.lineNum = oldLineNum;
};

// if this is a command line, run it
Scene.prototype.runCommand = function runCommand(line) {
    var result = /^\s*\*(\w+)(.*)/.exec(line);
    if (!result) {
      if (this.secondaryMode == "startup" && this.startupCallback) {
        this.finished = true;
        this.skipFooter = true;
        this.startupCallback();
        return true;
      }
      return false;
    }
    var command = result[1].toLowerCase();
    var data = trim(result[2]);
    if (Scene.validCommands[command]) {
        if ("comment" == command) return true;
        if (Scene.initialCommands[command]) {
          if ("startup" != String(this.name).toLowerCase() || !this.initialCommands) {
            throw new Error(this.lineMsg() + "Invalid "+command+" instruction, only allowed at the top of startup.txt");
          }
        } else {
          if (this.secondaryMode == "startup" && this.startupCallback) {
            this.finished = true;
            this.skipFooter = true;
            this.startupCallback();
            return true;
          }
          this.initialCommands = false;
        }
        if (command == "choice" && String(this.name).toLowerCase() == "choicescript_screenshots") {
          throw new Error(this.lineMsg() + "choicescript_screenshots files should only contain *fake_choice commands, not real *choice commands");
        }
        this[command](data);
    } else {
        throw new Error(this.lineMsg() + "Non-existent command '"+command+"'");
    }
    return true;
};

// *choice [group1] [group2] ...
// prompt the user with a multiple choice question.
// nested lines are options to be presented to the user
//
// Examples:
// *choice
//    good
//      Good choice
//      *finish
//    bad
//      Bad choice
//      *finish
//
// *choice toy
//    spaceship
//      Nice spaceship
//      *finish
//    train
//      Nice train
//      *finish
//    doll
//      Nice doll
//      *finish
//
// *choice color toy
//    red
//      spaceship
//        Nice red spaceship
//        *finish
//      train
//        Nice red train
//        *finish
//    blue
//       spaceship
//         Nice blue spaceship
//        *finish
//       train
//         Nice red train
//        *finish

// If a group is specified, generate a prompt message, e.g. "*choice toy" -> "Select a toy:"
// If no group is specified, don't generate a prompt message
// if multiple groups are specified, allow the user to make multiple choices simultaneously
//   all multi-dimensional choices must be valid (otherwise throw a parse error)
Scene.prototype.choice = function choice(data) {
    var startLineNum = this.lineNum;
    var groups = data.split(/ /);
    for (var i = 0; i < groups.length; i++) {
      if (!/^\w*$/.test(groups[i])) {
        throw new Error(this.lineMsg() + "invalid choice group name: " + groups[i]);
      }
    }
    var options = this.parseOptions(this.indent, groups);
    var self = this;
    this.renderOptions(groups, options, function(option) {
      self.standardResolution(option);
    });
    this.finished = true;
    if (this.temps._fakeChoiceDepth > 0 || this.stats["implicit_control_flow"]) {
      if (!this.temps._choiceEnds) {
        this.temps._choiceEnds = {};
      }
      for (i = 0; i < options.length; i++) {
        this.temps._choiceEnds[options[i].line-1] = this.lineNum;
      }
    }
    this.lineNum = startLineNum;
};

Scene.prototype.fake_choice = function fake_choice(data) {
    if (this.temps._fakeChoiceDepth === undefined) {
        this.temps._fakeChoiceDepth = 0;
    }
    this.temps._fakeChoiceDepth++;
    this.choice(data);
};

Scene.prototype.standardResolution = function(option) {
  var self = this;
  self.lineNum = option.line;
  self.indent = self.getIndent(self.nextNonBlankLine(true/*includingThisOne*/));
  if (option.reuse && option.reuse != "allow") self.temps.choice_used[option.line-1] = 1;
  if (this.nav) this.nav.bugLog.push("#"+(option.line+1) + " " + option.name);

  self.finished = false;
  self.resetPage();
};

Scene.prototype.nextNonBlankLine = function nextNonBlankLine(includingThisOne) {
    var line;
    var i = this.lineNum;
    if (!includingThisOne) i++;
    while(isDefined(line = this.lines[i]) && !trim(line)) {
      i++;
    }
    return line;
};

Scene.prototype.previousNonBlankLineNum = function previousNonBlankLineNum() {
  var line;
  var i = this.lineNum - 1;
  while(isDefined(line = this.lines[i]) && !trim(line)) {
    i--;
  }
  return i;
};


Scene.prototype.resetCheckedPurchases = function resetCheckedPurchases() {
  for (var temp in this.temps) {
    if (/^choice_purchased/.test(temp)) {
      delete this.temps[temp];
    }
  }
};

// reset the page and invoke code after clearing the screen
Scene.prototype.resetPage = function resetPage() {
    var self = this;
    this.resetCheckedPurchases();
    clearScreen(function() {
      // save in the background, eventually
      self.save("");
      self.prevLine = "empty";
      self.screenEmpty = true;
      self.execute();
    });
};

/* The function needs some explaining.
We want the game to be "refreshable," e.g. on the web.
So we only make a "real" autosave as you click "Next"
But if we do it that way, when we visit the stat screen, it's out of date
So we make a "temp" autosave slot, right as the page finishes redrawing,
and the stat screen uses the "temp" autosave to display your current data.
When you refresh the page, the "temp" autosave is rewritten.

If you save stats on the stat screen, they're written into tempStatWrites;
when the stat screen saves, we transfer tempStatWrites back to the main
game (if the main game is running in a separate iframe, e.g. iOS).

If the main game is about to write the main "" slot, we merge the temp
stat writes into the main stats (and clear the stat writes) before
saving.

Thus, stat changes on the stat screen will only be permanently saved when
the player clicks "Next" in the main game, ensuring that the game is still
refreshable.
*/
Scene.prototype.save = function save(slot) {
    if (this.saveSlot) {
      transferTempStatWrites();
    } else {
      if (!slot) {
        slot = "";
        for (var key in tempStatWrites) {
          if (tempStatWrites.hasOwnProperty(key)) {
            this.stats[key] = tempStatWrites[key];
          }
        }
        tempStatWrites = {};
      }
      
      saveCookie(function() {}, slot, this.stats, this.temps, this.lineNum, this.indent, this.debugMode, this.nav);
    }
};

// *goto labelName
// Go to the line labeled with the label command *label labelName
// 
// goto by reference
//   *create foo "labelName"
//   *goto {foo}
Scene.prototype["goto"] = function scene_goto(line) {
    var label;
    if (/[\[\{]/.test(line)) {
      label = this.evaluateReference(this.tokenizeExpr(line));
    } else {
      label = String(line).toLowerCase();
    }
    if (typeof(this.labels[label]) != "undefined") {
        this.lineNum = this.labels[label];
        this.indent = this.getIndent(this.lines[this.lineNum]);
    } else {
        throw new Error(this.lineMsg() + "bad label " + label);
    }
};

Scene.prototype.gosub = function scene_gosub(data) {
    var label = /\S+/.exec(data)[0];
    var rest = data.substring(label.length+1);
    var args = [];
    var stack = this.tokenizeExpr(rest);
    while (stack.length) {
      args.push(this.evaluateValueToken(stack.shift(), stack));
    }
    if (!this.temps.choice_substack) {
      this.temps.choice_substack = [];
    }
    this.temps.choice_substack.push({lineNum: this.lineNum, indent: this.indent});
    // Works exactly the same as gosub_scene, putting args in this.temps.param.
    // This means there's no notion of scope - param acts more like "registers" that
    // get clobbered the next time a sub is called.
    // This may be more intuitive to non-programmers than idea of scope?  Especially
    // if temp normally doesn't follow scoping rules.  gosub_scene can serve this function anyway.
    // The params can be retrieved and put in named temps with "params" command.
    this.temps.param = args;
    this["goto"](label);
};

Scene.prototype.gosub_scene = function scene_gosub_scene(data) {
    if (!this.stats.choice_subscene_stack) {
      this.stats.choice_subscene_stack = [];
    }
    this.stats.choice_subscene_stack.push({name:this.name, lineNum: this.lineNum + 1, indent: this.indent, temps: this.temps});
    this.goto_scene(data);
};

Scene.prototype.params = function scene_params(data) {
    // Name the parameters passed by gosub/gosub_scene.
    // Rules should be the same as for "create."
    // All parameters, even those not named, exposed as param_1, param_2 etc.
    var words = /\w+/.exec(data);
    var nextParamNum = 1;
    this.temps.param_count = this.temps.param.length;
    while (words) {
        var varName = words[0];
        this.validateVariable(varName);
        if (this.temps.param.length < 1) {
            throw new Error(this.lineMsg() + "No parameter passed for " + varName);
        }
        var paramVal = this.temps.param.shift();
        this.temps[varName] = paramVal;
        this.temps["param_" + nextParamNum] = paramVal;
        nextParamNum++;
        data = data.substring(varName.length+1);
        words = /\w+/.exec(data);
    }
    // All remaining params are anonymous, but you still have to say "params"
    // if you want any of them.
    while (this.temps.param.length > 0) {
        var paramVal = this.temps.param.shift();
        this.temps["param_" + nextParamNum] = paramVal;
        nextParamNum++;
    }
};

Scene.prototype["return"] = function scene_return() {
    var stackFrame;
    if (this.temps.choice_substack && this.temps.choice_substack.length) {
      stackFrame = this.temps.choice_substack.pop();
      this.lineNum = stackFrame.lineNum;
      this.indent = stackFrame.indent;
    } else if (this.stats.choice_subscene_stack && this.stats.choice_subscene_stack.length) {
      stackFrame = this.stats.choice_subscene_stack.pop();
      if (stackFrame.name == this.name) {
        this.temps = stackFrame.temps;
        this.lineNum = stackFrame.lineNum-1;
        this.indent = stackFrame.indent;
        return;
      }
      this.finished = true;
      this.skipFooter = true;
      var scene = new Scene(stackFrame.name, this.stats, this.nav, {debugMode:this.debugMode, secondaryMode:this.secondaryMode, saveSlot:this.saveSlot});
      scene.temps = stackFrame.temps;
      scene.screenEmpty = this.screenEmpty;
      scene.prevLine = this.prevLine;
      scene.lineNum = stackFrame.lineNum;
      scene.indent = stackFrame.indent;
      scene.accumulatedParagraph = this.accumulatedParagraph;
      scene.execute();
    } else if (!this.temps.choice_substack && !this.stats.choice_subscene_stack) {
      throw new Error(this.lineMsg() + "invalid return; gosub has not yet been called");
    } else {
      throw new Error(this.lineMsg() + "invalid return; we've already returned from the last gosub");
    }
    
};

// *gotoref expression
// Go to the label identified by the expression
//
// *temp foo
// *set foo "bar"
// *gotoref foo
// Skipped!
// *label bar
Scene.prototype["gotoref"] = function scene_gotoref(expression) {
    var stack = this.tokenizeExpr(expression);
    var value = this.evaluateExpr(stack);
    this["goto"](value);
};


// *finish
// halt the scene
Scene.prototype.finish = function finish(buttonName) {
    this.paragraph();
    this.finished = true;
    var self = this;
    if (this.secondaryMode == "stats") {
      if (typeof window == "undefined") return;
      if (window.forcedScene == "choicescript_stats") return;
      if (window.isAndroidApp && window.statsMode.get()) return;
      printButton(buttonName || "Next", main, false,
        function() {
          clearScreen(loadAndRestoreGame);
        }
      );
      return;
    }
    var nextSceneName = this.nav && nav.nextSceneName(this.name);
    // if there are no more scenes, then just halt
    if (!nextSceneName) {
        if (!this.secondaryMode) this.ending();
        return;
    }
    if (this.screenEmpty) {
      this.goto_scene(nextSceneName);
      return;
    }
    if (!buttonName) buttonName = "Next Chapter";
    buttonName = this.replaceVariables(buttonName);


    printButton(buttonName, main, false,
      function() {
        safeCall(self, function() {
            var scene = new Scene(nextSceneName, self.stats, self.nav, {debugMode:self.debugMode, secondaryMode:self.secondaryMode});
            scene.resetPage();
        });
      }
    );
    if (this.debugMode) println(toJson(this.stats));
};

Scene.prototype.autofinish = function autofinish(buttonName) {
  this.finish(buttonName);
};

// *reset
// clear all stats
Scene.prototype.reset = function reset() {
    this.nav.resetStats(this.stats);
    this.stats.scene = this;
};

Scene.prototype.parseGotoScene = function parseGotoScene(data) {
  var sceneName, label, param = [], stack;

  if (/[\[\{]/.test(data)) {
    stack = this.tokenizeExpr(data);
    sceneName = this.evaluateReference(stack, {toLowerCase: false});
    // Labels are required for arguments to avoid ambiguity
    if (stack.length) {
      label = this.evaluateReference(stack);
    }
    while (stack.length) {
      // Arguments when treating gosub_scene like a function call
      param.push(this.evaluateValueToken(stack.shift(), stack));
    }
  } else {
    // scenes and labels can contain hyphens and other non-expression punctuation
    // so we'll try to extract the first two words as the scene and label
    var match = /(\S+)\s+(\S+)\s*(.*)/.exec(data);
    if (match) {
      sceneName = match[1];
      label = match[2];
      stack = this.tokenizeExpr(match[3]);
      while (stack.length) {
        // Arguments when treating gosub_scene like a function call
        param.push(this.evaluateValueToken(stack.shift(), stack));
      }
    } else {
      if (data === "") throw new Error(this.lineMsg() + "missing scene name");
      sceneName = data;
    }
  }
  return {sceneName:sceneName, label:label, param:param};
};

// *goto_scene foo
//
Scene.prototype.goto_scene = function gotoScene(data) {
    var result = this.parseGotoScene(data);

    if (result.sceneName == this.name) {
      if (typeof result.label === "undefined") {
        this.lineNum = -1; // the printLoop will increment the line number to 0
      } else {
        this["goto"](result.label);
      }
      this.temps = {choice_reuse:"allow", choice_user_restored:false, _choiceEnds:{}};
      this.temps.param = result.param;
      this.initialCommands = true;
      return;
    }

    this.finished = true;
    this.skipFooter = true;
    var scene = new Scene(result.sceneName, this.stats, this.nav, {debugMode:this.debugMode, secondaryMode:this.secondaryMode, saveSlot:this.saveSlot});
    scene.screenEmpty = this.screenEmpty;
    scene.prevLine = this.prevLine;
    scene.accumulatedParagraph = this.accumulatedParagraph;
    if (typeof result.label != "undefined") scene.targetLabel = {label:result.label, origin:this.name, originLine:this.lineNum};
    if (typeof result.param != "undefined") scene.temps.param = result.param;
    scene.execute();
};

// *redirect_scene foo
Scene.prototype.redirect_scene = function redirectScene(data) {
  if (this.secondaryMode != "stats") throw new Error(this.lineMsg() + "The *redirect_scene command can only be used from the stats screen.");
  var args = trim(data).split(/ /);
  var sceneName, label;
  if (args.length == 1) {
    sceneName = data;
  } else {
    sceneName = args[0];
    label = args[1];
  }
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  redirectFromStats(sceneName, label, this.lineNum, function() {
    delete self.secondaryMode;
    self.goto_scene(data);
  });
};

Scene.prototype.product = function product(productId) {
  if (!/^[a-z]+$/.test(productId)) throw new Error(this.lineMsg()+"Invalid product id: " +productId);
  if (this.nav) this.nav.products[productId] = {};
}

Scene.prototype.restore_purchases = function scene_restorePurchases(data) {
  var self = this;
  var target = this.target;
  if (!target) target = document.getElementById('text');
  var button = printButton("Restore Purchases", target, false,
    function() {
      safeCall(self, function() {
          restorePurchases(null, function() {
            self["goto"](data);
            self.finished = false;
            self.resetPage();
          });
      });
    }
  );

  setClass(button, "");
  this.prevLine = "block";
};

Scene.prototype.check_purchase = function scene_checkPurchase(data) {
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  var productList = data.split(/ /);
  for (var i = 0; i < productList.length; i++) {
    var product = productList[i];
    if (!this.nav.products[product] && product != "adfree") {
      throw new Error(this.lineMsg() + "The product " + product + " wasn't declared in a *product command");
    }
  }
  checkPurchase(data, function(ok, result) {
    self.finished = false;
    self.skipFooter = false;
    if (!ok) {
      result = {billingSupported:true};
      self.temps.choice_purchase_error = true;
    }
    result = result || {};
    var products = data.split(/ /);
    var everything = true;
    for (var i = 0; i < products.length; i++) {
      var purchasedProduct = result[products[i]] || false;
      self.temps["choice_purchased_"+products[i]] = purchasedProduct;
      if (!purchasedProduct) everything = false;
    }
    self.temps.choice_purchased_everything = everything;
    self.temps.choice_purchase_supported = !!result.billingSupported;
    self.execute();
  });
};

Scene.prototype.purchase = function purchase_button(data) {
  var result = /^(\w+)\s+(\S+)\s+(.*)/.exec(data);
  if (!result) throw new Error(this.lineMsg() + "invalid line; can't parse purchaseable product: " + data);
  var product = result[1];
  var priceGuess = trim(result[2]);
  var label = trim(result[3]);
  if (!this.nav.products[product] && product != "adfree") {
    throw new Error(this.lineMsg() + "The product " + product + " wasn't declared in a *product command");
  }
  if (typeof this.temps["choice_purchased_"+product] === "undefined") throw new Error(this.lineMsg() + "Didn't check_purchases on this page");
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  getPrice(product, function (price) {
    if (!price || "free" == price) {
      self["goto"](label);
      self.finished = false;
      self.resetPage();
    } else {
      if (price == "guess") price = priceGuess;
      var prerelease = (typeof window !== "undefined" && window.releaseDate && window.isWeb && window.releaseDate > new Date());
      var buttonText;
      if (prerelease) {
        buttonText = "Pre-Order It";
      } else {
        buttonText = "Buy It Now";
      }
      if (price != "hide") {
        buttonText += " for " + price;
      }
      var target = self.target;
      if (!target) target = document.getElementById('text');
      self.paragraph();
      var button = printButton(buttonText, target, false,
        function() {
          safeCall(self, function() {
              purchase(product, function() {
                safeCall(self, function() {
                  self["goto"](label);
                  self.finished = false;
                  self.resetPage();
                });
              });
          });
        }
      );
      self.prevLine = "block";
      if (isRestorePurchasesSupported()) {
        self.prevLine = "text";
        printLink(printParagraph("If you've already purchased, click here to "), "#", "restore purchases",
          function(e) {
            preventDefault(e);
            safeCall(self, function() {
                restorePurchases(product, function(purchased) {
                  if (purchased) {
                    self["goto"](label);
                    self.finished = false;
                    self.resetPage();
                  } else {
                    // refresh, in case we're on web showing a full-screen login. Not necessary on mobile? But, meh.
                    if (!self.secondaryMode) clearScreen(loadAndRestoreGame);
                  }
                });
            });
          }
        );
      }
      
      self.skipFooter = false;
      self.finished = false;
      self.execute();
    }
  });
};

Scene.prototype.purchase_discount = function purchase_discount(line) {
  this.paragraph();
  var args = trim(String(line)).split(" ");
  if (args.length != 5) throw new Error(this.lineMsg() + "expected five arguments, saw "+args.length+": " + line);
  var product = args[0];
  var expectedEndDateString = args[1];
  var expectedEndDate = parseDateStringInCurrentTimezone(expectedEndDateString, this.lineNum+1);
  var fullPriceGuess = this.replaceVariables(args[2]);
  var discountedPriceGuess = this.replaceVariables(args[3]);
  var label = args[4];
  var startsWithDollar = /^\$/;
  if (!startsWithDollar.test(fullPriceGuess)) {
    throw new Error(this.lineMsg() + "full price guess "+fullPriceGuess+"doesn't start with dollar: " + line);
  }
  if (!startsWithDollar.test(discountedPriceGuess)) {
    throw new Error(this.lineMsg() + "discounted price guess "+discountedPriceGuess+"doesn't start with dollar: " + line);
  }
  var prerelease = (typeof window !== "undefined" && window.releaseDate && window.isWeb && window.releaseDate > new Date());
  var discountText;
  if (prerelease) {
    discountText = "[b]Buy now before the price increases![/b]";
  } else {
    discountText = "[b]On sale until "+shortMonthStrings[expectedEndDate.getMonth()+1]+" "+expectedEndDate.getDate()+"! Buy now before the price increases![/b]"
  }
  if (typeof printDiscount != "undefined") {
    printDiscount(product, expectedEndDate.getYear()+1900, expectedEndDate.getMonth()+1, expectedEndDate.getDate(), discountText);
  }
  var priceGuess;
  if (new Date().getTime() < expectedEndDate.getTime()) {
    priceGuess = discountedPriceGuess;
  } else {
    priceGuess = fullPriceGuess;
  }
  this.purchase([product, priceGuess, label].join(" "));
}

Scene.prototype.print_discount = function print_Discount(line) {
  var result = /(\w+) (\d{4})-(\d{2})-(\d{2}) (.*$)/.exec(line);
  if (!result) throw new Error("invalid discount: " + line);
  var product = result[1];
  var fullYear = result[2];
  var oneBasedMonthNumber = parseInt(result[3],10);
  var dayOfMonth = parseInt(result[4],10);
  var discountText = result[5];
  this.temps.choice_discount_ends = "POISONTOKEN";
  discountText = this.replaceVariables(discountText).replace("POISONTOKEN", "${choice_discount_ends}");
  delete this.temps.choice_discount_ends;
  if (typeof printDiscount != "undefined") printDiscount(product, fullYear, oneBasedMonthNumber, dayOfMonth, discountText);
};

// *abort
// halt the scene without showing a button
Scene.prototype.abort = function() {
  this.paragraph();
  this.finished = true;
};

// *create
// create a new permanent stat
Scene.prototype.create = function create(line) {
    var result = /^(\w*)(.*)/.exec(line);
    if (!result) throw new Error(this.lineMsg()+"Invalid create instruction, no variable specified: " + line);
    var variable = result[1];
    this.validateVariable(variable);
    variable = variable.toLowerCase();
    var expr = result[2];
    var stack = this.tokenizeExpr(expr);
    if (stack.length === 0) throw new Error(this.lineMsg()+"Invalid create instruction, no value specified: " + line);
    var self = this;
    function complexError() {
      throw new Error(self.lineMsg()+"Invalid create instruction, value must be a a number, true/false, or a quoted string: " + line);
    }
    if (stack.length > 1) complexError();
    var token = stack[0];
    if (!/STRING|NUMBER|VAR/.test(token.name)) complexError();
    if ("VAR" == token.name && !/^true|false$/i.test(token.value)) complexError();
    if ("STRING" == token.name && /(\$|@)!?!?{/.test(token.value)) throw new Error(this.lineMsg() + "Invalid create instruction, value must be a simple string without ${} or @{}: " + line);
    var value = this.evaluateExpr(stack);
    if (!this.created) this.created = {};
    if (this.created[variable]) throw new Error(this.lineMsg() + "Invalid create. " + variable + " was previously created on line " + this.created[variable]);
    this.created[variable] = this.lineNum + 1;
    this.stats[variable] = value;
    if (this.nav) this.nav.startingStats[variable] = value;
};

// *temp
// create a temporary stat for the current scene
Scene.prototype.temp = function temp(line) {
    var result = /^(\w*)(.*)/.exec(line);
    if (!result) throw new Error(this.lineMsg()+"Invalid temp instruction, no variable specified: " + line);
    var variable = result[1];
    this.validateVariable(variable);
    var expr = result[2];
    var stack = this.tokenizeExpr(expr);
    if (stack.length === 0) {
      this.temps[variable.toLowerCase()] = null;
      return;
    }
    var value = this.evaluateExpr(stack);
    this.temps[variable.toLowerCase()] = value;
};

// retrieve the value of the variable, preferring temp scope
Scene.prototype.getVar = function getVar(variable) {
    var value;
    variable = String(variable).toLowerCase();
    if (variable && !isNaN(1*variable) && String(1*variable) === variable) return 1*variable;
    if (variable == "true") return true;
    if (variable == "false") return false;
    if (variable == "choice_subscribe_allowed") return true;
    if (variable == "choice_register_allowed") return isRegisterAllowed();
    if (variable == "choice_registered") return typeof window != "undefined" && !!window.registered;
    if (variable == "choice_is_web") return typeof window != "undefined" && !!window.isWeb;
    if (variable == "choice_is_steam") return typeof window != "undefined" && !!window.isSteamApp;
    if (variable == "choice_is_ios_app") return typeof window != "undefined" && !!window.isIosApp;
    if (variable == "choice_is_advertising_supported") return typeof isAdvertisingSupported != "undefined" && !!isAdvertisingSupported();
    if (variable == "choice_is_trial") return !!(typeof isTrial != "undefined" && isTrial);
    if (variable == "choice_release_date") {
      if (typeof window != "undefined" && window.releaseDate) {
        return simpleDateTimeFormat(window.releaseDate);
      }
      return "release day";
    }
    if (variable == "choice_prerelease") {
      if (typeof window != "undefined" && window.releaseDate) {
        return new Date() < window.releaseDate.getTime();
      } else {
        return false;
      }
    }
    if (variable == "choice_kindle") return false;
    if (variable == "choice_randomtest") return !!this.randomtest;
    if (variable == "choice_quicktest") return false; // quicktest will explore "false" paths
    if (variable == "choice_restore_purchases_allowed") return isRestorePurchasesSupported();
    if (variable == "choice_save_allowed") return areSaveSlotsSupported();
    if (variable == "choice_time_stamp") return Math.floor(new Date()/1000);
    if (variable == "choice_nightmode") return typeof isNightMode != "undefined" && isNightMode();
    if ((!this.temps.hasOwnProperty(variable))) {
        if ((!this.stats.hasOwnProperty(variable))) {
            throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
        }
        value = this.stats[variable];
        if (value === null || value === undefined) {
            throw new Error(this.lineMsg() + "Variable '"+variable+"' exists but has no value");
        }
        if (this.debugMode) println("stats["+ variable + "]==" + value);
        return value;
    }
    value = this.temps[variable];
    if (value === null || value === undefined) {
        throw new Error(this.lineMsg() + "Variable '"+variable+"' exists but has no value");
    }
    if (this.debugMode) println("temps["+ variable + "]==" + value);
    return value;
};

// set the value of the variable, preferring temp scope
Scene.prototype.setVar = function setVar(variable, value) {
    variable = variable.toLowerCase();
    if (this.debugMode) println(variable +"="+ value);
    if ("undefined" === typeof this.temps[variable]) {
        if ("undefined" === typeof this.stats[variable]) {
            throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
        }
        this.stats[variable] = value;
        if (this.saveSlot == "temp") tempStatWrites[variable] = value;
        // Implicit control flow flag is ideally set just once in startup.
        // Removing these lines makes this not possible with quicktest.
        if (variable == "implicit_control_flow" && this.nav) {
            this.nav.startingStats["implicit_control_flow"] = value;
        }
    } else {
        this.temps[variable] = value;
    }
};

// *delete variable
// deletes the named variable
Scene.prototype["delete"] = function scene_delete(variable) {
    variable = variable.toLowerCase();
    if ("undefined" === typeof this.temps[variable]) {
        if ("undefined" === typeof this.stats[variable]) {
            throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
        }
        delete this.stats[variable];
    } else {
        delete this.temps[variable];
    }
};

// during a choice, recursively parse the options
Scene.prototype.parseOptions = function parseOptions(startIndent, choicesRemaining, expectedSubOptions) {
    // nextIndent: the level of indentation after the current line
    // For example, in the color/toy sample above, we start at 0
    // then the nextIndent is 2 for "red"
    // then the nextIndent is 4 for "spaceship"
    var nextIndent = null;
    var options = [];
    var choiceEnds = [];
    var line;
    var currentChoice = choicesRemaining[0];
    if (!currentChoice) currentChoice = "choice";
    var suboptionsEncountered = false;
    var bodyExpected = false;
    var previousSubOptions;
    var namesEncountered = {};
    var atLeastOneSelectableOption = false;
    var prevOption, ifResult;
    var startingLine = this.lineNum;
    var self = this;
    function removeModifierCommand(stripParethentical) {
      if (stripParethentical) {
        var openParen = line.indexOf("(")+1;
        var closingParen = matchBracket(line, "()", openParen);
        if (closingParen == -1) {
          throw new Error(self.lineMsg() + "missing closing parenthesis");
        }
        line = trim(line.substr(closingParen+1));
      } else {
        line = trim(line.replace(/^\s*\*(\w+)(.*)/, "$2"));
      }
      parsed = /^\s*\*(\w+)(.*)/.exec(line);
      if (parsed) {
        command = parsed[1].toLowerCase();
        data = trim(parsed[2]);
      } else {
        command = "";
      }
    }
    while(isDefined(line = this.lines[++this.lineNum])) {
        if (!trim(line)) {
            this.rollbackLineCoverage();
            continue;
        }
        var indent = this.getIndent(line);
        if (nextIndent === null || nextIndent === undefined) {
            // initialize nextIndent with whatever indentation the line turns out to be
            // ...unless it's not indented at all
            if (indent <= startIndent) {
                throw new Error(this.lineMsg() + "invalid indent, expected at least one '" + currentChoice + "'");
            }
            this.indent = nextIndent = indent;
        }
        if (indent <= startIndent) {
            // it's over!
            // TODO is this error test valid?
            if (choicesRemaining.length>1 && !suboptionsEncountered) {
                throw new Error(this.lineMsg() + "invalid indent, there were subchoices remaining: [" + choicesRemaining.join(",") + "]");
            }
            if (bodyExpected && 
                    (this.temps._fakeChoiceDepth === undefined || this.temps._fakeChoiceDepth < 1)) {
                throw new Error(this.lineMsg() + "Expected choice body");
            }
            if (!atLeastOneSelectableOption) this.conflictingOptions("line " + (startingLine+1) + ": No selectable options");
            if (expectedSubOptions) {
                this.verifyOptionsMatch(expectedSubOptions, options);
            }
            this.rollbackLineCoverage();
            prevOption = options[options.length-1];
            this.lineNum = this.previousNonBlankLineNum();
            if (!prevOption.endLine) prevOption.endLine = this.lineNum+1;
            for (i = 0; i < choiceEnds.length; i++) {
                this.temps._choiceEnds[choiceEnds[i]] = this.lineNum;
            }
            this.rollbackLineCoverage();
            return options;
        }
        if (indent < this.indent) {
            // TODO drift detection
            if (false) /*(indent != nextIndent)*/ {
                // error: indentation has decreased, but not all the way back
                // Example:
                // *choice
                //     red
                //   blue
                throw new Error(this.lineMsg() + "invalid indent, expected "+this.indent+", was " + indent);
            }

            // we must be falling out of a sub-block
            this.dedent(indent);
            this.indent = indent;
        }
        if (indent > this.indent) {
            // body of the choice
            // ...unless we haven't identified our choices yet
            // TODO is this error test valid?
            if (choicesRemaining.length>1) throw new Error(this.lineMsg() + "invalid indent, there were subchoices remaining: [" + choicesRemaining.join(",") + "]");
            this.rollbackLineCoverage();
            bodyExpected = false;
            continue;
        }

        // here's the end of the previous option
        if (options.length) {
          prevOption = options[options.length-1];
          if (!prevOption.endLine) prevOption.endLine = this.lineNum;
        }

        // Execute *if commands (etc.) during option loop
        // sub-commands may modify this.indent
        var parsed = /^\s*\*(\w+)(.*)/.exec(line);
        var unselectable = false;
        var inlineIf = null;
        var selectableIf = null;
        var self = this;

        var overrideDefaultReuseSetting = false;
        var reuse = this.temps.choice_reuse;
        if (parsed) {
            var command = parsed[1].toLowerCase();
            var data = trim(parsed[2]);
            // TODO whitelist commands
            if ("hide_reuse" == command) {
              reuse = "hide";
              overrideDefaultReuseSetting = true;
              removeModifierCommand();
            }
            if ("disable_reuse" == command) {
              reuse = "disable";
              overrideDefaultReuseSetting = true;
              removeModifierCommand();
            }
            if ("allow_reuse" == command) {
              reuse = "allow";
              overrideDefaultReuseSetting = true;
              removeModifierCommand();
            }

            if ("print" == command) {
                line = this.evaluateExpr(this.tokenizeExpr(data));
            } else if ("if" == command) {
              ifResult = this.parseOptionIf(data, command);
              if (ifResult) {
                choiceEnds.push(this.lineNum);
                inlineIf = ifResult.condition;
                if (ifResult.result) {
                  line = ifResult.line;
                } else {
                  continue;
                }
              } else {
                this["if"](data, true /*inChoice*/);
                continue;
              }
            } else if (/^(else|elseif|elsif)$/.test(command)) {
              this[command](data, true /*inChoice*/);
              continue;
            } else if ("selectable_if" == command) {
              ifResult = this.parseOptionIf(data, command);
              if (!ifResult) throw new Error(this.lineMsg() + "Couldn't parse the line after *selectable_if: " + data);
              line = ifResult.line;
              selectableIf = ifResult.condition;
              unselectable = unselectable || !ifResult.result;
            } else if ("comment" == command) {
                continue;
            } else if (!command) {
              // command was rewritten by earlier modifier
            } else {
                if (Scene.validCommands[command]) {
                  throw new Error(this.lineMsg() + "Invalid indent? Expected an #option here, not *"+command);
                }  else {
                    throw new Error(this.lineMsg() + "Non-existent command '"+command+"'");
                }
            }
        }

        if ("allow" != reuse) {
          if (!this.temps.choice_used) this.temps.choice_used = {};
          if (this.temps.choice_used[this.lineNum]) {
            if ("hide" == reuse) continue;
            unselectable = true;
          }
        }

        // this line should be a valid option
        if (!/^\s*\#\s*\S/.test(line)) {
            throw new Error(this.lineMsg() + "Expected option starting with #");
        }
        // replace variables here and discard the result, so error messages display the correct line
        this.replaceVariables(line);
        line = trim(trim(line).substring(1));
        var option = {name:line, group:currentChoice};
        if (reuse != "allow") option.reuse = reuse;
        if (this.displayOptionConditions) {
          option.displayIf = [];
          for (var i = 0; i < this.displayOptionConditions.length; i++) {
            option.displayIf[i] = this.displayOptionConditions[i];
          }
          if (inlineIf) option.displayIf.push(inlineIf);
        } else if (inlineIf) {
          option.displayIf = [inlineIf];
        }
        if (selectableIf) {
          option.selectableIf = selectableIf;
        }
        option.line = this.lineNum + 1;
        if (unselectable) {
          option.unselectable = true;
        }
        if (namesEncountered[line]) {
            this.conflictingOptions(this.lineMsg() + "Invalid option; conflicts with option '"+option.name+"' on line " + namesEncountered[line]);
        } else {
            namesEncountered[line] = option.line;
        }
        options.push(option);
        if (choicesRemaining.length>1) {
            // recursive call will modify this.indent
            option.suboptions = this.parseOptions(this.indent, choicesRemaining.slice(1), previousSubOptions);
            // now restore it
            this.indent = nextIndent;
            if (!previousSubOptions) previousSubOptions = option.suboptions;
            suboptionsEncountered = true;
        } else {
            bodyExpected = true;
        }
        if (!unselectable) atLeastOneSelectableOption = true;
    }
    if (bodyExpected && 
            (this.temps._fakeChoiceDepth === undefined || this.temps._fakeChoiceDepth < 1)) {
        throw new Error(this.lineMsg() + "Expected choice body");
    }
    if (!atLeastOneSelectableOption) this.conflictingOptions("line " + (startingLine+1) + ": No selectable options");
    prevOption = options[options.length-1];
    if (!prevOption.endLine) prevOption.endLine = this.lineNum;
    return options;
};

// compute *if statement during options
Scene.prototype.parseOptionIf = function parseOptionIf(data) {
  var parsed = /^\s*\((.*)\)\s+(#.*)/.exec(data);
  if (!parsed) {
    return;
  }
  var condition = parsed[1];
  var stack = this.tokenizeExpr(condition);
  var result = this.evaluateExpr(stack);
  if (this.debugMode) println(condition + " :: " + result);
  result = bool(result, this.lineNum+1);
  // In the autotester, all conditionals are enabled
  result = result || this.testPath;
  return {result:result, line:parsed[2], condition:null};
};

// Add this as a separate method so we can override it elsewhere
// We want this error during randomtest but not during autotest
// Because autotest makes impossible situations happen
Scene.prototype.conflictingOptions = function conflictingOptions(str) {
  throw new Error(str);
};

// verify that the current option set corresponds to the previous option set
// (for multichoices)
Scene.prototype.verifyOptionsMatch = function verifyOptionsMatch(prev, current) {
    // find matching option by name
    function findMatch(name, options) {
        for (var i = 0; i < options.length; i++) {
            var option = options[i];
            if (option && name == option.name) {
                return option;
            }
        }
        return null;
    }

    var prevOpt, curOpt;
    for (var i = 0; i < prev.length; i++) {
        prevOpt = prev[i];
        curOpt = findMatch(prevOpt.name, current);
        if (!curOpt) throw new Error(this.lineMsg()+"Missing expected suboption '"+prevOpt.name+"'; all suboptions must have same option list");
    }

    if (prev.length == current.length) return;

    for (i = 0; i < current.length; i++) {
        curOpt = current[i];
        prevOpt = findMatch(curOpt.name, prev);
        if (!prevOpt) throw new Error(this.lineMsg()+"Added unexpected suboption '"+curOpt.name+"'; all suboptions must have same option list");
    }

    throw new Error(this.lineMsg()+"Bug? previous options and current options mismatch, but no particular missing element");
};

// render the prompt and the radio buttons
Scene.prototype.renderOptions = function renderOptions(groups, options, callback) {
    var self = this;
    function replaceVars(options) {
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        option.name = self.replaceVariables(option.name);
        if (option.suboptions) replaceVars(option.suboptions);
      }
    }
    replaceVars(options);
    this.paragraph();
    printOptions(groups, options, callback);

    if (this.debugMode) println(toJson(this.stats));

    if (this.finished) printFooter();
};

// *page_break
// pause and prompt the user to press "Next"
Scene.prototype.page_break = function page_break(buttonName) {
    if (this.screenEmpty) return;
    if (!buttonName) buttonName = "Next";
    buttonName = this.replaceVariables(buttonName);
    this.paragraph();
    this.finished = true;

    var self = this;
    printButton(buttonName, main, false,
      function() {
        self.finished = false;
        self.resetPage();
      }
    );
    if (this.debugMode) println(toJson(this.stats));
};

// *line_break
// single line break in the middle of a paragraph
Scene.prototype.line_break = function line_break() {
    // We want to prevent a huge <p><br></p> between blocks
    // so if there's existing text we'll just toss in a [n/]
    // and if there's no text yet, we'll directly insert a <br>
    if (this.accumulatedParagraph.length) {
      this.accumulatedParagraph.push('[n/]');
    } else {
      println();
    }
};

// *image
// display named image
Scene.prototype.image = function image(data, invert) {
    this.paragraph();
    data = data || "";
    data = this.replaceVariables(data);
    var match = /(\S+) (\S+)(.*)/.exec(data);
    var source, alignment;
    var alt = null;
    if (match) {
      var source = match[1];
      var alignment = match[2];
      var alt = trim(match[3]);
    } else {
      source = data;
    }
    if (source === "") throw new Error(this.lineMsg()+"*image requires the file name of an image");
    alignment = alignment || "center";
    if (!/(right|left|center|none)/.test(alignment)) throw new Error(this.lineMsg()+"Invalid alignment, expected right, left, center, or none: " + data);
    printImage(source, alignment, alt, invert);
    if (this.verifyImage) this.verifyImage(source);
    if (alignment == "none") this.prevLine = "text";
    this.screenEmpty = false;
};

Scene.prototype.text_image = function textImage(data) {
  this.image(data, "invert");
}

// *sound
// play named sound file
Scene.prototype.sound = function sound(source) {
    if (typeof playSound == "function") playSound(source);
    if (this.verifyImage) this.verifyImage(source);
};

Scene.prototype.youtube = function youtube(slug) {
  if (typeof printYoutubeFrame !== "undefined") {
    printYoutubeFrame(slug);
    this.prevLine = "block";
    this.screenEmpty = false;
  }
}

// *link
// Display URL with anchor text
Scene.prototype.link = function link(data) {
    var result = /^(\S+)\s*(.*)/.exec(data);
    if (!result) throw new Error(this.lineMsg() + "invalid line; this line should have an URL: " + data);
    var href = result[1].replace(/\]/g, "%5D");
    var anchorText = trim(result[2]) || href;
    this.printLine("[url="+href+"]"+anchorText+"[/url]");
    this.prevLine = "text";
    this.screenEmpty = false;
};

// *link_button
// Display button that takes you to an URL
Scene.prototype.link_button = function linkButton(data) {
    if (typeof window == "undefined") return;
    var result = /^(\S+)\s*(.*)/.exec(data);
    if (!result) throw new Error(this.lineMsg() + "invalid line; this line should have an URL: " + data);
    var href = result[1];
    var anchorText = trim(result[2]) || href;
    this.paragraph();
    var target = this.target;
    if (!target) target = document.getElementById('text');
    printButton(anchorText, target, false, function() {
      window.location.href = href;
    });
    this.prevLine = "empty";
    this.screenEmpty = false;
};

// how many spaces is this line indented?
Scene.prototype.getIndent = function getIndent(line) {
    if (line === null || line === undefined) return 0;
    var spaces = line.match(/^([ \t]*)/);
    if (spaces === null || spaces === undefined) return 0;
    var whitespace = spaces[0];
    var len = whitespace.length;
    if (0 === len) return 0;
    var tab = /\t/.test(whitespace);
    var space = / /.test(whitespace);
    if (tab && space) {
        throw new Error(this.lineMsg()+"Tabs and spaces appear on the same line");
    }
    if (tab) {
        this.firstTab = this.lineNum+1;
        if (this.firstSpace) {
            throw new Error(this.lineMsg()+"Illegal mixing of spaces and tabs; this line has a tab, but there were spaces on line " + this.firstSpace);
        }
    } else {
        this.firstSpace = this.lineNum + 1;
        if (this.firstTab) {
            throw new Error(this.lineMsg()+"Illegal mixing of spaces and tabs; this line has a space, but there were tabs on line " + this.firstTab);
        }
    }
    return len;
};

// *comment ignorable text
Scene.prototype.comment = function comment(line) {
    if (this.debugMode) println("*comment " + line);
};

Scene.prototype.advertisement = function advertisement() {
  if (typeof isFullScreenAdvertisingSupported != "undefined" && isFullScreenAdvertisingSupported()) {
    this.finished = true;
    this.skipFooter = true;

    var self = this;
    showFullScreenAdvertisement(function() {
      self.finished = false;
      self.skipFooter = false;
      self.resetPage();
    });
  }

};

// *looplimit 5
// The number of times a given line is allowed to be accessed
Scene.prototype.looplimit = function looplimit() {}; // TODO looplimit

Scene.prototype.hide_reuse = function hide_reuse() {
  this.temps.choice_reuse = "hide";
};

Scene.prototype.disable_reuse = function disable_reuse() {
  this.temps.choice_reuse = "disable";
};

Scene.prototype.allow_reuse = function allow_reuse() {
  this.temps.choice_reuse = "allow";
};

// *label labelName
// Labels a line for use later in *goto
// Do nothing here; these labels are parsed in this.parseLabel
Scene.prototype.label = function label() {};

// *print expr
// print the value of the specified expression
Scene.prototype.print = function scene_print(expr) {
    var value = this.evaluateExpr(this.tokenizeExpr(expr));
    this.prevLine = "text";
    this.screenEmpty = false;
    this.printLine(value);
};

// *input_text var
// record text typed by the user and store it in the specified variable
Scene.prototype.input_text = function input_text(line) {
    var stack = this.tokenizeExpr(line);
    var variable = this.evaluateReference(stack);
    if ("undefined" === typeof this.temps[variable] && "undefined" === typeof this.stats[variable]) {
      throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
    }

    var inputType = "text";
    if (stack.length == 1 && stack[0].name == "VAR" && stack[0].value == "long") {
      inputType = "textarea";
    }
    if ("undefined" === typeof this.temps[variable] && "undefined" === typeof this.stats[variable]) {
      throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
    }
    this.finished = true;
    this.paragraph();
    var self = this;
    printInput(this.target, inputType, function(value) {
      safeCall(self, function() {
        value = trim(String(value));
        value = value.replace(/\n/g, "[n/]");
        if (self.nav) self.nav.bugLog.push("*input_text " + variable + " " + value);
        self.finished = false;
        self.setVar(variable, value);
        self.resetPage();
      });
    });
    if (this.debugMode) println(toJson(this.stats));
};

// *input_number var min max
// record number typed by the user and store it in the specified variable
Scene.prototype.input_number = function input_number(data) {
    var stack = this.tokenizeExpr(data);
    if (!stack.length) throw new Error(this.lineMsg() + "Invalid input_number statement, expected three args: varname min max");
    var variable = this.evaluateReference(stack);
    if ("undefined" === typeof this.temps[variable] && "undefined" === typeof this.stats[variable]) {
      throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
    }

    var simpleConstants;
    if (stack.length == 2 && stack[0].name == "NUMBER" && stack[1].name == "NUMBER") {
      simpleConstants = true;
    } else {
      simpleConstants = false;
    }

    if (!stack.length) throw new Error(this.lineMsg() + "Invalid input_number statement, expected three args: varname min max");
    var minimum = this.evaluateValueToken(stack.shift(), stack);
    if (isNaN(minimum*1)) throw new Error(this.lineMsg() + "Invalid minimum, not numeric: " + minimum);
    if (!stack.length) throw new Error(this.lineMsg() + "Invalid input_number statement, expected three args: varname min max");

    var maximum = this.evaluateValueToken(stack.shift(), stack);
    if (stack.length) throw new Error(this.lineMsg() + "Invalid input_number statement, expected three args: varname min max");
    if (isNaN(maximum*1)) throw new Error(this.lineMsg() + "Invalid maximum, not numeric: " + maximum);

    // in quicktest, min and max can get mixed up as the interpreter "cheats" on if statements
    // so quicktest will ignore min/max errors unless they're simple constants e.g. *input_number x 6 4
    var checkMinMax = !this.quicktest || simpleConstants;
    if (checkMinMax && parseFloat(minimum) > parseFloat(maximum)) {
      throw new Error(this.lineMsg() + "Minimum " + minimum+ " should not be greater than maximum " + maximum);
    }

    function isInt(x) {
       var y=parseInt(x,10);
       if (isNaN(y)) return false;
       return x==y && x.toString()==y.toString();
    }
    var intRequired;
    if (isInt(minimum) && isInt(maximum)) {
      intRequired = 1;
    }
    this.finished = true;
    this.paragraph();
    var self = this;
    printInput(this.target, "number", function(value) {
      safeCall(self, function() {
        var numValue = parseFloat(""+value);
        if (isNaN(numValue)) {
          asyncAlert("Please type in a number.");
          return;
        }
        if (intRequired && !isInt(value)) {
          asyncAlert("Please type in an integer number.");
          return;
        }
        if (numValue < minimum * 1) {
          asyncAlert("Please use a number greater than or equal to " + minimum);
          return;
        }
        if (numValue > maximum * 1 && !this.quicktest) {
          asyncAlert("Please use a number less than or equal to " + maximum);
          return;
        }
        if (self.nav) self.nav.bugLog.push("*input_number " + variable + " " + value);
        self.finished = false;
        self.setVar(variable, numValue);
        self.resetPage();
      });
    }, minimum, maximum, intRequired);
    if (this.debugMode) println(toJson(this.stats));
};

// *script code
// evaluate the specified ECMAScript
Scene.prototype.script = function script(code) {
    var stats = this.stats;
    var temps = this.temps;
    try {
      if (typeof window == "undefined") {
        (function() {
          var window = _global;
          eval(code);
        }).call(this);
      } else {
        eval(code);
      }
    } catch (e) {
      throw new Error(this.lineMsg() + "error executing *script: " + e + (e.stack ? "\n" + e.stack : ""));
    }
};

// is this a valid variable name?
Scene.prototype.validateVariable = function validateVariable(variable) {
    if (!variable || !/^[a-zA-Z]/.test(variable)) {
        throw new Error(this.lineMsg()+"Invalid variable name, must start with a letter: " + variable);
    }
    if (!/^\w+$/.test(variable)) {
        throw new Error(this.lineMsg()+"Invalid variable name: '" + variable + "'");
    }
    if (/^(and|or|true|false)$/.test(variable)) throw new Error(this.lineMsg()+"Invalid variable name, '" + variable + "' is a reserved word");
    if (/^choice_/.test(variable)) throw new Error(this.lineMsg()+"Invalid variable name, variables may not start with 'choice_'; this is a reserved prefix");
};

// *rand varname min max
// Set varname to a random number from min to max
//
// Example:
// *rand foo 1 6
//   roll a cube die
// *rand foo 1.0 6.0
//   compute a decimal from [1.0,6.0)
Scene.prototype.rand = function rand(data) {
    var stack = this.tokenizeExpr(data);
    if (!stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var variable = this.evaluateReference(stack);
    if ("undefined" === typeof this.temps[variable] && "undefined" === typeof this.stats[variable]) {
      throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
    }

    if (!stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var minimum = this.evaluateValueToken(stack.shift(), stack);
    if (!stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var maximum = this.evaluateValueToken(stack.shift(), stack);
    if (stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var diff;

    diff = maximum - minimum;
    if (isNaN(diff)) {
        throw new Error(this.lineMsg() + "Invalid rand statement, min and max must be numbers");
    }
    if (diff < 0) {
        throw new Error(this.lineMsg() + "Invalid rand statement, min must be less than max: " + minimum + " > " + maximum);
    }
    if (diff === 0) {
      this.setVar(variable, minimum);
      return;
    }
    function isInt(x) {
       var y=parseInt(x,10);
       if (isNaN(y)) return false;
       return x==y && x.toString()==y.toString();
    }
    var result;
    var random = Math.random();
    if (isInt(minimum) && isInt(maximum)) {
        // int random
        result = 1*minimum + Math.floor(random*(diff+1));
    } else {
        result = 1*minimum + random*diff;
    }
    this.setVar(variable, result);
    if (this.randomLog) {
      this.randomLog("*rand " + variable + " " + result);
    }
    if (this.nav) this.nav.bugLog.push("*rand " + variable + " " + result);
};

// *set varname expr
// sets the specified varname to the value of the expr
//
// Examples:
//
// literal
//     literal int: 2
//     literal decimal: 2.3
//     boolean value: true
//     quoted string: "fie"
//         with backslash escaping "she said it was \"ironic\"!"  "c:\\foo"
//     variable name: foo
//
// math
//     +: 2+2
//     -: foo-3
//     *: 2*3
//     /: 8/2
//     if one operand is a string, we'll try to parse it as a number, fail if that doesn't work
//
// fairmath
//     %+: foo%+30
//     %-: foo%-20
//
// concatenate
//     &: "foo"&bar
//
// may omit leading operand
//     *set foo +2
//     *set foo %+30
//     *set foo &"blah blah"
//
// spaces optional
//     *set foo+2
//     *set foo bar + 2
//     *set bar% +30
//
// multiple operators in one line, parentheses mandatory
//     *set foo (foo+2)/4
//     *set foo 2+(foo/2)
//     *set foo (foo/2)+(bar/3)
//     *set foo +(bar/3)
//
// set variable by reference
//
//     *set foo bar
//     *set {foo} 3
//     *comment now bar=3
Scene.prototype.set = function set(line) {
    var stack = this.tokenizeExpr(line);
    var variable = this.evaluateReference(stack);
    if ("undefined" === typeof this.temps[variable] && "undefined" === typeof this.stats[variable]) {
      throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
    }
    if (stack.length === 0) throw new Error(this.lineMsg()+"Invalid set instruction, no expression specified: " + line);
    // if the first token is an operator, then it's implicitly based on the variable
    if (/OPERATOR|FAIRMATH/.test(stack[0].name)) stack.unshift({name:"VAR", value:variable, pos:"(implicit)"});
    var value = this.evaluateExpr(stack);
    this.setVar(variable, value);
};

// *setref variableExpr expr
// just like *set, but variableExpr is a string expression naming a variable reference
//
// Example:
// *set foo "bar"
// *setref foo 3
// *comment now bar=3
Scene.prototype.setref = function setref(line) {
    var stack = this.tokenizeExpr(line);
    var variable = this.evaluateValueToken(stack.shift(), stack);
    variable = String(variable).toLowerCase();

    if ("undefined" === typeof this.temps[variable] && "undefined" === typeof this.stats[variable]) {
      throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
    }

    // if the first token is an operator, then it's implicitly based on the variable
    if (/OPERATOR|FAIRMATH/.test(stack[0].name)) stack.unshift({name:"VAR", value:variable, pos:"(implicit)"});
    var value = this.evaluateExpr(stack);
    this.setVar(variable, value);
};

Scene.prototype.share_this_game = function share_links(now) {
  now = !!trim(now);
  this.paragraph();
  printShareLinks(this.target, now);
  this.prevLine = "empty"; // printShareLinks provides its own paragraph break
};

Scene.prototype.more_games = function more_games(now) {
  if (typeof window == "undefined" || typeof moreGames == "undefined") return;
  if (!!trim(now)) {
    moreGames();
    return;
  }
  var self = this;
  this.paragraph();
  var target = this.target;
  if (!target) target = document.getElementById('text');
  var button = printButton("Play More Games Like This", target, false,
    function() {
      safeCall(self, moreGames);
    }
  );

  setClass(button, "");
  this.prevLine = "block";
};

Scene.prototype.ending = function ending() {
    if (typeof window == "undefined") return;
    this.paragraph();
    var groups = [""];
    options = [];
    options.push({name:"Play again.", group:"choice", restart:true});
    options.push({name:"Play more games like this.", group:"choice", moreGames:true});
    options.push({name:"Share this game with friends.", group:"choice", share:true});
    options.push({name:"Email me when new games are available.", group:"choice", subscribe:true});

    var self = this;
    function endingMenu() {
      printFollowButtons();
      self.renderOptions([""], options, function(option) {
        if (option.restart) {
          clearScreen(function() {
            self.restart();
            if (self.name === "startup") {
              self.finished = false;
              self.resetPage();
            }
          });
          return;
        } else if (option.moreGames) {
          self.more_games("now");
          if (typeof curl != "undefined") curl();
        } else if (option.share) {
          clearScreen(function() {
            self.share_this_game("now");
            endingMenu();
          });
        } else if (option.subscribe) {
          subscribeLink();
        }
      });
    }
    endingMenu();
    this.finished = true;
};

Scene.prototype.restart = function restart() {
  delayBreakEnd();
  if (this.secondaryMode) {
    if (this.secondaryMode == "stats") {
      this.reset();
      this.redirect_scene(this.nav.getStartupScene());
    } else {
      throw new Error(this.lineMsg() + "Cannot *restart in " + this.secondaryMode + " mode");
    }
  } else {
    restartGame();
  }
};

/* Subscribe options, in JSON format.
"now" on mobile means we should immediately mailto: the subscribe address
otherwise, we should display a Subscribe button which launches the mailto:
On non-mailte: platforms, we ignore "now"

"allowContinue" is the default; setting it to false blocks the "No, Thanks"
button and the "Next" button after successfully subscribing
Only Coming Soon pages use "allowContinue"

"message" is the message we'll show to justify subscribing
the default message is: "we'll notify you when our next game is ready!" */
Scene.prototype.subscribe = function scene_subscribe(data) {
  this.paragraph();
  var options = {};
  if (data) {
    try {
      options = JSON.parse(data);
    } catch (e) {
      throw new Error(this.lineMsg() + "Couldn't parse subscribe arguments: " + data);
    }
  }
  this.prevLine = "block";
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  subscribe(this.target, options, function(now) {
    self.finished = false;
    // if "now" actually worked, then continue the scene
    // otherwise, reset the page before continuing
    if (now) {
      self.skipFooter = false;
      self.execute();
    } else {
      self.resetPage();
    }
  });
};

Scene.prototype.restore_game = function restore_game(data) {
  var cancelLabel;
  if (data) {
    var result = /^cancel=(\S+)$/.exec(data);
    if (!result) throw new Error(this.lineMsg() + "invalid restore_game line: " + data);
    cancelLabel = result[1];
  }
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  var unrestorableScenes = this.parseRestoreGame(false/*alreadyFinished*/);
  function renderRestoreMenu(saveList, dirtySaveList) {
    self.paragraph();
    var options = [];
    for (var i = 0; i < saveList.length; i++) {
      var save = saveList[i];
      var date = new Date(save.timestamp*1);
      if (!save) continue;
      var name = "";
      if (save.temps && save.temps.choice_restore_name) name = save.temps.choice_restore_name;
      options.push({name:name + " ("+simpleDateTimeFormat(date)+")", group:"choice", state:save});
    }
    if (false) options.push({name:"Restore using a password.", group:"choice", password:true});
    options.push({name:"Retrieve saved games online from choiceofgames.com.", group:"choice", fetch:true});
    if (dirtySaveList.length) options.push({name:"Upload saved games to choiceofgames.com.", group:"choice", upload:true});
    options.push({name:"Cancel.", group:"choice", cancel:true});
    var groups = [""];
    self.renderOptions(groups, options, function(option) {
      if (option.upload) {
        clearScreen(function() {
          fetchEmail(function(defaultEmail){
            self.printLine("Please type your email address to identify yourself.");
            self.paragraph();
            promptEmailAddress(this.target, defaultEmail, "allowContinue", function(cancel, email) {
              if (cancel) {
                self.finished = false;
                if (typeof cancelLabel !== "undefined") {
                  self["goto"](cancelLabel);
                }
                self.resetPage();
                return;
              }
              clearScreen(function() {
                startLoading();
                submitDirtySaves(dirtySaveList, email, function(ok) {
                  doneLoading();
                  self.prevLine = "text"; // Put some space between the message and the option list
                  if (!ok) {
                    self.printLine("Error uploading saves. Please try again later.");
                    renderRestoreMenu(saveList, dirtySaveList);
                  } else {
                    var count = dirtySaveList.length + (dirtySaveList.length == 1 ? " save" : " saves");
                    self.printLine("Uploaded " + count + ".");
                    renderRestoreMenu(saveList, []);
                  }
                });
              });
            });
          });
        });
      } else if (option.fetch) {
        clearScreen(function() {
          fetchEmail(function(defaultEmail){
            self.printLine("Please type your email address to identify yourself.");
            self.paragraph();
            promptEmailAddress(this.target, defaultEmail, "allowContinue", function(cancel, email) {
              if (cancel) {
                self.finished = false;
                if (typeof cancelLabel !== "undefined") {
                  self["goto"](cancelLabel);
                }
                self.resetPage();
                return;
              }
              clearScreen(function() {
                startLoading();
                getRemoteSaves(email, function (remoteSaveList) {
                  doneLoading();
                  self.prevLine = "text";
                  if (!remoteSaveList) {
                    self.printLine("Error downloading saves. Please try again later.");
                    renderRestoreMenu(saveList, dirtySaveList);
                  } else {
                    mergeRemoteSaves(remoteSaveList, "recordDirty", function(saveList, newRemoteSaves, dirtySaveList) {
                      if (!remoteSaveList.length) {
                        self.printLine("No saves downloaded for email address \""+email+"\". (Is that the correct email address?) If you're having trouble, please contact support at "+getSupportEmail()+".");
                        renderRestoreMenu(saveList, dirtySaveList);
                      } else {
                        var downloadCount = remoteSaveList.length + " saved " + (remoteSaveList.length == 1 ? "game" : "games");
                        var newCount = newRemoteSaves + " new saved " + (newRemoteSaves == 1 ? "game" : "games");
                        self.printLine("Synchronized " + downloadCount + ". Downloaded " + newCount + ".");
                        renderRestoreMenu(saveList, dirtySaveList);
                      }
                    });
                  }
                });
              });
            });
          });
        });
      } else if (option.password) {
        clearScreen(function() {
          self.restore_password();
        });
      } else {
        if (option.cancel) {
          self.finished = false;
          if (typeof cancelLabel !== "undefined") {
            self["goto"](cancelLabel);
          }
          self.resetPage();
        } else {
          var state = option.state;
          var sceneName = null;
          if (state.stats && state.stats.sceneName) sceneName = (""+state.stats.sceneName).toLowerCase();
          var unrestorable = unrestorableScenes[sceneName];

          if (unrestorable) {
            asyncAlert(unrestorable);
            self.finished = false;
            self.resetPage();
            return;
          }

          saveCookie(function() {
            clearScreen(function() {
              restoreGame(state, null, /*userRestored*/true);
            });
          }, "", state.stats, state.temps, state.lineNum, state.indent, this.debugMode, this.nav);
        }
      }
    });
  }
  getDirtySaveList(function(dirtySaveList) {
    getSaves(function(saveList) {
      renderRestoreMenu(saveList, dirtySaveList);
    });
  });
};

Scene.prototype.restore_password = function restore_password() {
  var alreadyFinished = this.finished;
  this.finished = true;
  this.paragraph();
  this.printLine('Please paste your password here, then press "Next" below to continue.');
  this.prevLine = "text";
  this.paragraph();
  var self = this;
  var unrestorableScenes = this.parseRestoreGame(alreadyFinished);
  getPassword(this.target, function (cancel, password) {
    if (cancel) {
      self.finished = false;
      self.resetPage();
      return;
    }
    password = password.replace(/\s/g, "");
    password = password.replace(/^.*BEGINPASSWORD-----/, "");
    var token = self.deobfuscatePassword(password);
    token = token.replace(/^[^\{]*/, "");
    token = token.replace(/[^\}]*$/, "");
    var state;
    try {
      state = jsonParse(token);
    } catch (e) {
      asyncAlert("Sorry, that password was invalid. Please contact " + getSupportEmail() + " for assistance. Be sure to include your password in the email.");
      return;
    }

    var sceneName = null;
    if (state.stats && state.stats.sceneName) sceneName = (""+state.stats.sceneName).toLowerCase();

    var unrestorable = unrestorableScenes[sceneName];
    if (unrestorable) {
      asyncAlert(unrestorable);
      self.finished = false;
      self.resetPage();
      return;
    }

    saveCookie(function() {
      clearScreen(function() {
        // we're going to pretend not to be user restored, so we get reprompted to save
        restoreGame(state, null, /*userRestored*/false);
      });
    }, "", state.stats, state.temps, state.lineNum, state.indent, this.debugMode, this.nav);
  });
  if (alreadyFinished) printFooter();
};

Scene.prototype.parseRestoreGame = function parseRestoreGame(alreadyFinished) {
    if (alreadyFinished) {
      // if we're already finished, the printLoop bumped us an extra line ahead
      this.lineNum--;
      this.rollbackLineCoverage();
    }
    // nextIndent: the level of indentation after the current line
    var nextIndent = null;
    var unrestorableScenes = {};
    var line;
    var startIndent = this.indent;
    while(isDefined(line = this.lines[++this.lineNum])) {
        if (!trim(line)) {
            this.rollbackLineCoverage();
            continue;
        }
        var indent = this.getIndent(line);
        if (nextIndent === null || nextIndent === undefined) {
            // initialize nextIndent with whatever indentation the line turns out to be
            // ...unless it's not indented at all
            if (indent > startIndent) {
                this.indent = nextIndent = indent;
            }
        }
        if (indent <= startIndent) {
            // it's over!
            if (!alreadyFinished) {
              this.lineNum--;
              this.rollbackLineCoverage();
            }
            return unrestorableScenes;
        }
        if (indent != this.indent) {
            // all chart rows are supposed to be at the same indentation level
            // anything at the wrong indentation level might be a mis-indented title/definition
            // or just a typo
            throw new Error(this.lineMsg() + "invalid indent, expected "+this.indent+", was " + indent);
        }

        //
        // *restore_game
        //   ending You can't restore to the ending.

        line = trim(line);
        var result = /^(\w+)\s+(.*)/.exec(line);
        if (!result) throw new Error(this.lineMsg() + "invalid line; this line should have a scene name followed by an error message: " + line);
        var sceneName = result[1].toLowerCase();
        var error = trim(result[2]);
        unrestorableScenes[sceneName] = error;
    }
    if (!alreadyFinished) {
      this.lineNum--;
      this.rollbackLineCoverage();
    }
    return unrestorableScenes;
};

Scene.prototype.check_registration = function scene_checkRegistration() {
  if (typeof window == "undefined" || typeof isRegistered == "undefined") return;
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  isRegistered(function() {
    self.finished = false;
    self.skipFooter = false;
    self.execute();
  });
};

Scene.prototype.login = function scene_login(optional) {
  if (typeof window == "undefined" || typeof loginForm == "undefined") return;
  optional = trim(optional);
  if (optional) {
    if (optional != "optional") throw new Error(this.lineMsg() + "invalid *login option: " + optional);
    optional = 1;
  }
  var self = this;
  this.finished = true;
  this.skipFooter = true;
  this.paragraph();
  var target = this.target;
  if (!target) target = document.getElementById('text');
  loginForm(target, optional, null, function() {
    clearScreen(function() {
      self.finished = false;
      self.prevLine = "empty";
      self.screenEmpty = true;
      self.execute();
    });
  });
};

Scene.prototype.save_game = function save_game(destinationSceneName) {
  if (!destinationSceneName) throw new Error(this.lineMsg()+"*save_game requires a destination file name, e.g. *save_game Episode2");
  if (this.temps.choice_user_restored) return;
  var self = this;
  this.finished = true;
  this.skipFooter = true;
  fetchEmail(function(defaultEmail){
    self.paragraph();
    var form = document.createElement("form");
    setClass(form, "saveGame");

    form.action="#";

    var message = document.createElement("div");
    message.style.color = "red";
    message.style.fontWeight = "bold";
    form.appendChild(message);

    var saveName = document.createElement("input");
    saveName.type="text";
    saveName.name="saveName";
    saveName.setAttribute("placeholder", "Type a name for your saved game");
    saveName.setAttribute("style", "display:block; font-size: 25px; width: 90%; margin: 1rem 0");
    form.appendChild(saveName);

    var hideEmailForm = false;
    // hideEmailForm = _global.automaticCloudStorage;
    if (!hideEmailForm) {
      println("Please login to the choiceofgames.com save system with your email address below.", form);

      var emailInput = document.createElement("input");
      // This can fail on IE
      try { emailInput.type="email"; } catch (e) {}
      emailInput.name="email";
      emailInput.value=defaultEmail;
      emailInput.setAttribute("placeholder", "you@example.com");
      emailInput.setAttribute("style", "display:block; font-size: 25px; width: 90%; margin: 1rem 0");
      form.appendChild(emailInput);

      var subscribeLabel = document.createElement("label");
      subscribeLabel.setAttribute("for", "subscribeBox");
      var subscribeBox = document.createElement("input");
      subscribeBox.type = "checkbox";
      subscribeBox.name = "subscribe";
      subscribeBox.setAttribute("id", "subscribeBox");
      subscribeBox.setAttribute("checked", true);
      subscribeLabel.appendChild(subscribeBox);
      subscribeLabel.appendChild(document.createTextNode("Email me when new games are available."));
      form.appendChild(subscribeLabel);
    }

    var target = this.target;
    if (!target) target = document.getElementById('text');
    target.appendChild(form);
    printButton("Next", form, true);

    printButton("Cancel", target, false, function() {
      clearScreen(function() {
        self.finished = false;
        self.prevLine = "empty";
        self.screenEmpty = true;
        self.execute();
      });
    });

    form.onsubmit = function(e) {
      preventDefault(e);
      safeCall(this, function() {
        var messageText;
        if (!trim(saveName.value)) {
          messageText = document.createTextNode("Please type a name for your saved game.");
          message.innerHTML = "";
          message.appendChild(messageText);
          return;
        }

        var slot = "save" + new Date().getTime();
        // create a clone stats object whose scene name is the destination scene
        var saveStats = {};
        for (var stat in self.stats) {
          if ("scene" == stat) continue;
          saveStats[stat] = self.stats[stat];
        }
        saveStats.scene = {name:destinationSceneName};

        if (hideEmailForm) {
          clearScreen(function() {
            saveCookie(function() {
              recordSave(slot, function() {
                self.finished = false;
                self.prevLine = "empty";
                self.screenEmpty = true;
                self.execute();
              });
            }, slot, saveStats, {choice_reuse:"allow", choice_user_restored:true, choice_restore_name:saveName.value}, 0, 0, false, self.nav);
          });
          return;
        }

        var shouldSubscribe = subscribeBox.checked;
        var email = trim(emailInput.value);
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          messageText = document.createTextNode("Sorry, \""+email+"\" is not an email address.  Please type your email address again.");
          message.innerHTML = "";
          message.appendChild(messageText);
          return;
        }
        
        recordEmail(email, function() {
          clearScreen(function() {
            saveCookie(function() {
              recordSave(slot, function() {
                startLoading();
                submitRemoteSave(slot, email, shouldSubscribe, function(ok) {
                  doneLoading();
                  if (!ok) {
                    asyncAlert("Couldn't upload your saved game to choiceofgames.com. You can try again later from the Restore menu.", function() {
                      self.finished = false;
                      self.prevLine = "empty";
                      self.screenEmpty = true;
                      self.execute();
                    });
                  } else {
                    self.finished = false;
                    self.prevLine = "empty";
                    self.screenEmpty = true;
                    self.execute();
                  }
                });
              });
            }, slot, saveStats, {choice_reuse:"allow", choice_user_restored:true, choice_restore_name:saveName.value}, 0, 0, false, self.nav);
          });
        });
      });
    };

    printFooter();
  });
};

Scene.prototype.show_password = function show_password() {
  if (this.temps.choice_user_restored) return;
  this.paragraph();
  if (typeof(window) != "undefined" && !window.isMobile) {
    this.printLine('Please copy and paste the password in a safe place, then press "Next" below to continue.');
    println("", this.target);
    println("", this.target);
  }
  var password = computeCookie(this.stats, this.temps, this.lineNum, this.indent);
  password = this.obfuscate(password);
  showPassword(this.target, password);
  this.prevLine = "block";
};

Scene.prototype.obfuscate = function obfuscate(password) {
  var self = this;
  return password.replace(/./g,
    function(x) {
      var y = self.obfuscator[x];
      return y;
    }
  );
};

// The obfuscator must take US-ASCII and obfuscate it
// for use in a password.  This password will be sent via
// HTML email and its whitespace handling will be unpredictable,
// So we can't output any of these characters: [ <>&]
// Since we're losing four characters of output, we JSON-escape
// four characters of input [^`|~].
Scene.prototype.obfuscator = {
  " ": "k",
  "!": "E",
  "\"": "`",
  "#": "\\",
  "$": "r",
  "%": "J",
  "&": "o",
  "'": "0",
  "(": "Z",
  ")": "M",
  "*": "G",
  "+": "t",
  ",": "Y",
  "-": "f",
  ".": "2",
  "/": "!",
  "0": "i",
  "1": "*",
  "2": "1",
  "3": "3",
  "4": "[",
  "5": "6",
  "6": "v",
  "7": "\"",
  "8": "F",
  "9": "9",
  ":": "{",
  ";": "Q",
  "<": "?",
  "=": "5",
  ">": "#",
  "?": "K",
  "@": "/",
  "A": "=",
  "B": "N",
  "C": "z",
  "D": "$",
  "E": "W",
  "F": "(",
  "G": ")",
  "H": "q",
  "I": "C",
  "J": "+",
  "K": "U",
  "L": ".",
  "M": "H",
  "N": "B",
  "O": "S",
  "P": "X",
  "Q": "I",
  "R": "-",
  "S": "m",
  "T": "D",
  "U": "^",
  "V": "A",
  "W": "a",
  "X": "y",
  "Y": ",",
  "Z": "d",
  "[": "O",
  "\\": "s",
  "]": "8",
  "^": "sVii6h",
  "_": "]",
  "`": "sViivi",
  "a": "4",
  "b": "g",
  "c": "%",
  "d": "w",
  "e": "h",
  "f": "n",
  "g": "b",
  "h": "7",
  "i": "x",
  "j": "~",
  "k": "_",
  "l": "l",
  "m": ":",
  "n": "c",
  "o": "L",
  "p": "j",
  "q": "u",
  "r": "R",
  "s": "}",
  "t": "p",
  "u": "V",
  "v": "P",
  "w": "'",
  "x": "T",
  "y": "|",
  "z": "@",
  "{": "e",
  "|": "sVii\"%",
  "}": ";",
  "~": "sVii\"h"
};
Scene.prototype.deobfuscator = {
  "k": " ",
  "E": "!",
  "`": "\"",
  "\\": "#",
  "r": "$",
  "J": "%",
  "o": "&",
  "0": "'",
  "Z": "(",
  "M": ")",
  "G": "*",
  "t": "+",
  "Y": ",",
  "f": "-",
  "2": ".",
  "!": "/",
  "i": "0",
  "*": "1",
  "1": "2",
  "3": "3",
  "[": "4",
  "6": "5",
  "v": "6",
  "\"": "7",
  "F": "8",
  "9": "9",
  "{": ":",
  "Q": ";",
  "?": "<",
  "5": "=",
  "#": ">",
  "K": "?",
  "/": "@",
  "=": "A",
  "N": "B",
  "z": "C",
  "$": "D",
  "W": "E",
  "(": "F",
  ")": "G",
  "q": "H",
  "C": "I",
  "+": "J",
  "U": "K",
  ".": "L",
  "H": "M",
  "B": "N",
  "S": "O",
  "X": "P",
  "I": "Q",
  "-": "R",
  "m": "S",
  "D": "T",
  "^": "U",
  "A": "V",
  "a": "W",
  "y": "X",
  ",": "Y",
  "d": "Z",
  "O": "[",
  "s": "\\",
  "8": "]",
  "]": "_",
  "4": "a",
  "g": "b",
  "%": "c",
  "w": "d",
  "h": "e",
  "n": "f",
  "b": "g",
  "7": "h",
  "x": "i",
  "~": "j",
  "_": "k",
  "l": "l",
  ":": "m",
  "c": "n",
  "L": "o",
  "j": "p",
  "u": "q",
  "R": "r",
  "}": "s",
  "p": "t",
  "V": "u",
  "P": "v",
  "'": "w",
  "T": "x",
  "|": "y",
  "@": "z",
  "e": "{",
  ";": "}"
};

Scene.prototype.deobfuscatePassword = function deobfuscatePassword(password) {
  var self = this;
  password = password.replace(/./g,
    function(x) {
      var y = self.deobfuscator[x];
      return y;
    }
  );
  return password;
};

Scene.prototype.stat_chart = function stat_chart() {
  this.paragraph();
  var rows = this.parseStatChart();
  var target = this.target;
  if (!target) target = document.getElementById('text');

  var barWidth = 0;
  var standardFontSize = 0;

  function fixFontSize(span1, span2) {
    if (!standardFontSize) {
      if (window.getComputedStyle) {
        standardFontSize = parseInt(getComputedStyle(document.body).fontSize, 10);
      } else if (document.body.currentStyle) {
        standardFontSize = parseInt(document.body.currentStyle.fontSize, 10);
      } else {
        standardFontSize = 16;
      }
    }
    if (!barWidth) barWidth = span1.parentNode.offsetWidth;
    var spanMaxWidth, biggestSpanWidth;
    if (span2) {
      spanMaxWidth = barWidth / 2 - 1; /* minus one as a fudge factor; why is this needed? */
      biggestSpanWidth = Math.max(span1.offsetWidth, span2.offsetWidth);
    } else {
      spanMaxWidth = barWidth;
      biggestSpanWidth = span1.offsetWidth;
    }

    if (biggestSpanWidth > spanMaxWidth) {
      var newSize = Math.floor(standardFontSize * spanMaxWidth / biggestSpanWidth);
      span1.parentNode.style.fontSize = newSize + "px";
      if (window.getComputedStyle) {
        // on Android, if the user is using non-standand styles, browser may try to ignore our font setting
        var actual = parseInt(getComputedStyle(span1).fontSize, 10);
        if (actual > newSize) {
          newSize *= newSize / actual;
          span1.parentNode.style.fontSize = newSize + "px";
        }
      }
    }

  }

  for (i = 0; i < rows.length; i++) {
    var row = rows[i];
    var type = row.type;
    var variable = row.variable;
    var value = this.evaluateExpr(this.tokenizeExpr(variable));
    var label = this.replaceVariables(row.label);
    var definition = this.replaceVariables(row.definition || "");

    var statWidth, div, span, statValue;
    if (type == "text") {
      div = document.createElement("div");
      setClass(div, "statText");
      span = document.createElement("span");
      if (trim(label) || trim(value)) {
        printx(label + ": " + value, span);
      } else {
        // unofficial line_break
        printx(" ", span);
      }
      div.appendChild(span);
      target.appendChild(div);
    } else if (type == "percent") {
      div = document.createElement("div");
      setClass(div, "statBar statLine");
      span = document.createElement("span");
      printx("\u00a0\u00a0"+label+": "+value+"%", span);
      div.appendChild(span);
      statValue = document.createElement("div");
      setClass(statValue, "statValue");
      statValue.style.width = value+"%";
      statValue.innerHTML = "&nbsp;";
      div.appendChild(statValue);
      target.appendChild(div);
      fixFontSize(span);
    } else if (type == "opposed_pair") {
      div = document.createElement("div");
      setClass(div, "statBar statLine opposed");
      span0 = document.createElement("span");
      printx("\u00a0\u00a0"+label+": "+value+"% ", span0);
      div.appendChild(span0);
      span = document.createElement("span");
      span.setAttribute("style", "float: right");
      printx(this.replaceVariables(row.opposed_label)+": "+(100-value)+"%\u00a0\u00a0", span);
      div.appendChild(span);
      statValue = document.createElement("div");
      setClass(statValue, "statValue");
      statValue.style.width = value+"%";
      statValue.innerHTML = "&nbsp;";
      div.appendChild(statValue);
      target.appendChild(div);
      fixFontSize(span0, span);
    } else {
      throw new Error("Bug! Parser accepted an unknown row type: " + type);
    }
  }
  this.prevLine = "block";
  this.screenEmpty = false;
};

Scene.prototype.parseStatChart = function parseStatChart() {
    // nextIndent: the level of indentation after the current line
    var nextIndent = null;
    var rows = [];
    var line, line1, line2, line2indent;
    var startIndent = this.indent;
    while(isDefined(line = this.lines[++this.lineNum])) {
        if (!trim(line)) {
            this.rollbackLineCoverage();
            continue;
        }
        var indent = this.getIndent(line);
        if (nextIndent === null || nextIndent === undefined) {
            // initialize nextIndent with whatever indentation the line turns out to be
            // ...unless it's not indented at all
            if (indent <= startIndent) {
                throw new Error(this.lineMsg() + "invalid indent, expected at least one row");
            }
            this.indent = nextIndent = indent;
        }
        if (indent <= startIndent) {
            // it's over!
            this.rollbackLineCoverage();
            this.lineNum = this.previousNonBlankLineNum();
            this.rollbackLineCoverage();
            return rows;
        }
        if (indent != this.indent) {
            // all chart rows are supposed to be at the same indentation level
            // anything at the wrong indentation level might be a mis-indented title/definition
            // or just a typo
            throw new Error(this.lineMsg() + "invalid indent, expected "+this.indent+", was " + indent);
        }

        //
        // *stat_chart
        //   text wounds Wounds
        //     Definition
        //   percent Infamy Infamy
        //     Definition
        //   opposed_pair brutality
        //     Brutality
        //       Strength and cruelty
        //     Finesse
        //       Precision and aerial maneuverability
        //

        // TODO opposed_pair
        // TODO definitions
        // TODO variable substitutions
        // TODO *if/*else
        // TODO *line_break
        line = trim(line);
        var result = /^(text|percent|opposed_pair)\s+(.*)/.exec(line);
        if (!result) throw new Error(this.lineMsg() + "invalid line; this line should start with 'percent', 'text', or 'opposed_pair'");
        var type = result[1].toLowerCase();
        var data = trim(result[2]);
        if ("opposed_pair" == type) {
          this.getVar(data);
          line1 = this.lines[++this.lineNum];
          this.replaceVariables(line1);
          line1indent = this.getIndent(line1);
          if (line1indent <= this.indent) throw new Error(this.lineMsg() + "invalid indent; expected at least one indented line to indicate opposed pair name. indent: " + line1indent + ", expected greater than " + this.indent);
          line2 = this.lines[this.lineNum + 1];
          line2indent = this.getIndent(line2);
          if (line2indent <= this.indent) {
            // line1 was the only line
            rows.push({type: type, variable: data, label: data, opposed_label: trim(line1)});
          } else {
            this.lineNum++;
            this.replaceVariables(line2);
            if (line2indent == line1indent) {
              // two lines: first label, second label
              rows.push({type: type, variable: data, label: trim(line1), opposed_label: trim(line2)});
            } else if (line2indent > line1indent) {
              // line 2 is a definition; therefore the opposed_label and its definition must be on lines 3 and 4
              var line1definition = line2;
              var line3 = this.lines[++this.lineNum];
              this.replaceVariables(line3);
              var line3indent = this.getIndent(line3);
              if (line3indent != line1indent) throw new Error(this.lineMsg() + "invalid indent; this line should be the opposing label name. expected " + line1indent + " was " + line3indent);
              var line4 = this.lines[++this.lineNum];
              this.replaceVariables(line4);
              var line4indent = this.getIndent(line4);
              if (line4indent != line2indent) throw new Error(this.lineMsg() + "invalid indent; this line should be the opposing label definition. expected " + line2indent + " was " + line4indent);
              rows.push({type: type, variable: data, label: trim(line1), definition:trim(line2), opposed_label: trim(line3), opposed_definition: trim(line4)});
            } else {
              throw new Error(this.lineMsg() + "invalid indent; expected a second line with indent " + line1indent + " to match line " + this.lineNum + ", or else no more opposed_pair lines");
            }
          }
        } else {
          var variable, label;
          if (!/ /.test(data)) {
            variable = data;
            label = data;
          } else if (/^\(/.test(data)) {
            var parens = 0;
            var closingParen = -1;
            for (var i = 1; i < data.length; i++) {
              var c = data.charAt(i);
              if (c === "(") {
                parens++;
              } else if (c === ")") {
                if (parens) {
                  parens--;
                } else {
                  closingParen = i;
                  break;
                }
              }
            }
            if (closingParen == -1) {
              throw new Error(this.lineMsg() + "missing closing parenthesis");
            }
            variable = data.substring(1, closingParen);
            label = trim(data.substring(closingParen+1))
            if (label === "") {
              label = variable;
            }
          } else {
            result = /^(\S+) (.*)/.exec(data);
            if (!result) throw new Error(this.lineMsg() + "Bug! can't find a space when a space was found");
            variable = result[1];
            label = result[2];
          }
          this.evaluateExpr(this.tokenizeExpr(variable));
          this.replaceVariables(label);
          line2 = this.lines[this.lineNum + 1];
          line2indent = this.getIndent(line2);
          if (line2indent <= this.indent) {
            // No definition line
            rows.push({type: type, variable: variable, label: label});
          } else {
            this.lineNum++;
            this.replaceVariables(line2);
            rows.push({type: type, variable: variable, label: label, definition: trim(line2)});
          }
        }
    }
    return rows;
};

// *timer Dec 25, 2016 9:30:00 PDT
Scene.prototype.timer = function(dateString) {
  var end;
  if (dateString == "release") {
    if (typeof window === "undefined" || !window.releaseDate) return;
    end = window.releaseDate/1000;
  } else {
    end = Date.parse(dateString)/1000;
  }
  var now = new Date()/1000;
  if (now < end) {
    var target = this.target;
    if (!target) {
      target = document.createElement("p");
      document.getElementById('text').appendChild(target);
    }
    var self = this;
    showTicker(target, end, function() {
      clearScreen(loadAndRestoreGame());
    });
  }
}

// *delay_break 1200
Scene.prototype.delay_break = function(durationInSeconds) {
  if (isNaN(durationInSeconds * 1)) throw new Error(this.lineMsg() + "invalid duration");
  this.finished = true;
  this.skipFooter = true;
  var target = this.target;
  if (!target) {
    target = document.createElement("p");
    document.getElementById('text').appendChild(target);
  }
  this.paragraph();
  var self = this;
  delayBreakStart(function(delayStart) {
    window.blockRestart = true;
    var endTimeInSeconds = durationInSeconds * 1 + delayStart * 1;
    showTicker(target, endTimeInSeconds, function() {
      printButton("Next", target, false, function() {
        delayBreakEnd();
        self.finished = false;
        self.resetPage();
      });
    });
    printFooter();
  });
};

// *delay_ending 1200 $2.99 $0.99
Scene.prototype.delay_ending = function(data) {
  // Steam doesn't do delay breaks and especially not skiponce
  if (typeof window != "undefined" && !!window.isSteamApp) {
    return this.ending();
  }
  var args = data.split(/ /);
  var durationInSeconds = args[0];
  var fullPriceGuess = args[1];
  var singleUsePriceGuess = args[2];
  if (isNaN(durationInSeconds * 1)) throw new Error(this.lineMsg() + "invalid duration");
  if (!/^\$/.test(fullPriceGuess)) throw new Error(this.lineMsg() + "invalid fullPriceGuess: \""+fullPriceGuess+"\"");
  if (singleUsePriceGuess && !/^\$/.test(singleUsePriceGuess)) throw new Error(this.lineMsg() + "invalid singleUsePriceGuess: \""+singleUsePriceGuess+"\"");
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  checkPurchase("adfree", function(ok, result) {
    if (result.adfree || !result.billingSupported) {
      self.ending();
      return;
    }
    getPrice("adfree", function (fullPrice) {
      if (fullPrice == "guess") fullPrice = fullPriceGuess;
      getPrice("skiponce", function (singleUsePrice) {
        if (singleUsePrice == "guess") singleUsePrice = singleUsePriceGuess;

        options = [];
        var finishedWaiting = {name: "Play again after a short wait. ", unselectable: true};
        options.push(finishedWaiting);
        var upgradeSkip = {name: "Upgrade to the unlimited version for " + fullPrice + " to skip the wait forever."};
        options.push(upgradeSkip);
        var skipOnce = {name: "Skip the wait one time for " + singleUsePrice + "."};
        if (singleUsePriceGuess) options.push(skipOnce);
        var restorePurchasesOption = {name: "Restore purchases from another device."};
        if (isRestorePurchasesSupported()) options.push(restorePurchasesOption);
        var playMoreGames = {name: "Play more games like this."};
        options.push(playMoreGames);
        var emailMe = {name: "Email me when new games are available."};
        options.push(emailMe);
        
        self.paragraph();
        printOptions([""], options, function(option) {
          if (option == playMoreGames) {
            self.more_games("now");
            if (typeof curl != "undefined") curl();
          } else if (option == emailMe) {
            subscribeLink();
          } else if (option == upgradeSkip) {
            purchase("adfree", function() {
              safeCall(self, function() {
                self.restart();
              });
            });
          } else if (option == skipOnce) {
            purchase("skiponce", function() {
              safeCall(self, function() {
                self.restart();
              });
            });
          } else if (option == restorePurchasesOption) {
            restorePurchases("adfree", function() {
              clearScreen(loadAndRestoreGame);
            });
          } else {
            self.restart();
          }
        });

        var target = document.getElementById("0").parentElement;

        delayBreakStart(function(delayStart) {
          window.blockRestart = true;
          var endTimeInSeconds = durationInSeconds * 1 + delayStart * 1;
          showTicker(target, endTimeInSeconds, function() {
            clearScreen(function() {
              self.ending();
            });
          });
          printFooter();
        });
      });
    });
  });

};

// *if booleanExpr
// execute different code depending on whether the booleanExpr is true or false
//
// Examples:
// *if bool-expression
//     blah
//     blah
// *elseif bool-expression
//     blah
//     blah
// *else
//     blah
//     blah
// bool-expression
//     by reference
//         *set foo true
//         *if foo ...
//     equality
//         foo=2
//         foo="blah"
//         2="2"
//             true
//     inequality
//         foo>2
//         foo<2
//         foo<=2
//         foo>=2
//     and/or logic, parentheses mandatory
//         (foo=2) or (foo=3)
//         ((foo>4) and (foo<8)) or (bar=0)
//
// NOTE: *if commands may be used inside *choices, to make some choices conditionally available
Scene.prototype["if"] = function scene_if(line) {
    var stack = this.tokenizeExpr(line);
    var result = this.evaluateExpr(stack);
    if (this.debugMode) println(line + " :: " + result);
    result = bool(result, this.lineNum+1);
    if (result) {
        // "true" branch, just go on to the next line
        this.indent = this.getIndent(this.nextNonBlankLine());
    } else {
        // "false" branch; skip over the true branch
        this.skipTrueBranch(false);
    }
};

// TODO Rename this function to just skipBranch
Scene.prototype.skipTrueBranch = function skipTrueBranch(inElse) {
  var startIndent = this.indent;
  var nextIndent = null;
  while (isDefined(line = this.lines[++this.lineNum])) {
      this.rollbackLineCoverage();
      if (!trim(line)) continue;
      var indent = this.getIndent(line);
      if (nextIndent === null || nextIndent === undefined) {
          if (indent <= startIndent) throw new Error(this.lineMsg() + "invalid indent, expected at least one line in 'if' true block");
          nextIndent = indent;
      }
      if (indent <= startIndent) {
          // true block is over
          var parsed;
          // check to see if this is an *else or *elseif
          if (indent == startIndent) parsed = /^\s*\*(\w+)(.*)/.exec(line);
          if (!parsed || inElse) {
              this.lineNum = this.previousNonBlankLineNum();
              this.rollbackLineCoverage();
              this.indent = indent;
              return;
          }
          var command = parsed[1].toLowerCase();
          var data = trim(parsed[2]);
          if ("else" == command) {
              if (data) {
                if (/^if\b/.test(data)) {
                  throw new Error(this.lineMsg() + "'else if' is invalid, use 'elseif'");
                }
                throw new Error(this.lineMsg() + "nothing should appear on a line after 'else': " + data);
              }
              this.lineNum = this.lineNum; // code coverage
              // go on to the next line
              this.indent = this.getIndent(this.nextNonBlankLine());
          } else if (/^else?if$/.test(command)) {
              this.lineNum = this.lineNum; // code coverage
              this["if"](data);
          } else {
              this.lineNum = this.previousNonBlankLineNum();
              this.rollbackLineCoverage();
              this.indent = this.getIndent(this.nextNonBlankLine());
          }
          return;
      }
      if (indent < nextIndent) {
          // *if foo
          //      foo
          //    bar
          throw new Error(this.lineMsg() + "invalid indent, expected "+nextIndent+", was " + indent);
      }
  }
};

Scene.prototype["else"] = Scene.prototype.elsif = Scene.prototype.elseif = function scene_else(data, inChoice) {
    // Authors can avoid using goto to get out of an if branch with:  *set implicit_control_flow true
    // This avoids the error message at the end of the function.
    if (inChoice || this.stats["implicit_control_flow"]) {
      this.skipTrueBranch(true);
      return;
    }
    throw new Error(this.lineMsg() + "It is illegal to fall in to an *else statement; you must *goto or *finish before the end of the indented block.");
};

// break the string up into a stack of tokens, defined in Scene.tokens below
Scene.prototype.tokenizeExpr = function tokenizeExpr(str) {
    var stack = [];
    var tokenTypes = Scene.tokens;
    var tokenTypesLength = tokenTypes.length;
    var pos = 0;
    while (str) {
        var matched = false;
        for (var i = 0; i < tokenTypesLength; i++) {
            var tokenType = tokenTypes[i];
            var token = tokenType.test(str, this.lineNum+1);
            if (token) {
                matched = true;
                str = str.substr(token.length);
                pos += token.length;
                var item = {name:tokenType.name, value:token, pos:pos};
                if ("WHITESPACE" == tokenType.name) {
                    break;
                } else if ("CURLY_QUOTE" == tokenType.name) {
                  throw new Error(this.lineMsg()+"Invalid use of curly smart quote: " + token + "\nUse straight quotes \" instead")
                } else if ("FUNCTION" == tokenType.name) {
                  item.func = /^\w+/.exec(token)[0];
                }
                stack.push(item);
                break;
            }
        }
        if (!matched) throw new Error(this.lineMsg()+"Invalid expression, couldn't extract another token: " + str);
    }
    return stack;
};

// evaluate the stack of tokens
// parenthetical == true if we're evaluating a parenthetical expression
// all expressions consist of either a "singleton" value (2) or two values and one operator (2+2)
Scene.prototype.evaluateExpr = function evaluateExpr(stack, parenthetical) {
    if (!stack.length) {
        throw new Error(this.lineMsg() + "no expression specified");
    }
    var self = this;
    function getToken() {
        var token = stack.shift();
        if (!token) throw new Error(self.lineMsg() + "null token");
        return token;
    }

    var token, value1, value2, operator, result;

    value1 = this.evaluateValueToken(getToken(), stack);

    if (!stack.length) {
        if (parenthetical) {
            throw new Error(this.lineMsg() + "Invalid expression, expected " + parenthetical);
        }
        return value1;
    }

    token = getToken();

    if (parenthetical && parenthetical == token.name) {
        return value1;
    }

    // Since this isn't a singleton, it must be an operator
    operator = Scene.operators[token.value];
    if (!operator) {
      throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected OPERATOR"+
        (parenthetical?" or " + parenthetical : "")+
        ", was: " + token.name + " [" + token.value + "]");
    }

    if (token.value === '%') {
      this.warning("this is a bare % sign, which should be replaced with %+, %-, or modulo if you're really advanced.");
      this.warning("For more details on modulo, see: https://forum.choiceofgames.com/t/21176");
    }

    if (!stack[0]) {
      throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected something after a "+token.value);
    }

    if (stack[0].func == "auto") {
      value2 = this.autobalance(stack, token, value1);
    } else {
      value2 = this.evaluateValueToken(getToken(), stack);
    }

    // and do the operator
    result = operator(value1, value2, this.lineNum+1, this);

    if (parenthetical) {
        // expect close parenthesis
        if (stack.length) {
            token = getToken();
            if (parenthetical == token.name) {
                return result;
            } else {
                throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected "+parenthetical+", was: " + token.name + " [" + token.value + "]");
            }
        } else {
            throw new Error(this.lineMsg() + "Invalid expression, expected " + parenthetical);
        }
    } else {
        // if not parenthetical, expect no more tokens
        if (stack.length) {
            token = getToken();
            throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected no more tokens, found: " + token.name + " [" + token.value + "]");
        } else {
            return result;
        }
    }
    throw new Error(this.lineMsg() + "bug, how did I get here?");
};

// turn a number, string, or var token into its value
// or, if this is an open parenthesis, evaluate the parenthetical expression
Scene.prototype.evaluateValueToken = function evaluateValueToken(token, stack) {
    var name = token.name;
    var value;
    if ("OPEN_PARENTHESIS" == name) {
        return this.evaluateExpr(stack, "CLOSE_PARENTHESIS");
    } else if ("OPEN_CURLY" == name) {
        value = this.evaluateExpr(stack, "CLOSE_CURLY");
        return this.getVar(value);
    } else if ("FUNCTION" == name) {
        if (!this.functions[token.func]) throw new Error(this.lineMsg + "Unknown function " + token.func);
        value = this.evaluateExpr(stack, "CLOSE_PARENTHESIS");
        return this.functions[token.func].call(this, value);
    } else if ("NUMBER" == name) {
        return token.value;
    } else if ("STRING" == name) {
        // strip off the quotes and unescape backslashes
        return this.replaceVariables(token.value.slice(1,-1).replace(/\\(.)/g, "$1"));
    } else if ("VAR" == name) {
        var variable = String(token.value);
        while (stack.length && stack[0].name == "OPEN_SQUARE") {
          stack.shift();
          variable += "_" + this.evaluateExpr(stack, "CLOSE_SQUARE");
        }
        return this.getVar(variable);
    } else {
        throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected NUMBER, STRING, VAR or PARENTHETICAL, was: " + name + " [" + token.value + "]");
    }
};

// turn a var token into its name, remove it from the stack
// or if it's a curly parenthesis, evaluate that
// or if it's an array expression, convert it into its raw underscore name
Scene.prototype.evaluateReference = function evaluateReference(stack, options) {
  var toLowerCase = true;
  if (options && options.hasOwnProperty("toLowerCase")) toLowerCase = !!options.toLowerCase;
  function findClosingBracket(stack, type, offset) {
    if (!offset) offset = 0;
    var opens = 0;
    var openType = "OPEN_"+type;
    var closeType = "CLOSE_"+type;
    for (var i = offset; i < stack.length; i++) {
      if (stack[i].name == openType) {
        opens++;
      } else if (stack[i].name == closeType) {
        if (opens) {
          opens--;
        } else {
          return i;
        }
      }
    }
    return -1;
  }
  function normalizeCase(name) {
    if (toLowerCase) {
      return String(name).toLowerCase();
    } else {
      return name;
    }
  }
  if (!stack.length) throw new Error(this.lineMsg()+"Invalid expression, expected a name");
  var name;
  if (stack[0].name === "OPEN_CURLY") {
    stack.shift();
    var closingCurly = findClosingBracket(stack, "CURLY");
    if (closingCurly == -1) throw new Error(this.lineMsg()+"Invalid expression, no closing curly bracket: " + data);
    name = this.evaluateExpr(stack.slice(0, closingCurly));
    stack.splice(0, closingCurly+1);
    return normalizeCase(name);
  } else if (stack[0].name === "NUMBER") {
    // you could have a label that's just a number
    name = stack[0].value;
    stack.shift();
    return name;
  } else {
    if (stack[0].name !== "VAR") throw new Error(this.lineMsg() + "Invalid expression; expected name, found " + stack[0].name + " at char " + stack[0].pos);
    name = String(stack[0].value);
    stack.shift();
    while(stack.length && stack[0].name == "OPEN_SQUARE") {
      var closingBracket = findClosingBracket(stack, "SQUARE", 1);
      if (closingBracket == -1) throw new Error(this.lineMsg()+"Invalid expression, no closing array bracket at char " + stack[1].pos);
      var index = this.evaluateExpr(stack.slice(1, closingBracket));
      name += "_" + index;
      stack.splice(0, closingBracket+1);
    }
    return normalizeCase(name);
  }
};

Scene.prototype.functions = {
  not: function(value) {
    return !bool(value, this.lineNum+1);
  },
  round: function(value) {
    if (isNaN(value*1)) throw new Error(this.lineMsg()+"round() value is not a number: " + value);
    return Math.round(value);
  },
  timestamp: function(value) {
    return Date.parse(value)/1000;
  },
  log: function(value) {
    if (isNaN(value*1)) throw new Error(this.lineMsg()+"log() value is not a number: " + value);
    return Math.log(value)/Math.log(10);
  },
  length: function(value) {
    return String(value).length;
  },
  auto: function() {
    throw new Error(this.lineMsg()+"Invalid expression, auto() must come after a < or > symbol");
  }
};

Scene.prototype.autobalance = function autobalance(stack, operatorToken, value) {
  if (operatorToken.name !== "INEQUALITY") {
    throw new Error(this.lineMsg()+"Invalid expression, auto() must come after a < or > symbol");
  }
  stack.shift(); // remove auto function

  if (stack.length < 4 ||
    stack[0].name !== "NUMBER" ||
    stack[1].name !== "COMMA" ||
    !(stack[2].name == "VAR" || stack[2].name == "NUMBER") ||
    stack[3].name !== "CLOSE_PARENTHESIS"
  ) {
    throw new Error(this.lineMsg()+"Invalid expression, auto() requires (percentage, id)");
  }
  var rateString = stack.shift().value;
  var rate = parseFloat(rateString);
  if (isNaN(rate) || rate < 1 || rate > 99) {
    throw new Error(this.lineMsg()+"the first auto() parameter should be a number between 1 and 99: " + rateString);
  }
  stack.shift(); // comma
  var id = stack.shift().value;
  stack.shift(); // close parenthesis
  var result = this.stats['auto' + '_' + this.name + '_' + id];
  if (typeof result != "undefined") {
    return result;
  } else if (this.recordBalance) {
    return this.recordBalance(value, operatorToken.value, rate, id);
  }
  return 50;
}

Scene.prototype.evaluateValueExpr = function evaluateValueExpr(expr) {
    var stack = this.tokenizeExpr(expr);
    var token = stack.shift();
    if (!token) throw new Error(this.lineMsg() + "null token");
    var value = this.evaluateValueToken(token, stack);
    if (stack.length) {
        token = stack.shift();
        if (!token) throw new Error(this.lineMsg() + "null token");
        throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected no more tokens, found: " + token.name + " [" + token.value + "]");
    }
    return value;
};

Scene.prototype.goto_random_scene = function gotoRandomScene(data) {
  var parsed = this.parseGotoRandomScene(data);
  var allowReuseGlobally = /\ballow_reuse\b/.test(data);
  var allowNoSelection = /\ballow_no_selection\b/.test(data);
  var option = this.computeRandomSelection(Math.random(), parsed, allowReuseGlobally);

  if (option) {
    this.goto_scene(option.name);
  } else {
    if (allowNoSelection) {
      return;
    } else {
      throw new Error(this.lineMsg() + "No selectable scenes");
    }
  }

};

Scene.prototype.parseGotoRandomScene = function parseGotoRandomScene(data) {
    data = data || "";
    var directives = data.split(" ");
    var allowReuseGlobally = false;
    var allowNoSelection = false;
    for (var i = 0; i < directives; i++) {
      var directive = trim(directives[i]);
      if (!directive) continue;
      if (directive == "allow_reuse") {
        allowReuseGlobally = true;
      } else if (directive == "allow_no_selection") {
        allowNoSelection = true;
      } else {
        throw new Error(this.lineMsg() + "invalid command: '" + directive + "'");
      }
    }

    // nextIndent: the level of indentation after the current line
    var nextIndent = null;
    var options = [];
    var line;
    var startIndent = this.indent;
    while(isDefined(line = this.lines[++this.lineNum])) {
        if (!trim(line)) {
            this.rollbackLineCoverage();
            continue;
        }
        var indent = this.getIndent(line);
        if (nextIndent === null || nextIndent === undefined) {
            // initialize nextIndent with whatever indentation the line turns out to be
            // ...unless it's not indented at all
            if (indent <= startIndent) {
                throw new Error(this.lineMsg() + "invalid indent, expected at least one line in *goto_random_scene");
            }
            this.indent = nextIndent = indent;
        }
        if (indent <= startIndent) {
            // it's over!
            this.rollbackLineCoverage();
            this.lineNum--;
            this.rollbackLineCoverage();
            break;
        }
        if (indent != this.indent) {
            // all chart rows are supposed to be at the same indentation level
            // anything at the wrong indentation level might be a mis-indented title/definition
            // or just a typo
            throw new Error(this.lineMsg() + "invalid indent, expected "+this.indent+", was " + indent);
        }
        line = trim(line);

        var option = {allowReuse:allowReuseGlobally};
        var command;
        while(!!(command = /^\*(\S+)/.exec(line))) {
          command = command[1];
          if ("allow_reuse" == command) {
            option.allowReuse = true;
            line = trim(line.substring("*allow_reuse".length));
            command = /^\*(\S+)/.exec(line);
            continue;
          } else if ("if" == command) {
            var conditional = /^\*if\s+\((.+)\)\s+([^\)]+)/.exec(line);
            if (!conditional) throw new Error(this.lineMsg() + " invalid *if, expected () followed by scene name: " + line);
            line = conditional[2];
            var stack = this.tokenizeExpr(conditional[1]);
            this.evaluateExpr(stack);
            option.conditional = conditional[1];
          } else {
            throw new Error(this.lineMsg() + " invalid command: " + line);
          }
        }
        // TODO weights
        option.name = trim(line);
        options.push(option);
    }
    return options;
};

Scene.prototype.computeRandomSelection = function computeRandomSelection(randomFloat, options, allowReuseGlobally) {
  var filtered = [];
  var finished = {};
  if (!allowReuseGlobally) {
    if (!this.stats.choice_grs) this.stats.choice_grs = [];
  }
  var grs = this.stats.choice_grs;
  for (var i = 0; i < grs.length; i++) {
    finished[grs[i]] = 1;
  }
  var option;
  for (i = 0; i < options.length; i++) {
    option = options[i];
    if (!option.allowReuse) {
      if (finished[option.name]) continue;
    }
    if (option.conditional) {
      var stack = this.tokenizeExpr(option.conditional);
      var pass = this.evaluateExpr(stack);
      if (!pass) continue;
    }
    filtered.push(option);
  }
  if (!filtered.length) return null;
  // TODO weights
  var randomSelection = Math.floor(randomFloat*filtered.length);
  option = filtered[randomSelection];
  if (!option.allowReuse) {
    this.stats.choice_grs.push(option.name);
  }
  return option;
};

Scene.prototype.end_trial = function endTrial() {
  this.paragraph();
  printLink(this.target, "#", "Start Over from the Beginning", function(e) {
    preventDefault(e);
    return restartGame("prompt");
  });
  this.prevLine = "block";
  this.screenEmpty = false;
  this.finished = true;
};

Scene.prototype.achieve = function scene_achieve(name) {
  name = name.toLowerCase();
  if (!this.nav.achievements.hasOwnProperty(name)) {
    throw new Error(this.lineMsg() + "the achievement name "+name+" was not declared as an *achievement in startup");
  }
  var achievement = this.nav.achievements[name];
  this.nav.achieved[name] = true;
  if (typeof window != "undefined" && typeof achieve != "undefined") {
    achieve(name, achievement.title, achievement.earnedDescription);
  }
};

Scene.prototype.check_achievements = function scene_checkAchievements() {
  var self = this;
  function callback(immediately) {
    for (var achievement in nav.achievements) {

      self.temps["choice_achieved_"+achievement] = nav.achieved.hasOwnProperty(achievement);
    }
    if (!immediately) {
      self.finished = false;
      self.skipFooter = false;
      self.execute();
    }
  }
  if (typeof checkAchievements == "undefined") {
    callback("immediately");
  } else {
    this.finished = true;
    this.skipFooter = true;
    checkAchievements(callback);
  }
};

Scene.prototype.scene_list = function scene_list() {
  var scenes = this.parseSceneList();
  this.nav.setSceneList(scenes);
};

Scene.prototype.parseSceneList = function parseSceneList() {
  var nextIndent = null;
  var scenes = [];
  var line;
  var startIndent = this.indent;
  while(isDefined(line = this.lines[++this.lineNum])) {
      if (!trim(line)) {
          this.rollbackLineCoverage();
          continue;
      }
      var indent = this.getIndent(line);
      if (nextIndent === null || nextIndent === undefined) {
          // initialize nextIndent with whatever indentation the line turns out to be
          // ...unless it's not indented at all
          if (indent <= startIndent) {
              throw new Error(this.lineMsg() + "invalid indent, expected at least one row");
          }
          this.indent = nextIndent = indent;
      }
      if (indent <= startIndent) {
          // it's over!
          this.rollbackLineCoverage();
          this.lineNum--;
          this.rollbackLineCoverage();
          return scenes;
      }
      if (indent != this.indent) {
          // all scenes are supposed to be at the same indentation level
          throw new Error(this.lineMsg() + "invalid indent, expected "+this.indent+", was " + indent);
      }

      line = trim(line);
      var purchaseMatch = /^\$(\w*)\s+(.*)/.exec(line);
      if (purchaseMatch) {
        line = purchaseMatch[2];
      }
      if (!scenes.length && "startup" != String(line).toLowerCase()) scenes.push("startup");
      scenes.push(line);
  }
  return scenes;
};

Scene.prototype.title = function scene_title(title) {
  if (typeof changeTitle != "undefined") {
    changeTitle(title);
  }
};

Scene.prototype.author = function scene_author(author) {
  if (typeof changeAuthor != "undefined") {
    changeAuthor(author);
  }
};

// *achievement name hidden|visible 100 Achievement Title
//     Earned description
//     Pre-earned description
Scene.prototype.achievement = function scene_achievement(data) {
  var parsed = /(\S+)\s+(\S+)\s+(\S+)\s+(.*)/.exec(data);
  if (!parsed) throw new Error(this.lineMsg() + "Invalid *achievement, requires short name, visibility, points, and display title: " + data);
  var achievementName = parsed[1];
  if (!/^[a-z][a-z0-9_]+$/.test(achievementName)) throw new Error(this.lineMsg()+"Invalid achievement name: " +achievementName);

  if (this.nav.achievements.hasOwnProperty(achievementName)) {
    // this achievement already exists...
    var preExisting = this.nav.achievements[achievementName];
    if (!preExisting.lineNumber || preExisting.lineNumber == (this.lineNum+1)) {
      // restarting/randomtest will naturally re-run *achievements; ignore those
      // blow away pre-existing mygame.js achievements
      this.nav.achievements = {};
      this.nav.achievementList = [];
      this.achievementTotal = 0;
      this.seenAchievementTitles = {};
    } else {
      // don't allow redefining achievements
      throw new Error(this.lineMsg()+"Achievement "+achievementName+" already defined on line " + this.nav.achievements[achievementName].lineNumber);
    }
  }

  var lineNumber = this.lineNum+1;
  var visibility = parsed[2];
  if (visibility != "hidden" && visibility != "visible") {
    throw new Error(this.lineMsg()+"Invalid *achievement, the second word should be either 'hidden' or 'visible': " +visibility);
  }
  var visible = (visibility != "hidden");
  var pointString = parsed[3];
  if (!/[1-9][0-9]*/.test(pointString)) {
    throw new Error(this.lineMsg()+"Invalid *achievement, the third word should be an integer number of points: " + pointString);
  }
  var points = parseInt(pointString, 10);
  if (points > 100) throw new Error(this.lineMsg()+"Invalid *achievement, no achievement may be worth more than 100 points: " + points);
  if (points < 1) throw new Error(this.lineMsg()+"Invalid *achievement, no achievement may be worth less than 1 point: " + points);
  if (!this.achievementTotal) this.achievementTotal = 0;
  this.achievementTotal += points;
  if (this.achievementTotal > 1000) {
    throw new Error(this.lineMsg()+"Invalid achievements. Adding " + points + " would add up to more than 1,000 points: " + this.achievementTotal);
  }
  var title = parsed[4];
  if (/(\$\{)/.test(title)) throw new Error(this.lineMsg()+"Invalid *achievement. ${} not permitted in achievement title: " + title);
  if (/(\@\{)/.test(title)) throw new Error(this.lineMsg()+"Invalid *achievement. @{} not permitted in achievement title: " + title);
  if (/(\[)/.test(title)) throw new Error(this.lineMsg()+"Invalid *achievement. [] not permitted in achievement title: " + title);
  if (title.length > 50) throw new Error(this.lineMsg()+"Invalid *achievement. Title must be 50 characters or fewer: " + title);

  // Get the description from the next indented line
  var line = this.lines[++this.lineNum];
  var indent = this.getIndent(line);
  if (!indent) {
    throw new Error(this.lineMsg()+"Invalid *achievement. An indented description is required.");
  }
  var preEarnedDescription = trim(line);
  if (/(\$\{)/.test(preEarnedDescription)) throw new Error(this.lineMsg()+"Invalid *achievement. ${} not permitted in achievement description: " + preEarnedDescription);
  if (/(\@\{)/.test(preEarnedDescription)) throw new Error(this.lineMsg()+"Invalid *achievement. @{} not permitted in achievement description: " + preEarnedDescription);
  if (/(\[)/.test(preEarnedDescription)) throw new Error(this.lineMsg()+"Invalid *achievement. [] not permitted in achievement description: " + preEarnedDescription);
  if (preEarnedDescription.length > 200) throw new Error(this.lineMsg()+"Invalid *achievement. Pre-earned description must be 200 characters or fewer: " + preEarnedDescription);

  if (!visible) {
    if (preEarnedDescription.toLowerCase() != "hidden") throw new Error(this.lineMsg()+"Invalid *achievement. Hidden achievements must set their pre-earned description to 'hidden'.");
  }

  // Optionally get a post-earned description from the next line
  var postEarnedDescription = null;
  while(isDefined(line = this.lines[++this.lineNum])) {
    if (trim(line)) break;
    this.rollbackLineCoverage();
  }
  indent = this.getIndent(line);
  if (indent) {
    postEarnedDescription = trim(line);
    if (/(\$\{)/.test(postEarnedDescription)) throw new Error(this.lineMsg()+"Invalid *achievement. ${} not permitted in achievement description: " + postEarnedDescription);
    if (/(\@\{)/.test(postEarnedDescription)) throw new Error(this.lineMsg()+"Invalid *achievement. @{} not permitted in achievement description: " + postEarnedDescription);
    if (/(\[)/.test(postEarnedDescription)) throw new Error(this.lineMsg()+"Invalid *achievement. [] not permitted in achievement description: " + postEarnedDescription);
    if (postEarnedDescription.length > 200) throw new Error(this.lineMsg()+"Invalid *achievement. Post-earned description must be 200 characters or fewer: " + postEarnedDescription);
  } else {
    // No indent means the next line is not a post-earned description
    this.rollbackLineCoverage();
    this.lineNum--;
    this.rollbackLineCoverage();
  }

  if (!postEarnedDescription) {
    if (!visible) throw new Error(this.lineMsg()+"Invalid *achievement. Hidden achievements must set a post-earned description.");
    postEarnedDescription = preEarnedDescription;
  }

  if (!this.nav.achievements.hasOwnProperty(achievementName)) {
    this.nav.achievementList.push(achievementName);
    if (this.nav.achievementList.length > 100) {
      throw new Error(this.lineMsg()+"Too many *achievements. Each game can have up to 100 achievements.");
    }
  }

  if (!this.seenAchievementTitles) this.seenAchievementTitles = {};

  if (this.seenAchievementTitles[title]) {
    throw new Error(this.lineMsg()+"An achievement with display title \"" + title + "\" was already defined at line " + this.seenAchievementTitles[title]);
  }

  this.seenAchievementTitles[title] = this.lineNum+1;

  this.nav.achievements[achievementName] = {
    visible: visible,
    points: points,
    title: title,
    earnedDescription: postEarnedDescription,
    preEarnedDescription: preEarnedDescription,
    lineNumber: lineNumber
  };

  if (typeof setButtonTitles != "undefined") setButtonTitles();
};


Scene.prototype.bug = function scene_bug(message) {
  if (message) {
    message = "Bug: " + this.replaceVariables(message);
  } else {
    message = "Bug";
  }
  throw new Error(this.lineMsg() + message);
};

Scene.prototype.warning = function scene_warning(message) {
  // quicktest implements this
}

Scene.prototype.feedback = function scene_feedback() {
  if (typeof window == "undefined" || this.randomtest) return;
  this.paragraph();
  this.printLine("On a scale from 1 to 10, how likely are you to recommend this game to a friend?");
  this.paragraph();
  var options = [{name:"10 (Most likely)"}];
  for (var i = 9; i > 1; i--) {
    options.push({name:i});
  }
  options.push({name:"1 (Least likely)"});
  options.push({name:"No response."});
  var self = this;
  this.renderOptions([""], options, function(option) {
    var value = "null";
    var numberMatch = /^(\d+)/.exec(option.name);
    if (numberMatch) value = numberMatch[1]*1;
    if (window.storeName) xhrAuthRequest("POST", "feedback", function(ok, response) {
      if (window.console) console.log("ok", ok, response);
    }, "game", window.storeName, "platform", platformCode(), "rating", value);
    self.finished = false;
    self.resetPage();
  });
  this.finished = true;
};

Scene.prototype.parseTrackEvent = function(data) {
  var event = {};
  var stack = this.tokenizeExpr(data);
  if (!stack.length) throw new Error(this.lineMsg() + "Invalid track_event statement, expected at least two args: category and action");
  event.category = this.evaluateValueToken(stack.shift(), stack);
  if (!stack.length) throw new Error(this.lineMsg() + "Invalid track_event statement, expected at least two args: category and action");
  event.action = this.evaluateValueToken(stack.shift(), stack);
  if (stack.length) {
    event.label = this.evaluateValueToken(stack.shift(), stack);
    if (stack.length) {
      event.value = this.evaluateValueToken(stack.shift(), stack);
      if (stack.length) {
        throw new Error(this.lineMsg() + "Invalid track_event statement, expected at most four args: category, action, label, value");
      }
      var intValue = parseInt(event.value, 10);
      if (isNaN(intValue) || event.value != intValue || event.value.toString() != intValue.toString()) {
        throw new Error(this.lineMsg() + "Invalid track_event statement, value must be an integer: " + event.value);
      }
    }
  }
  return event;
}

Scene.prototype.track_event = function track_event(data) {
  var event = this.parseTrackEvent(data);
  if (typeof ga !== "undefined") {
    ga('send', 'event', event.category, event.action, event.label, event.value);
  }
}

Scene.prototype.lineMsg = function lineMsg() {
    return this.name + " line " + (this.lineNum+1) + ": ";
};

Scene.prototype.rollbackLineCoverage = function() {};

Scene.baseUrl = "scenes";
Scene.regexpMatch = function regexpMatch(str, re) {
    var result = re.exec(str);
    if (!result) return null;
    return result[0];
};
// Each token has a name and a test, which returns the matching string
Scene.tokens = [
    {name:"OPEN_PARENTHESIS", test:function(str){ return Scene.regexpMatch(str,/^\(/); } },
    {name:"CLOSE_PARENTHESIS", test:function(str){ return Scene.regexpMatch(str,/^\)/); } },
    {name:"OPEN_CURLY", test:function(str){ return Scene.regexpMatch(str,/^\{/); } },
    {name:"CLOSE_CURLY", test:function(str){ return Scene.regexpMatch(str,/^\}/); } },
    {name:"OPEN_SQUARE", test:function(str){ return Scene.regexpMatch(str,/^\[/); } },
    {name:"CLOSE_SQUARE", test:function(str){ return Scene.regexpMatch(str,/^\]/); } },
    {name:"FUNCTION", test:function(str){ return Scene.regexpMatch(str,/^(not|round|timestamp|log|length|auto)\s*\(/); } },
    {name:"NUMBER", test:function(str){ return Scene.regexpMatch(str,/^\d+(\.\d+)?\b/); } },
    {name:"STRING", test:function(str, line) {
            var i;
            if (!/^\"/.test(str)) return null;
            for (i = 1; i < str.length; i++) {
                var x = str.charAt(i);
                if ("\\" == x) {
                    i++;
                } else if ('"' == x) {
                    return str.substring(0,i+1);
                }
            }
            throw new Error("line "+line+": Invalid string, open quote with no close quote: " + str);
        }
    },
    {name:"CURLY_QUOTE", test:function(str){ return Scene.regexpMatch(str,/^[\u201c\u201d]/); } },
    {name:"WHITESPACE", test:function(str){ return Scene.regexpMatch(str,/^\s+/); } },
    {name:"NAMED_OPERATOR", test:function(str){ return Scene.regexpMatch(str,/^(and|or|modulo)\b/); } },
    {name:"VAR", test:function(str){ return Scene.regexpMatch(str,/^\w*/); } },
    {name:"FAIRMATH", test:function(str){ return Scene.regexpMatch(str,/^%[\+\-]/); } },
    {name:"OPERATOR", test:function(str){ return Scene.regexpMatch(str,/^[\+\-\*\/\&\%\^\#]/); } },
    {name:"INEQUALITY", test:function(str){ return Scene.regexpMatch(str,/^[\!<>]\=?/); } },
    {name:"EQUALITY", test:function(str){ return Scene.regexpMatch(str,/^=/); } },
    {name:"COMMA", test:function(str){ return Scene.regexpMatch(str,/^,/); } }
    //
];
Scene.operators = {
    "+": function add(v1,v2,line) { return num(v1,line) + num(v2,line); },
    "-": function subtract(v1,v2,line) { return num(v1,line) - num(v2,line); },
    "*": function multiply(v1,v2,line) { return num(v1,line) * num(v2,line); },
    "/": function divide(v1,v2,line) {
      v2 = num(v2, line);
      if (v2 === 0) throw new Error("line "+line+": can't divide by zero");
      return num(v1,line) / num(v2,line);
    },
    "%": function modulo(v1,v2,line) { return num(v1,line) % num(v2,line); },
    "^": function exponent(v1,v2,line) { return Math.pow(num(v1,line), num(v2,line)); },
    "&": function concatenate(v1,v2) { return [v1,v2].join(""); },
    "#": function charAt(v1,v2,line) {
      var i = num(v2,line);
      if (i < 1) {
        throw new Error("line "+line+": There is no character at position " + i + "; the position must be greater than or equal to 1.");
      }
      if (i > String(v1).length) {
        throw new Error("line "+line+": There is no character at position " + i + ". \""+v1+"\" is only " + String(v1).length + " characters long.");
      }
      return String(v1).charAt(i-1);
    },
    "%+": function fairAdd(v1, v2, line) {
        v1 = num(v1,line);
        v2 = num(v2,line);
        var validValue = (v1 >= 0 && v1 <= 100);
        if (!validValue) {
            throw new Error("line "+line+": Can't fairAdd to non-percentile value: " + v1);
        }
        if (v2 > 0) {
          var multiplier = (100 - v1) / 100;
          var actualModifier = v2 * multiplier;
          var value = 1 * v1 + actualModifier;
          value = Math.floor(value);
          if (value > 99) value = 99;
          return value;
        } else {
          var multiplier = v1 / 100;
          var actualModifier = (0-v2) * multiplier;
          var value = v1 - actualModifier;
          value = Math.ceil(value);
          if (value < 1) value = 1;
          return value;
        }
    },
    "%-": function fairSubtract(v1, v2, line) {
        v2 = num(v2,line);
        return Scene.operators["%+"](v1,0-v2,line);
    },
    "=": function equals(v1,v2) { return v1 == v2 || String(v1) == String(v2); },
    "<": function lessThan(v1,v2,line) {
        return num(v1,line) < num(v2,line); },
    ">": function greaterThan(v1,v2,line) { return num(v1,line) > num(v2,line); },
    "<=": function lessThanOrEquals(v1,v2,line) { return num(v1,line) <= num(v2,line); },
    ">=": function greaterThanOrEquals(v1,v2,line) { return num(v1,line) >= num(v2,line); },
    "!=": function notEquals(v1,v2) { return v1 != v2; },
    "and": function and(v1, v2, line) {
        return bool(v1,line) && bool(v2,line);
    },
    "or": function or(v1, v2, line) {
        return bool(v1,line) || bool(v2,line);
    },
    "modulo": function modulo(v1,v2,line) { return num(v1,line) % num(v2,line); },
};

Scene.initialCommands = {"create":1,"scene_list":1,"title":1,"author":1,"comment":1,"achievement":1,"product":1};

Scene.validCommands = {"comment":1, "goto":1, "gotoref":1, "label":1, "looplimit":1, "finish":1, "abort":1,
    "choice":1, "create":1, "temp":1, "delete":1, "set":1, "setref":1, "print":1, "if":1, "rand":1,
    "page_break":1, "line_break":1, "script":1, "else":1, "elseif":1, "elsif":1, "reset":1,
    "goto_scene":1, "fake_choice":1, "input_text":1, "ending":1, "share_this_game":1, "stat_chart":1,
    "subscribe":1, "show_password":1, "gosub":1, "return":1, "hide_reuse":1, "disable_reuse":1, "allow_reuse":1,
    "check_purchase":1,"restore_purchases":1,"purchase":1,"restore_game":1,"advertisement":1,
    "feedback":1,
    "save_game":1,"delay_break":1,"image":1,"link":1,"input_number":1,"goto_random_scene":1,
    "restart":1,"more_games":1,"delay_ending":1,"end_trial":1,"login":1,"achieve":1,"scene_list":1,"title":1,
    "bug":1,"link_button":1,"check_registration":1,"sound":1,"author":1,"gosub_scene":1,"achievement":1,
    "check_achievements":1,"redirect_scene":1,"print_discount":1,"purchase_discount":1,"track_event":1,
    "timer":1,"youtube":1,"product":1,"text_image":1,"params":1
    };
