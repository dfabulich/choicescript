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
function Scene(name, stats, nav, debugMode) {
    if (!name) name = "";
    if (!stats) stats = {};
    // the name of the scene
    this.name = name;
    
    // the permanent statistics and the temporary values
    this.stats = stats;
    this.temps = {choice_reuse:"allow", choice_user_restored:false};
    
    // the navigator determines which scene comes next
    this.nav = nav;
    
    // should we print debugging information?
    this.debugMode = debugMode || false;
    
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
    this.prevLineEmpty = true;
    
    // Have we ever printed any text?
    this.screenEmpty = true;

    this.stats.sceneName = name;

    // for easy reachability from the window
    this.stats.scene = this;
    
    // where should we print text?
    this.target = null;
}

Scene.prototype.reexecute = function reexecute() {
  this.lineNum = this.stats.testEntryPoint || 0;
  this.finished = 0;
  this.indent = this.getIndent(this.lines[this.lineNum]);
  this.prevLineEmpty = true;
  this.screenEmpty = true;
  this.execute();
}

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
        this.indent = indent;
        if (!this.runCommand(line)) {
            if (/^\s*#/.test(line)) {
                if (this.temps.fakeChoiceEnd) {
                    this.rollbackLineCoverage();
                    this.lineNum = this.temps.fakeChoiceEnd;
                    this.rollbackLineCoverage();
                    delete this.temps.fakeChoiceEnd;
                    continue;
                } else {
                    throw new Error(this.lineMsg() + "It is illegal to fall out of a *choice statement; you must *goto or *finish before the end of the indented block.");
                }
            }
            this.prevLineEmpty = false;
            this.screenEmpty = false;
            this.printLine(trim(line));
            printx(' ', this.target);
        }
    }
    this.rollbackLineCoverage();
    if (!this.finished) {
        this.autofinish();
    }
	this.save(null, "temp");
    if (this.skipFooter) {
        this.skipFooter = false;
    } else {
        printFooter();
    }
}

Scene.prototype.dedent = function dedent(newDent) {};

Scene.prototype.printLine = function printLine(line, parent) {
    if (!line) return null;
    line = this.replaceVariables(line);
    if (!parent) parent = this.target;
    return printx(line, parent);
}

Scene.prototype.replaceVariables = function (line) {
  if (!line.replace) line = new String(line);
  var self = this;
  // replace ${variables} with values
  line = line.replace(/\$(\!?\!?)\{([a-zA-Z][_\w]*)\}/g, function (matched, capitalize, variable) {
    var value = self.getVar(variable);
    if (capitalize == "!") {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (capitalize == "!!") {
      value = value.toUpperCase();
    }
    return value;
  });
  // double-check for unreplaced/invalid ${} expressions
  var unreplaced = line.search(/\$(\!?)\{/) + 1;
  if (unreplaced) {
    throw new Error(this.lineMsg() + "invalid ${} variable substitution at letter " + unreplaced);
  }
  return line;
}

Scene.prototype.paragraph = function paragraph() {
    if (!this.prevLineEmpty) {
        println("", this.target);
        println("", this.target);
    }
    this.prevLineEmpty = true;
}

Scene.prototype.loadSceneFast = function loadSceneFast(url) {
  if (this.loading) return;
  this.loading = true;
  startLoading();
  if (!url) {
    url = Scene.baseUrl + "/" + this.name + ".txt.js";
  }
  var tag = document.createElement("script");
  tag.setAttribute("src", url);
  var head = document.getElementsByTagName("head")[0];
  head.appendChild(tag);
}

Scene.prototype.loadLinesFast = function loadLinesFast(crc, lines, labels) {
  this.checkSum(crc);
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
}

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
    xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;
        if (xhr.status != 200 && xhr.status) {
            main.innerHTML = "<p>Our apologies; there was a " + xhr.status + " error while loading game data."+
            "  Please refresh your browser now; if that doesn't work, please email dan at fabulich.com with details.</p>"+
            " <p><button onclick='window.location.reload();'>Refresh Now</button></p>";
            return;
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
    }
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
            "choiceofgames.com.  For the time being, please try another browser like Mozilla Firefox.")
            return;
          }
        }
        window.onerror("Couldn't load URL: " + url + "\n" + e);        
      }
    }
}

Scene.prototype.checkSum = function checkSum(crc) {
  if (this.temps.choice_crc) {
    if (this.temps.choice_crc != crc) {
      // The scene has changed; restart the scene
      var userRestored = this.temps.choice_user_restored || false;
      this.temps = {choice_reuse:"allow", choice_user_restored:userRestored, choice_crc: crc};
      this.lineNum = 0;
      this.indent = 0;
    }
  } else {
    this.temps.choice_crc = crc;
  }
}

Scene.prototype.loadLines = function loadLines(str) {
    var crc = crc32(str);
    this.checkSum(crc);
    this.lines = str.split('\n');
    this.parseLabels();
    this.loaded = true;
}

// launch the vignette as soon as it's available
Scene.prototype.execute = function execute() {
    if (!this.loaded) {
        this.executing = true;
        if (Scene.generatedFast) {
          this.loadSceneFast();
        } else {
          this.loadScene();
        }
        return;
    }
    if (this.nav) this.nav.repairStats(stats);
    doneLoading();
    this.printLoop();
}

// loop through the file looking for *label commands
Scene.prototype.parseLabels = function parseLabels() {
    var lineLength = this.lines.length;
    var oldLineNum = this.lineNum;
    for (this.lineNum = 0; this.lineNum < lineLength; this.lineNum++) {
        this.rollbackLineCoverage();
        var line = this.lines[this.lineNum];
        var result = /^(\s*)\*(\w+)(.*)/.exec(line);
        if (!result) continue;
        var indentation = result[1];
        var indent = indentation.length;
        var command = result[2].toLowerCase();
        var data = trim(result[3]);
        if ("label" == command) {
            data = data.toLowerCase();
            if (this.labels[data]) throw new Error(this.lineMsg() + "label '"+data+"' already defined on line " + this.labels[data]);
            this.labels[data] = this.lineNum;
        }
    }
    this.rollbackLineCoverage();
    this.lineNum = oldLineNum;
}

// if this is a command line, run it
Scene.prototype.runCommand = function runCommand(line) {
    var result = /^\s*\*(\w+)(.*)/.exec(line);
    if (!result) return false;
    var command = result[1].toLowerCase();
    var data = trim(result[2]);
    if (Scene.validCommands[command]) {
        this[command](data);
    } else {
        throw new Error(this.lineMsg() + "Non-existent command '"+command+"'");
    }
    return true;
}

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
    if (this.fakeChoice) {
      this.temps.fakeChoiceEnd = this.lineNum;
    }
    this.lineNum = startLineNum;
}

Scene.prototype.fake_choice = function fake_choice(data) {
    this.fakeChoice = true;
    this.choice(data, true);
    delete this.fakeChoice;
}

Scene.prototype.standardResolution = function(option) {
  var self = this;
  self.lineNum = option.line;
  self.indent = self.getIndent(self.nextNonBlankLine(true/*includingThisOne*/));
  if (option.reuse && option.reuse != "allow") self.temps.choice_used[option.line-1] = 1;

  self.finished = false;
  self.resetPage();
};

Scene.prototype.nextNonBlankLine = function nextNonBlankLine(includingThisOne) {
    var line;
    var i = this.lineNum;
    if (!includingThisOne) i++;
    while(isDefined(line = this.lines[i]) && !trim(line)) {
      i++
    }
    return line;
}

// reset the page and invoke code after clearing the screen
Scene.prototype.resetPage = function resetPage() {
    var self = this;
    this.save(function() {
      self.prevLineEmpty = true;
      self.screenEmpty = true;
      clearScreen(function() {self.execute();});
    }, "");
}

Scene.prototype.save = function save(callback, slot) {
    if (/^choicescript_/.test(this.name)) {
      if (callback) callback.call(this);
    } else {
      saveCookie(callback, slot, this.stats, this.temps, this.lineNum, this.indent, this.debugMode, this.nav);
    }
}

// *goto labelName
// Go to the line labeled with the label command *label labelName
Scene.prototype["goto"] = function scene_goto(label) {
    label = label.toLowerCase();
    if (typeof(this.labels[label]) != "undefined") {
        this.lineNum = this.labels[label];
        this.indent = this.getIndent(this.lines[this.lineNum]);
    } else {
        throw new Error(this.lineMsg() + "bad label " + label);
    }
}

Scene.prototype.gosub = function scene_gosub(label) {
    if (!this.temps.choice_substack) {
      this.temps.choice_substack = [];
    }
    this.temps.choice_substack.push({lineNum: this.lineNum, indent: this.indent});
    this["goto"](label);
}

Scene.prototype["return"] = function scene_return() {
    if (!this.temps.choice_substack) {
      throw new Error(this.lineMsg() + "invalid return; gosub has not yet been called");
    }
    var stackFrame = this.temps.choice_substack.pop();
    if (!stackFrame) throw new Error(this.lineMsg() + "invalid return; we've already returned from the last gosub");
    this.lineNum = stackFrame.lineNum;
    this.indent = stackFrame.indent;
}

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
}

   
// *finish
// halt the scene
Scene.prototype.finish = function finish(buttonName) {
    this.paragraph();
    this.finished = true;
    var nextSceneName = this.nav && nav.nextSceneName(this.name);
    // if there are no more scenes, then just halt
    if (!nextSceneName) {
        if (!/^choicescript_/.test(this.name)) this.ending();
        return;
    }
    if (!buttonName) buttonName = "Next Chapter";
    buttonName = this.replaceVariables(buttonName);

    var self = this;
    printButton(buttonName, main, false, 
      function() { 
        safeCall(self, function() {
            var scene = new Scene(nextSceneName, self.stats, self.nav, self.debugMode);
            scene.resetPage();
        });
      }
    );
    if (this.debugMode) println(toJson(this.stats));
}

Scene.prototype.autofinish = function autofinish(buttonName) {
  this.finish(buttonName);
}

// *reset
// clear all stats
Scene.prototype.reset = function reset() {
    this.nav.resetStats(this.stats);
    this.stats.scene = this;
}

// *goto_scene foo
// 
Scene.prototype.goto_scene = function gotoScene(sceneName) {
    this.finished = true;
    this.skipFooter = true;
    var scene = new Scene(sceneName, this.stats, this.nav, this.debugMode);
    scene.screenEmpty = this.screenEmpty;
    scene.prevLineEmpty = this.prevLineEmpty;
    scene.execute();
}

Scene.prototype.restore_purchases = function scene_restorePurchases(data) {
  var self = this;
  var target = this.target;
  if (!target) target = document.getElementById('text');
  var button = printButton("Restore Purchases", target, false, 
    function() { 
      safeCall(self, function() {
          restorePurchases(function() {
            self["goto"](data);
            self.finished = false;
            self.resetPage();
          });
      });
    }
  );
  
  setClass(button, "");
  this.prevLineEmpty = false;
}

Scene.prototype.check_purchase = function scene_checkPurchase(data) {
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  checkPurchase(data, function(result) {
    self.finished = false;
    self.skipFooter = false;
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
}

Scene.prototype.purchase = function purchase_button(data) {
  var result = /^(\w+)\s+(\S+)\s+(.*)/.exec(data);
  if (!result) throw new Error(this.lineMsg() + "invalid line; can't parse purchaseable product: " + data);
  var product = result[1];
  var priceGuess = trim(result[2]);
  var label = trim(result[3]);
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  getPrice(product, function (price) {
    if (!price || "free" == price) {
      self["goto"](label);
    } else {
      if (price == "guess") price = priceGuess;
      var target = self.target;
      if (!target) target = document.getElementById('text');
      var button = printButton("Buy It Now for " + price, target, false, 
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
      self.prevLineEmpty = false;
      self.skipFooter = false;
      self.finished = false;
      self.execute();
    }
  });
}

// *abort
// halt the scene in error(?)
Scene.prototype.abort = Scene.prototype.finish;

// *create
// create a new permanent stat
Scene.prototype.create = function create(variable) {
    variable = variable.toLowerCase();
    this.validateVariable(variable);
    this.stats[variable] = null;
}

// *temp
// create a temporary stat for the current scene
Scene.prototype.temp = function temp(variable) {
    variable = variable.toLowerCase();
    this.validateVariable(variable);
    this.temps[variable] = null;
}

// retrieve the value of the variable, preferring temp scope
Scene.prototype.getVar = function getVar(variable) {
    var value;
    variable = variable.toLowerCase();
    if (variable == "true") return true;
    if (variable == "false") return false;
    if (variable == "choice_subscribe_allowed") return true;
    if (variable == "choice_restore_purchases_allowed") return isRestorePurchasesSupported();
    if (variable == "choice_save_allowed") return areSaveSlotsSupported();
    if ("undefined" === typeof this.temps[variable]) {
        if ("undefined" === typeof this.stats[variable]) {
            throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
        }
        value = this.stats[variable];
        if (value === null) {
            throw new Error(this.lineMsg() + "Variable '"+variable+"' exists but has no value");
        }
        if (this.debugMode) println("stats["+ variable + "]==" + value);
        return value;
    }
    value = this.temps[variable];
    if (value === null) {
        throw new Error(this.lineMsg() + "Variable '"+variable+"' exists but has no value");
    }
    if (this.debugMode) println("temps["+ variable + "]==" + value);
    return value;
}

// set the value of the variable, preferring temp scope
Scene.prototype.setVar = function setVar(variable, value) {
    variable = variable.toLowerCase();
    if (this.debugMode) println(variable +"="+ value);
    if ("undefined" === typeof this.temps[variable]) {
        if ("undefined" === typeof this.stats[variable]) {
            throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
        }
        this.stats[variable] = value;
    } else {
        this.temps[variable] = value;
    }
}

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
}

// during a choice, recursively parse the options
Scene.prototype.parseOptions = function parseOptions(startIndent, choicesRemaining, expectedSubOptions) {
    // nextIndent: the level of indentation after the current line
    // For example, in the color/toy sample above, we start at 0
    // then the nextIndent is 2 for "red"
    // then the nextIndent is 4 for "spaceship"
    var nextIndent = null;
    var options = [];
    var line;  
    var currentChoice = choicesRemaining[0];
    if (!currentChoice) currentChoice = "choice";
    var suboptionsEncountered = false;
    var bodyExpected = false;
    var previousSubOptions;
    var namesEncountered = {};
    var atLeastOneSelectableOption = false;
    while(isDefined(line = this.lines[++this.lineNum])) {
        if (!trim(line)) {
            this.rollbackLineCoverage();
            continue;
        }
        var indent = this.getIndent(line);
        if (nextIndent == null) {
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
            if (bodyExpected && !this.fakeChoice) {
                throw new Error(this.lineMsg() + "Expected choice body");
            }
            if (!atLeastOneSelectableOption) this.conflictingOptions(this.lineMsg() + "No selectable options");
            if (expectedSubOptions) {
                this.verifyOptionsMatch(expectedSubOptions, options);
            }
            this.rollbackLineCoverage();
            var prevOption = options[options.length-1];
            if (!prevOption.endLine) prevOption.endLine = this.lineNum;
            this.lineNum--;
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
          var prevOption = options[options.length-1];
          if (!prevOption.endLine) prevOption.endLine = this.lineNum;
        }
        
        // Execute *if commands (etc.) during option loop
        // sub-commands may modify this.indent
        var parsed = /^\s*\*(\w+)(.*)/.exec(line);
        var unselectable = false;
        var inlineIf = null;
        var selectableIf = null;
        var self = this;
        
        function removeModifierCommand() {
          line = trim(line.replace(/^\s*\*(\w+)(.*)/, "$2"));
          parsed = /^\s*\*(\w+)(.*)/.exec(line);
          if (parsed) {
            command = parsed[1].toLowerCase();
            data = trim(parsed[2]);
          } else {
            command = "";
          }
        }
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
              var ifResult = this.parseOptionIf(data, command);
              if (ifResult) {
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
            } else if ("selectable_if" == command) {
              var ifResult = this.parseOptionIf(data, command);
              if (!ifResult) throw new Error(this.lineMsg() + "Couldn't parse the line after *selectable_if: " + data);
              line = ifResult.line;
              selectableIf = ifResult.condition;
              unselectable = unselectable || !ifResult.result;
            } else if ("finish" == command) {
                break;
            } else if (!command) {
              // command was rewritten by earlier modifier
            } else {
                if (Scene.validCommands[command]) {
                    this[command](data, true /*inChoice*/);
                }  else {
                    throw new Error(this.lineMsg() + "Non-existent command '"+command+"'");
                }
                continue;
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
        if (!/^\s*\#/.test(line)) {
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
    if (bodyExpected && !this.fakeChoice) {
        throw new Error(this.lineMsg() + "Expected choice body");
    }
    var prevOption = options[options.length-1];
    if (!prevOption.endLine) prevOption.endLine = this.lineNum;
    if (!atLeastOneSelectableOption) this.conflictingOptions(this.lineMsg() + "No selectable options");
    return options;
}

// compute *if statement during options
Scene.prototype.parseOptionIf = function parseOptionIf(data) {
  var parsed = /\((.*)\)\s+(#.*)/.exec(data);
  if (!parsed) {
    return;
  }
  var condition = parsed[1];
  var stack = this.tokenizeExpr(condition);
  var result = this.evaluateExpr(stack);
  if (this.debugMode) println(condition + " :: " + result);
  if ("boolean" != typeof result) {
      throw new Error(this.lineMsg() + "Invalid boolean expression; this isn't a boolean: " + result);
  }
  // In the autotester, all conditionals are enabled
  result = result || this.testPath;
  return {result:result, line:parsed[2], condition:null};
}

// Add this as a separate method so we can override it elsewhere
// We want this error during randomtest but not during autotest
// Because autotest makes impossible situations happen
Scene.prototype.conflictingOptions = function conflictingOptions(str) {
  throw new Error(str);
}

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
    
    for (var i = 0; i < prev.length; i++) {
        var prevOpt = prev[i];
        var curOpt = findMatch(prevOpt.name, current);
        if (!curOpt) throw new Error(this.lineMsg()+"Missing expected suboption '"+prevOpt.name+"'; all suboptions must have same option list");
    }
    
    if (prev.length == current.length) return;
    
    for (i = 0; i < current.length; i++) {
        curOpt = current[i];
        prevOpt = findMatch(curOpt.name, prev);
        if (!prevOpt) throw new Error(this.lineMsg()+"Added unexpected suboption '"+curOpt.name+"'; all suboptions must have same option list");
    }
    
    throw new Error(this.lineMsg()+"Bug? previous options and current options mismatch, but no particular missing element");
}

// render the prompt and the radio buttons
Scene.prototype.renderOptions = function renderOptions(groups, options, callback) {
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      option.name = this.replaceVariables(option.name);
    }
    this.paragraph();
    printOptions(groups, options, callback);

    if (this.debugMode) println(toJson(this.stats));
    
    if (this.finished) printFooter();
}

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
}

// *line_break
// single line break in the middle of a paragraph
Scene.prototype.line_break = function line_break() {
    println("", this.target);
}

// *image
// display named image
Scene.prototype.image = function image(data) {
    data = data || "";
    var args = data.split(" ");
    if (args > 2) throw new Error(this.lineMsg()+"Too many words; expected filename and alignment: " + data);
    var source = args[0];
    var alignment = args[1];
    alignment = alignment || "center";
    if (!/(right|left|center|none)/.test(alignment)) throw new Error(this.lineMsg()+"Invalid alignment, expected right, left, center, or none: " + data);
    printImage(source, alignment);
}

// *link
// Display URL with anchor text
Scene.prototype.link = function link(data) {
    var result = /^(\S+)\s*(.*)/.exec(data);
    if (!result) throw new Error(this.lineMsg() + "invalid line; this line should have an URL: " + data);
    var href = result[1];
    var anchorText = trim(result[2]) || href;
    printLink(this.target, href, anchorText);
    this.prevLineEmpty = false;
    this.screenEmpty = false;
}

// how many spaces is this line indented?
Scene.prototype.getIndent = function getIndent(line) {
    if (line == null) return 0;
    var spaces = line.match(/^([ \t]*)/);
    if (spaces == null) return 0;
    var whitespace = spaces[0];
    var len = whitespace.length;
    if (0 == len) return 0;
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
}

// *comment ignorable text
Scene.prototype.comment = function comment(line) {
    if (this.debugMode) println("*comment " + line);
}

Scene.prototype.advertisement = function advertisement() {
  if (isFullScreenAdvertisingSupported()) {
    this.finished = true;
    this.skipFooter = true;
    
    var self = this;
    showFullScreenAdvertisement(function() {
      self.finished = false;
      self.skipFooter = false;
      self.resetPage();
    })
  }
  
}

// *looplimit 5
// The number of times a given line is allowed to be accessed
Scene.prototype.looplimit = function looplimit() {} // TODO looplimit

Scene.prototype.hide_reuse = function hide_reuse() {
  this.temps.choice_reuse = "hide";
}

Scene.prototype.disable_reuse = function disable_reuse() {
  this.temps.choice_reuse = "disable";
}

Scene.prototype.allow_reuse = function allow_reuse() {
  this.temps.choice_reuse = "allow";
}

// *label labelName
// Labels a line for use later in *goto
// Do nothing here; these labels are parsed in this.parseLabel
Scene.prototype.label = function label() {}

// *print expr
// print the value of the specified expression
Scene.prototype.print = function scene_print(expr) {
    var value = this.evaluateExpr(this.tokenizeExpr(expr));
    this.prevLineEmpty = false;
    this.screenEmpty = false;
    this.printLine(value);
    printx(' ', this.target);
}

// *input_text var
// record text typed by the user and store it in the specified variable
Scene.prototype.input_text = function input_text(variable) {
    this.validateVariable(variable);
    this.finished = true;
    this.paragraph();
    var self = this;
    printInput(this.target, "text", function(value) {
      safeCall(self, function() {
        self.setVar(variable, value);
        self.finished = false;
        self.resetPage();
      })
    })
    if (this.debugMode) println(toJson(this.stats));
}

// *input_number var min max
// record number typed by the user and store it in the specified variable
Scene.prototype.input_number = function input_number(data) {
    var args = data.split(/ /);
    if (args.length != 3) {
        throw new Error(this.lineMsg() + "Invalid input_number statement, expected three args: varname min max");
    }
    var variable, minimum, maximum;
    variable = args[0];
    this.validateVariable(variable);
    minimum = this.evaluateValueExpr(args[1]);
    if (isNaN(minimum*1)) throw new Error(this.lineMsg() + "Invalid minimum, not numeric: " + minimum);
    maximum = this.evaluateValueExpr(args[2]);
    if (isNaN(maximum*1)) throw new Error(this.lineMsg() + "Invalid maximum, not numeric: " + maximum);

    if (minimum > maximum) throw new Error(this.lineMsg() + "Minimum " + minimum+ " should not be greater than maximum " + maximum);

    function isInt(x) {
       var y=parseInt(x);
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
          alert("Please type in a number.");
          return;
        }
        if (intRequired && !isInt(numValue)) {
          alert("Please type in an integer number.");
          return;
        }
        if (numValue < minimum * 1) {
          alert("Please use a number greater than or equal to " + minimum);
          return;
        }
        if (numValue > maximum * 1) {
          alert("Please use a number less than or equal to " + maximum);
          return;
        }
        self.setVar(variable, value);
        self.finished = false;
        self.resetPage();
      })
    }, minimum, maximum, intRequired);
    if (this.debugMode) println(toJson(this.stats));
}

// *script code
// evaluate the specified ECMAScript
Scene.prototype.script = function script(code) {
    var stats = this.stats;
    var temps = this.temps;
    eval(code);
}

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
}

// *rand varname min max
// Set varname to a random number from min to max
//
// Example:
// *rand foo 1 6
//   roll a cube die
// *rand foo 1.0 6.0
//   compute a decimal from [1.0,6.0)
Scene.prototype.rand = function rand(data) {
    // TODO make this parser more general
    var args = data.split(/ /);
    if (args.length != 3) {
        throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    }
    var variable, minimum, maximum, diff;
    variable = args[0];
    this.validateVariable(variable);
    minimum = this.evaluateValueExpr(args[1]);
    maximum = this.evaluateValueExpr(args[2]);
    diff = maximum - minimum;
    if (isNaN(diff)) {
        throw new Error(this.lineMsg() + "Invalid rand statement, min and max must be numbers");
    }
    if (diff < 0) {
        throw new Error(this.lineMsg() + "Invalid rand statement, min must be less than max: " + minimum + " > " + maximum);
    }
    if (diff == 0) {
      this.setVar(variable, minimum);
      return;
    }
    function isInt(x) {
       var y=parseInt(x);
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
}

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
Scene.prototype.set = function set(line) {
    var result = /^(\w*)(.*)/.exec(line);
    if (!result) throw new Error(this.lineMsg()+"Invalid set instruction, no variable specified: " + line);
    var variable = result[1];
    this.validateVariable(variable);
    var expr = result[2];
    var stack = this.tokenizeExpr(expr);
    if (stack.length == 0) throw new Error(this.lineMsg()+"Invalid set instruction, no expression specified: " + line);
    // if the first token is an operator, then it's implicitly based on the variable
    if (/OPERATOR|FAIRMATH/.test(stack[0].name)) stack.unshift({name:"VAR", value:variable, pos:"(implicit)"});
    var value = this.evaluateExpr(stack);
    this.setVar(variable, value);
}

// *setref variableExpr expr
// just like *set, but variableExpr is a string expression naming a variable reference
//
// Example:
// *set foo "bar"
// *setref foo 3
// *comment now bar=3
Scene.prototype.setref = function setref(line) {
    var stack = this.tokenizeExpr(line);
    var reference = this.evaluateValueToken(stack.shift(), stack);
    var referenceExpressionString;
    try {
        referenceExpressionString = trim(line.substring(0, stack[0].pos - stack[0].value.length));
    } catch (e) {}

    try {
      this.validateVariable(reference);
    } catch (e) {
      if (typeof referenceExpressionString != undefined) {
        throw new Error(this.lineMsg()+"The expression \("+referenceExpressionString+"\) was \""+reference+"\", which is invalid:\n" + e.message);
      }
    }
    var value = this.evaluateExpr(stack);
    this.setVar(reference, value);
}

Scene.prototype.share_this_game = function share_links(now) {
  now = !!trim(now);
  this.paragraph();
  printShareLinks(this.target, now);
  this.prevLineEmpty = true; // printShareLinks provides its own paragraph break
}

Scene.prototype.more_games = function more_games(now) {
  if (typeof window == "undefined") return;
  if (!!trim(now)) {
    moreGames();
    return;
  }
  var self = this;
  var target = this.target;
  if (!target) target = document.getElementById('text');
  var button = printButton("Play More Games Like This", target, false, 
    function() { 
      safeCall(self, moreGames);
    }
  );
  
  setClass(button, "");
  this.prevLineEmpty = false;
}

Scene.prototype.ending = function ending() {
    this.finished = true;
    if (typeof window == "undefined") return;
    var groups = [""];
    var options = [
      {name:"Play again.", group:"choice", restart:true}
      ,{name:"Play more games like this.", group:"choice", moreGames:true}
      ,{name:"Share this game with friends.", group:"choice", share:true}
      ,{name:"Email me when new games are available.", group:"choice", subscribe:true}
    ];
    var self = this;
    function endingMenu() {
      self.renderOptions([""], options, function(option) {
        if (option.restart) {
          self.restart();
          return;
        } else if (option.moreGames) {
          self.more_games("now");
          setTimeout(function() {callIos("curl")}, 0);
        } else if (option.share) {
          clearScreen(function() {
            self.share_this_game("now");
            endingMenu();
          }) 
        } else if (option.subscribe) {
          subscribeLink();
        }
      });
    }
    endingMenu();
}

Scene.prototype.restart = function restart() {
  this.finished = true;
  this.reset();
  delayBreakEnd();
  var startupScene = this.nav.getStartupScene();
  var scene = new Scene(startupScene, this.stats, this.nav, this.debugMode);
  scene.resetPage();
}

Scene.prototype.subscribe = function scene_subscribe(now) {
  // "now" means we should immediately display the signup form
  // otherwise, we should display a Subscribe button which displays the form
  // On some platforms, "now" is impossible, so we ignore it.
  now = ("now" == now);
  this.prevLineEmpty = false;
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  subscribe(this.target, now, function(now) {
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
}

Scene.prototype.restore_game = function restore_game() {
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
    options.push({name:"Restore using a password.", group:"choice", password:true});
    options.push({name:"Retrieve saved games online from choiceofgames.com.", group:"choice", fetch:true});
    if (dirtySaveList.length) options.push({name:"Upload saved games to choiceofgames.com.", group:"choice", upload:true});
    options.push({name:"Cancel.", group:"choice", cancel:true});
    var groups = [""];
    self.renderOptions(groups, options, function(option) {
      if (option.upload) {
        clearScreen(function() {
          fetchEmail(function(defaultEmail){
            self.printLine("Please type your email address to identify yourself.");
            promptEmailAddress(this.target, defaultEmail, function(cancel, email) {
              if (cancel) {
                self.finished = false;
                self.resetPage();
                return;
              }
              clearScreen(function() {
                startLoading();
                submitDirtySaves(dirtySaveList, email, function(ok) {
                  doneLoading();
                  self.prevLineEmpty = false; // Put some space between the message and the option list
                  if (!ok) {
                    self.printLine("Error uploading saves. Please try again later.");
                    renderRestoreMenu(saveList, dirtySaveList);
                  } else {
                    var count = dirtySaveList.length + (dirtySaveList.length == 1 ? " save" : " saves")
                    self.printLine("Uploaded " + count + ".");
                    renderRestoreMenu(saveList, []);
                  }
                });
              });
            });
          });
        })
      } else if (option.fetch) {
        clearScreen(function() {
          fetchEmail(function(defaultEmail){
            self.printLine("Please type your email address to identify yourself.");
            promptEmailAddress(this.target, defaultEmail, function(cancel, email) {
              if (cancel) {
                self.finished = false;
                self.resetPage();
                return;
              }
              clearScreen(function() {
                startLoading();
                getRemoteSaves(email, function (remoteSaveList) {
                  doneLoading();
                  self.prevLineEmpty = false;
                  if (!remoteSaveList) {
                    self.printLine("Error downloading saves. Please try again later.");
                    renderRestoreMenu(saveList, dirtySaveList);
                  } else {
                    mergeRemoteSaves(remoteSaveList, function(saveList, newRemoteSaves, dirtySaveList) {
                      if (!remoteSaveList.length) {
                        self.printLine("No saves downloaded for email address \""+email+"\". (Is that the correct email address?) If you're having trouble, please contact support at support@choiceofgames.com.");
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
          self.resetPage();
        } else {
          var state = option.state;
          var sceneName = null;
          if (state.stats && state.stats.sceneName) sceneName = (""+state.stats.sceneName).toLowerCase();
          var unrestorable = unrestorableScenes[sceneName];

          if (unrestorable) {
            alert(unrestorable);
            self.finished = false;
            self.resetPage();
            return;
          }
          
          saveCookie(function() {
            clearScreen(function() {
              restoreGame(state, null, /*userRestored*/true);
            })
          }, "", state.stats, state.temps, state.lineNum, state.indent, this.debugMode, this.nav);
        }
      }
    });
  };
  getDirtySaveList(function(dirtySaveList) {
    getSaves(function(saveList) {
      renderRestoreMenu(saveList, dirtySaveList);
    })
  });
}

Scene.prototype.restore_password = function restore_password() {
  var alreadyFinished = this.finished;
  this.finished = true;
  this.paragraph();
  this.printLine('Please paste your password here, then press "Next" below to continue.');
  this.prevLineEmpty = false;
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
    try {
      var state = jsonParse(token);
    } catch (e) {
      var supportEmail = "support-unknown@choiceofgames.com";
      try {
        supportEmail=document.getElementById("supportEmail").getAttribute("href");
        supportEmail=supportEmail.replace(/\+/g,"%2B");
        supportEmail=supportEmail.replace(/mailto:/, "");
      } catch (e) {
        supportEmail = "support-unknown@choiceofgames.com";
      }
      alert("Sorry, that password was invalid. Please contact " + supportEmail + " for assistance. Be sure to include your password in the email.");
      return;
    }
    
    var sceneName = null;
    if (state.stats && state.stats.sceneName) sceneName = (""+state.stats.sceneName).toLowerCase();
    
    var unrestorable = unrestorableScenes[sceneName];
    if (unrestorable) {
      alert(unrestorable);
      self.finished = false;
      self.resetPage();
      return;
    }
    
    saveCookie(function() {
      clearScreen(function() {
        // we're going to pretend not to be user restored, so we get reprompted to save
        restoreGame(state, null, /*userRestored*/false);
      })
    }, "", state.stats, state.temps, state.lineNum, state.indent, this.debugMode, this.nav);
  });
  if (alreadyFinished) printFooter();
}

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
        if (nextIndent == null) {
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
}

Scene.prototype.save_game = function save_game() {
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
    saveName.setAttribute("style", "font-size: 25px; width: 90%;");
    form.appendChild(saveName);

    println("", form);
    println("", form);
    println("Please login to the choiceofgames.com save system with your email address below.", form);

    var emailInput = document.createElement("input");
    // This can fail on IE
    try { emailInput.type="email"; } catch (e) {}
    emailInput.name="email";
    emailInput.value=defaultEmail;
    emailInput.setAttribute("style", "font-size: 25px; width: 90%;");
    form.appendChild(emailInput);

    println("", form);
    println("", form);

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
    

    var target = this.target;
    if (!target) target = document.getElementById('text');
    target.appendChild(form);
    println("", form);
    printButton("Next", form, true);

    printButton("Cancel", target, false, function() {
      clearScreen(function() {
        self.finished = false;
        self.prevLineEmpty = true;
        self.screenEmpty = true;
        self.execute();
      });
    });

    form.onsubmit = function(e) {
      preventDefault(e);
      safeCall(this, function() {
        var shouldSubscribe = subscribeBox.checked;
        var email = trim(emailInput.value);
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          var messageText = document.createTextNode("Sorry, \""+email+"\" is not an email address.  Please type your email address again.");
          message.innerHTML = "";
          message.appendChild(messageText);
        } else if (!trim(saveName.value)) {
          var messageText = document.createTextNode("Please type a name for your saved game.");
          message.innerHTML = "";
          message.appendChild(messageText);
        } else {
          recordEmail(email, function() {
            var slot = "save" + new Date().getTime();
            self.temps.choice_restore_name = saveName.value;
            clearScreen(function() {
              self.save(function() {
                recordSave(slot, function() {
                  submitRemoteSave(slot, email, shouldSubscribe, function(ok) {
                    if (!ok) {
                      asyncAlert("Couldn't upload your saved game to choiceofgames.com. You can try again later from the Restore menu.", function() {
                        self.finished = false;
                        self.prevLineEmpty = true;
                        self.screenEmpty = true;
                        self.execute();
                      })
                    } else {
                      self.finished = false;
                      self.prevLineEmpty = true;
                      self.screenEmpty = true;
                      self.execute();
                    }
                  });
                })
              }, slot);
              delete self.temps.choice_restore_name;
            });
          });
        }
      });
    };
    
    printFooter();
  });
}

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
  this.prevLineEmpty = false;
}

Scene.prototype.obfuscate = function obfuscate(password) {
  var self = this;
  return password.replace(/./g,
    function(x) {
      var y = self.obfuscator[x];
      return y;
    }
  );
}

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
}
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
}

Scene.prototype.deobfuscatePassword = function deobfuscatePassword(password) {
  var self = this;
  password = password.replace(/./g,
    function(x) {
      var y = self.deobfuscator[x];
      return y;
    }
  );
  return password;
}

Scene.prototype.stat_chart = function stat_chart() {
  var rows = this.parseStatChart();
  var containsOpposedPair = false;
  for (var i = 0; i < rows.length && !containsOpposedPair; i++) {
    if (rows[i].type == "opposed_pair") {
      containsOpposedPair = true;
    }
  }
  var textBuilder = ["<table class='statChart'>"];
  var barWidth = 10; /*em*/
  var barWidthOpposed = 5; /*em*/
  // BEWARE: Can't use DOM to build this table due to IE bugs
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var type = row.type;
    var variable = row.variable;
    var value = this.getVar(variable);
    var label = this.replaceVariables(row.label);
    var definition = this.replaceVariables(row.definition || "");
    
    textBuilder.push("<tr><td class='leftStatName'>");
    textBuilder.push(label);
    if (definition) {
      textBuilder.push("<div class='definition'>");
      // TODO security problem
      textBuilder.push(definition);
      textBuilder.push("</div>");
    }
    textBuilder.push("</td>");
    
    if (type == "text") {
      textBuilder.push("<td colspan='2'>");
      // TODO security problem
      textBuilder.push(value);
    } else if (type == "percent") {
      if (containsOpposedPair) {
        var statWidth = barWidthOpposed / 100 * value;
        textBuilder.push("<td><div class='rightStatBarOpposed'><div style='width: "+
          statWidth+"em;' class='leftStatBar'>&nbsp;"+value+"</div></div>");
      } else {
        var statWidth = barWidth / 100 * value;
        textBuilder.push("<td><div class='rightStatBar'><div style='width: "+
          statWidth+"em;' class='leftStatBar'>&nbsp;"+value+"</div></div>");
      }
    } else if (type == "opposed_pair") {
      var statWidth = barWidthOpposed / 100 * value;
      textBuilder.push("<td><div class='rightStatBarOpposed'><div style='width: "+
        statWidth+"em;' class='leftStatBar'>&nbsp;"+value+"</div></div>");
      textBuilder.push("<td class='rightStatName'>");
      // TODO security problem
      textBuilder.push(row.opposed_label);
      if (definition) {
        textBuilder.push("<div class='definition'>");
        // TODO security problem
        textBuilder.push(row.opposed_definition);
        textBuilder.push("</div>");
      }
    } else {
      throw new Error("Bug! Parser accepted an unknown row type: " + type);
    }
    textBuilder.push("</td></tr>");
  }
  var target = this.target;
  if (!target) target = document.getElementById('text');
  target.innerHTML += textBuilder.join("");
}

Scene.prototype.parseStatChart = function parseStatChart() {
    // nextIndent: the level of indentation after the current line
    var nextIndent = null;
    var rows = [];
    var line;  
    var startIndent = this.indent;
    while(isDefined(line = this.lines[++this.lineNum])) {
        if (!trim(line)) {
            this.rollbackLineCoverage();
            continue;
        }
        var indent = this.getIndent(line);
        if (nextIndent == null) {
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
          var line1 = this.lines[++this.lineNum];
          this.replaceVariables(line1);
          var line1indent = this.getIndent(line1);
          if (line1indent <= this.indent) throw new Error(this.lineMsg() + "invalid indent; expected at least one indented line to indicate opposed pair name. indent: " + line1indent + ", expected greater than " + this.indent);
          var line2 = this.lines[this.lineNum + 1];
          var line2indent = this.getIndent(line2);
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
          } else {
            result = /^(\S+) (.*)/.exec(data);
            if (!result) throw new Error(this.lineMsg() + "Bug! can't find a space when a space was found");
            variable = result[1];
            label = result[2];
          }
          this.getVar(variable);
          this.replaceVariables(label);
          var line2 = this.lines[this.lineNum + 1];
          var line2indent = this.getIndent(line2);
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
}

Scene.prototype.delay_break = function(durationInSeconds) {
  this.finished = true;
  this.skipFooter = true;
  var target = this.target;
  if (!target) target = document.getElementById('text');
  var self = this;
  delayBreakStart(function(delayStart) {
    var endTimeInSeconds = durationInSeconds * 1 + delayStart * 1;
    showTicker(target, endTimeInSeconds, function() {
      printButton("Next", target, false, function() {
        delayBreakEnd();
        self.finished = false;
        self.resetPage();
      })
    });
    printFooter();
  });
}

Scene.prototype.delay_ending = function(data) {
  var args = data.split(/ /);
  var durationInSeconds = args[0];
  var price = args[1];
  this.finished = true;
  this.skipFooter = true;
  var self = this;
  checkPurchase("adfree", function(result) {
    if (result.adfree || !result.billingSupported) {
      self.ending();
      return;
    }
    var finishedWaiting = {name: "Play again after a short wait. ", unselectable: true};
    var upgradeSkip = {name: "Upgrade to the full version for " + price + " to skip the wait."}
    //var facebookSkip = {name: "Share this game on Facebook to skip the wait."};
    var playMoreGames = {name: "Play more games like this."};
    var emailMe = {name: "Email me when new games are available."};
    self.paragraph();
    printOptions([""], [finishedWaiting, upgradeSkip, /*facebookSkip,*/ playMoreGames, emailMe], function(option) {
      if (option == playMoreGames) {
        self.more_games("now");
        setTimeout(function() {callIos("curl")}, 0);
      } else if (option == emailMe) {
        subscribeLink();
      } else if (option == upgradeSkip) {
        purchase("adfree", function() {
          safeCall(self, function() {
            self.restart();
          });
        });
      } else {
        self.restart();
      }
    });
    
    var target = document.getElementById("0").parentElement;

    delayBreakStart(function(delayStart) {
      var endTimeInSeconds = durationInSeconds * 1 + delayStart * 1;
      showTicker(target, endTimeInSeconds, function() {
        clearScreen(function() {
          self.ending();
        })
      });
      printFooter();
    });
  })
  
}

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
    if ("boolean" != typeof result) {
        throw new Error(this.lineMsg() + "Invalid boolean expression; this isn't a boolean: " + result);
    }
    if (result) {
        // "true" branch, just go on to the next line
        this.indent = this.getIndent(this.nextNonBlankLine());
    } else {
        // "false" branch; skip over the true branch
        this.skipTrueBranch(false);
    }
}

// TODO Rename this function to just skipBranch
Scene.prototype.skipTrueBranch = function skipTrueBranch(inElse) {
  var startIndent = this.indent;
  var nextIndent = null;
  while (isDefined(line = this.lines[++this.lineNum])) {
      this.rollbackLineCoverage();
      if (!trim(line)) continue;
      var indent = this.getIndent(line);
      if (nextIndent == null) {
          if (indent <= startIndent) throw new Error(this.lineMsg() + "invalid indent, expected at least one line in 'if' true block");
          nextIndent = indent;
      }
      if (indent <= startIndent) {
          // true block is over
          var parsed;
          // check to see if this is an *else or *elseif
          if (indent == startIndent) parsed = /^\s*\*(\w+)(.*)/.exec(line);
          if (!parsed || inElse) {
              this.lineNum--;
              this.rollbackLineCoverage();
              this.indent = indent;
              return;
          }
          var command = parsed[1].toLowerCase();
          var data = trim(parsed[2]);
          if ("else" == command) {
              this.lineNum = this.lineNum; // code coverage
              // go on to the next line
              this.indent = this.getIndent(this.nextNonBlankLine());
          } else if (/^else?if$/.test(command)) {
              this.lineNum = this.lineNum; // code coverage
              this["if"](data);
          } else {
              this.lineNum--;
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
}

Scene.prototype["else"] = Scene.prototype.elsif = Scene.prototype.elseif = function scene_else(data, inChoice) {
    if (inChoice) {
      this.skipTrueBranch(true);
      return;
    }
    throw new Error(this.lineMsg() + "It is illegal to fall in to an *else statement; you must *goto or *finish before the end of the indented block.");
}

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
                if ("WHITESPACE" == tokenType.name) {
                    break;
                }
                stack.push({name:tokenType.name, value:token, pos:pos});
                break;
            }
        }
        if (!matched) throw new Error(this.lineMsg()+"Invalid expression, couldn't extract another token: " + str);
    }
    return stack;
}

// evaluate the stack of tokens
// parenthetical == true if we're evaluating a parenthetical expression
// all expressions consist of either a "singleton" value (2) or two values and one operator (2+2)
Scene.prototype.evaluateExpr = function evaluateExpr(stack, parenthetical) {
    if (!stack.length) {
        throw new Error(this.lineMsg() + "no expression specified");
    }
    function getToken() {
        var token = stack.shift();
        if (!token) throw new Error(this.lineMsg() + "null token");
        return token;
    }
    
    var token, value1, value2, operator, result;
    
    value1 = this.evaluateValueToken(getToken(), stack);
    
    if (!stack.length) {
        if (parenthetical) {
            throw new Error(this.lineMsg() + "Invalid expression, expected final closing parenthesis");
        }
        return value1;
    }
    
    token = getToken();
    
    if (parenthetical && parenthetical == token.name) {
        return value1;
    }
    
    // Since this isn't a singleton, it must be an operator
    operator = Scene.operators[token.value];
    if (!operator) throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected OPERATOR, was: " + token.name + " [" + token.value + "]");
    
    // fetch the final value
    value2 = this.evaluateValueToken(getToken(), stack);
    
    // and do the operator
    result = operator(value1, value2, this.lineNum+1);
    
    if (parenthetical) {
        // expect close parenthesis
        if (stack.length) {
            token = getToken();
            if (parenthetical == token.name) {
                return result;
            } else {
                throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected closing parenthesis, was: " + token.name + " [" + token.value + "]");
            }
        } else {
            throw new Error(this.lineMsg() + "Invalid expression, expected final closing parenthesis");
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
}

// turn a number, string, or var token into its value
// or, if this is an open parenthesis, evaluate the parenthetical expression
Scene.prototype.evaluateValueToken = function evaluateValueToken(token, stack) {
    var name = token.name;
    if ("OPEN_PARENTHESIS" == name) {
        return this.evaluateExpr(stack, "CLOSE_PARENTHESIS");
    } else if ("OPEN_CURLY" == name) {
        var value = this.evaluateExpr(stack, "CLOSE_CURLY");
        return this.getVar(value);
    } else if ("FUNCTION" == name) {
        var functionName = /^\w+/.exec(token.value)[0];
        if (!this.functions[functionName]) throw new Error(this.lineMsg + "Unknown function " + functionName);
        var value = this.evaluateExpr(stack, "CLOSE_PARENTHESIS");
        return this.functions[functionName].call(this, value);
    } else if ("NUMBER" == name) {
        return token.value;
    } else if ("STRING" == name) {
        // strip off the quotes and unescape backslashes
        return this.replaceVariables(token.value.slice(1,-1).replace(/\\(.)/g, "$1"));
    } else if ("VAR" == name) {
        return this.getVar(token.value);
    } else {
        throw new Error(this.lineMsg() + "Invalid expression at char "+token.pos+", expected NUMBER, STRING, VAR or PARENTHETICAL, was: " + name + " [" + token.value + "]");
    }
}

Scene.prototype.functions = {
  not: function(value) {
    if ("boolean" != typeof value) {
        throw new Error(this.lineMsg()+"not() value is neither true nor false: " + value);
    }
    return !value;
  },
  round: function(value) {
    if (isNaN(value*1)) throw new Error(this.lineMsg()+"round() value is not a number: " + value);
    return Math.round(value);
  }
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
}

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
  
}

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
        if (nextIndent == null) {
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
        while(command = /^\*(\S+)/.exec(line)) {
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
}

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
  for (var i = 0; i < options.length; i++) {
    var option = options[i];
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
  var option = filtered[randomSelection];
  if (!option.allowReuse) {
    this.stats.choice_grs.push(option.name);
  }
  return option;
}

Scene.prototype.lineMsg = function lineMsg() {
    return "line " + (this.lineNum+1) + ": ";
}

Scene.prototype.rollbackLineCoverage = function() {}

Scene.baseUrl = "scenes";
Scene.regexpMatch = function regexpMatch(str, re) {
    var result = re.exec(str);
    if (!result) return null;
    return result[0];
}
// Each token has a name and a test, which returns the matching string
Scene.tokens = [
    {name:"OPEN_PARENTHESIS", test:function(str){ return Scene.regexpMatch(str,/^\(/); } }
    ,{name:"CLOSE_PARENTHESIS", test:function(str){ return Scene.regexpMatch(str,/^\)/); } }
    ,{name:"OPEN_CURLY", test:function(str){ return Scene.regexpMatch(str,/^\{/); } }
    ,{name:"CLOSE_CURLY", test:function(str){ return Scene.regexpMatch(str,/^\}/); } }
    ,{name:"FUNCTION", test:function(str){ return Scene.regexpMatch(str,/^(not|round)\s*\(/); } }
    ,{name:"NUMBER", test:function(str){ return Scene.regexpMatch(str,/^\d+(\.\d+)?/); } }
    ,{name:"STRING", test:function(str, line) {
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
    }
    ,{name:"WHITESPACE", test:function(str){ return Scene.regexpMatch(str,/^\s+/); } }
    ,{name:"BOOLEAN_OPERATOR", test:function(str){ return Scene.regexpMatch(str,/^(and|or)\b/); } }
    ,{name:"VAR", test:function(str){ return Scene.regexpMatch(str,/^[a-zA-Z]\w*/); } }
    ,{name:"FAIRMATH", test:function(str){ return Scene.regexpMatch(str,/^%[\+\-]/); } }
    ,{name:"OPERATOR", test:function(str){ return Scene.regexpMatch(str,/^[\+\-\*\/\&\%]/); } }
    ,{name:"INEQUALITY", test:function(str){ return Scene.regexpMatch(str,/^[\!\<\>]\=?/); } }
    ,{name:"EQUALITY", test:function(str){ return Scene.regexpMatch(str,/^=/); } }
    //
];
Scene.operators = {
    "+": function add(v1,v2,line) { return num(v1,line) + num(v2,line); }
    ,"-": function subtract(v1,v2,line) { return num(v1,line) - num(v2,line); }
    ,"*": function multiply(v1,v2,line) { return num(v1,line) * num(v2,line); }
    ,"/": function divide(v1,v2,line) { return num(v1,line) / num(v2,line); }
    ,"%": function modulo(v1,v2,line) { return num(v1,line) % num(v2,line); }
    ,"&": function concatenate(v1,v2) { return [v1,v2].join(""); }
    ,"%+": function fairAdd(v1, v2, line) {
        v1 = num(v1,line);
        v2 = num(v2,line);
        var validValue = (v1 > 0 && v1 < 100);
        if (!validValue) {
            throw new Error("line "+line+": Can't fairAdd to non-percentile value: " + v1);
        }
        var multiplier = (100 - v1) / 100;
        var actualModifier = v2 * multiplier;
        var value = 1 * v1 + actualModifier;
        value = Math.floor(value);
        if (value > 99) value = 99;
        return value;
    }
    ,"%-": function fairSubtract(v1, v2, line) {
        v1 = num(v1,line);
        v2 = num(v2,line);
        var validValue = (v1 > 0 && v1 < 100);
        if (!validValue) {
            throw new Error("line "+line+": Can't fairAdd to non-percentile value: " + v1);
        }
        var multiplier = v1 / 100;
        var actualModifier = v2 * multiplier;
        var value = v1 - actualModifier;
        value = Math.ceil(value);
        if (value < 1) value = 1;
        return value;
    }
    ,"=": function equals(v1,v2) { return v1 == v2; }
    ,"<": function lessThan(v1,v2,line) { 
        return num(v1,line) < num(v2,line); }
    ,">": function greaterThan(v1,v2,line) { return num(v1,line) > num(v2,line); }
    ,"<=": function lessThanOrEquals(v1,v2,line) { return num(v1,line) <= num(v2,line); }
    ,">=": function greaterThanOrEquals(v1,v2,line) { return num(v1,line) >= num(v2,line); }
    ,"!=": function notEquals(v1,v2) { return v1 != v2; }
    ,"and": function and(v1, v2, line) {
        // do we need to convert strings to booleans here?
        if ("boolean" != typeof v1) {
            throw new Error("line "+line+": value 1 is not a boolean: " + v1);
        }
        if ("boolean" != typeof v2) {
            throw new Error("line "+line+": value 2 is not a boolean: " + v2);
        }
        return v1 && v2;
    }
    ,"or": function or(v1, v2, line) {
        // do we need to convert strings to booleans here?
        if ("boolean" != typeof v1) {
            throw new Error("line "+line+": value 1 is not a boolean: " + v1);
        }
        if ("boolean" != typeof v2) {
            throw new Error("line "+line+": value 2 is not a boolean: " + v2);
        }
        return v1 || v2;
    }
};

Scene.validCommands = {"comment":1, "goto":1, "gotoref":1, "label":1, "looplimit":1, "finish":1, "abort":1,
    "choice":1, "create":1, "temp":1, "delete":1, "set":1, "setref":1, "print":1, "if":1, "rand":1,
    "page_break":1, "line_break":1, "script":1, "else":1, "elseif":1, "elsif":1, "reset":1,
    "goto_scene":1, "fake_choice":1, "input_text":1, "ending":1, "share_this_game":1, "stat_chart":1
    ,"subscribe":1, "show_password":1, "gosub":1, "return":1, "hide_reuse":1, "disable_reuse":1, "allow_reuse":1
    ,"check_purchase":1,"restore_purchases":1,"purchase":1,"restore_game":1,"advertisement":1
    ,"save_game":1,"delay_break":1,"image":1,"link":1,"input_number":1,"goto_random_scene":1
    ,"restart":1,"more_games":1,"delay_ending":1
    };
