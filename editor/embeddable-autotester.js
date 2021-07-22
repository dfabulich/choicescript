function autotester(sceneText, nav, sceneName, extraLabels) {
  if (sceneText.length > 1.9 * 1000 * 1000) {
    throw new Error(sceneName + ": this scene is too large. It may crash on some devices")
  }
  function log(msg) {
    if (typeof(console) != "undefined") console.log(msg)
  }
  var coverage = [];

  var printed = [];
  printx = printParagraph = function printx(msg, parent) {
      //printed.push(msg);
  }
    
  var sceneList = [];
  
  if (!Scene.prototype.oldSceneList) Scene.prototype.oldSceneList = Scene.prototype.scene_list;
  Scene.prototype.scene_list = function test_scene_list() {
    if ("startup" != this.name || !this.screenEmpty || !this.initialCommands) throw new Error(this.lineMsg() +
    "Invalid scene_list instruction, only allowed at the top of startup.txt");
    var scenes = this.parseSceneList();
    for (var i = 0; i < scenes.length; i++) {
      this.verifySceneFile(scenes[i]);
    }
  }

  Scene.prototype.quicktest = true;

  Scene.prototype.finish = function test_finish(buttonName) {
    this.paragraph();
    this.finished = true;
    if (!buttonName) buttonName = "Next Chapter";
    buttonName = this.replaceVariables(buttonName);
    if (this.testFinish) this.testFinish();
  }

  // Don't test for *bugs; *if cheating makes *bugs fake-reachable
  Scene.prototype.bug = function test_bug() {
    this.finished = true;
  };

  Scene.prototype.page_break = function(buttonName) {
    this.replaceVariables(buttonName);
    this.resetCheckedPurchases();
  };
  Scene.prototype.subscribe = function() {};
  Scene.prototype.feedback = function() {};
  Scene.prototype.save = function() {};
  Scene.prototype.restore_purchases = function() {};
  Scene.prototype.buyButton = function (product, priceGuess, label) {
    if (seen[label]) return;
    var scene = this.clone();
    scene.testPath.push(',');
    scene.testPath.push(this.lineNum+1);
    scene.testPath.push('$');
    scene.lineNum = this.lineNum;
    scene.rollbackLineCoverage();
    scene.indent = this.indent;
    scene["goto"](label);
    scene.rollbackLineCoverage(); // we haven't actually covered the line yet
    scene.resume = function() {
      this.lineNum = this.lineNum; // NOW we've covered it
      scene.printLoop(); }
    sceneList.push(scene);
  };
  
  Scene.prototype.delay_break = function() {};

  Scene.prototype.delay_ending = function test_delayEnding(data) {
    var args = data.split(/ /);
    var durationInSeconds = args[0];
    var price = args[1];
    if (isNaN(durationInSeconds * 1)) throw new Error(this.lineMsg() + "invalid duration");
    if (!/^\$/.test(price)) throw new Error(this.lineMsg() + "invalid price");
    this.paragraph();
    this.finished = true;
  }

  Scene.prototype.check_purchase = function scene_checkPurchase(data) {
    var products = data.split(/ /);
    for (var i = 0; i < products.length; i++) {
      this.temps["choice_purchased_"+products[i]] = true;
      if ((!this.nav.products || !this.nav.products[products[i]]) && products[i] != "adfree") {
        this.warning("The product " + products[i] + " wasn't declared in a *product command");
      }
    }
    this.temps.choice_purchase_supported = false;
    this.temps.choice_purchased_everything = true;
  }
  
  var inputCallback;

  printInput = function printInput(target, inputOptions, callback, minimum) {
    inputCallback = function() {
      if (inputOptions.numeric) {
        callback(minimum);
      } else {
        callback("blah blah");
      }
    }
  }

  if (!Scene.prototype.oldInputText) Scene.prototype.oldInputText = Scene.prototype.input_text;
  if (!Scene.prototype.oldInputNumber) Scene.prototype.oldInputNumber = Scene.prototype.input_number;

  Scene.prototype.input_text = function test_input_text(data) {
    this.oldInputText(data);
    this.lineNum++;
    inputCallback();
  }
  
  Scene.prototype.input_number = function test_input_number(data) {
    this.oldInputNumber(data);
    this.lineNum++;
    inputCallback();
  }

  Scene.prototype.goto_random_scene = function testGotoRandomScene(data) {
    var parsed = this.parseGotoRandomScene(data);
    for (var i = 0; i < parsed.length; i++) {
      var name = parsed[i].name;
      this.verifySceneFile(name);
    }

    if (!/\ballow_no_selection\b/.test(data)) {
      this.finished = true;
    }
  }
  
  Scene.prototype.save_game = function(destinationSceneName) {
    if (!destinationSceneName) throw new Error(this.lineMsg()+"*save_game requires a destination file name, e.g. *save_game Episode2");
    this.verifySceneFile(destinationSceneName);
  }
  
  Scene.prototype.restore_game = function(data) {
    this.parseRestoreGame(false/*alreadyFinished*/);
    if (data) {
      var result = /^cancel=(\S+)$/.exec(data);
      if (!result) throw new Error(this.lineMsg() + "invalid restore_game line: " + data);
      cancel = result[1];
      this["goto"](cancel);
    }
  };
  
  Scene.prototype.rollbackLineCoverage = function(lineNum) {
    if (!lineNum) lineNum = this.lineNum;
    coverage[lineNum]--;
    // print("un-covered: " + (lineNum+1) + " (" + coverage[lineNum] + ")");
  }
  
  try {
    Scene.prototype.__defineGetter__("lineNum", function() { return this._lineNum; });
    Scene.prototype.__defineSetter__("lineNum", function(val) {
        if (coverage[val]) {
            coverage[val]++;
        } else {
            coverage[val] = 1;
        }
        // print("covered: " + (val+1) + " (" + coverage[val] + ")");
        this._lineNum = val;
    });
  } catch (e) {
    // IE doesn't support getters/setters; no coverage for you!
  }
  
  
  Scene.prototype.choice = function choice(data) {
      var groups = ["choice"];
      if (data) {
        groups = data.split(/ /);
        for (var i = 0; i < groups.length; i++) {
          if (!/^\w*$/.test(groups[i])) {
            throw new Error(this.lineMsg() + "invalid choice group name: " + groups[i]);
          }
        }
      }
      var choiceLine = this.lineNum;
      var options = this.parseOptions(this.indent, groups);
      if (!this.temps._choiceEnds) {
        this.temps._choiceEnds = {};
      }
      for (i = 0; i < options.length; i++) {
        this.temps._choiceEnds[options[i].line-1] = this.lineNum;
      }
      var flattenedOptions = [];
      flattenOptions(flattenedOptions, options);
      
      for (var index = 0; index < flattenedOptions.length; index++) {
          var item = flattenedOptions[index];
          this.printLine(item.ultimateOption.name);
          var scene = this.clone();
          scene.testOption = item;
          scene.testChoiceLine = choiceLine;
          scene.testPath.push(',');
          scene.testPath.push(choiceLine+1);
          scene.testPath.push('#');
          scene.testPath.push(index+1);
          scene.testPath.push(' (');
          scene.testPath.push(item.ultimateOption.line);
          scene.testPath.push(')');
          scene.resume = function() {this.standardResolution(this.testOption.ultimateOption);}
          sceneList.push(scene);
      }
      
      this.finished = true;
      
      function flattenOptions(list, options, flattenedOption) {
        if (!flattenedOption) flattenedOption = {};
        for (var i = 0; i < options.length; i++) {
          var option = options[i];
          flattenedOption[option.group] = i;
          if (option.suboptions) {
            flattenOptions(list, option.suboptions, flattenedOption);
          } else {
            flattenedOption.ultimateOption = option;
            list.push(dojoClone(flattenedOption));
          }
        }
      }
  }
  
  Scene.prototype.clone = function clone() {
    this.stats.scene = null;
    var clonedStats = dojoClone(this.stats);
    var scene = new Scene(this.name, clonedStats, this.nav, {secondaryMode:this.secondaryMode});
    scene.lines = this.lines;
    scene.labels = this.labels;
    scene.temps = dojoClone(this.temps);
    scene.loaded = true;
    scene.testPath = dojoClone(this.testPath);
    scene.firstTab = this.firstTab;
    scene.firstSpace = this.firstSpace;
    this.stats.scene = this;
    return scene;
  }
  
  function dojoClone(/*anything*/ o){
  	// summary:
  	//		Clones objects (including DOM nodes) and all children.
  	//		Warning: do not clone cyclic structures.
  	if(!o){ return o; }
  	if(o instanceof Array || typeof o == "array"){
  		var r = [];
  		for(var i = 0; i < o.length; ++i){
  			r.push(dojoClone(o[i]));
  		}
  		return r; // Array
  	}
  	if(typeof o != "object" && typeof o != "function"){
  		return o;	/*anything*/
  	}
  	if(o.nodeType && o.cloneNode){ // isNode
  		return o.cloneNode(true); // Node
  	}
  	if(o instanceof Date){
  		return new Date(o.getTime());	// Date
  	}
  	// Generic objects
    if (typeof o.constructor === "function") {
      r = new o.constructor(); // specific to dojo.declare()'d classes!
    } else {
      r = {};
    }
  	for(i in o){
  		if(!(i in r) || r[i] != o[i]){
  			r[i] = dojoClone(o[i]);
  		}
  	}
  	return r; // Object
  }
  
  // In autotest, impossible combinations occur, so ignore all conflicting options
  // We'll catch these with randomtest instead
  Scene.prototype.conflictingOptions = function() {};

  if (!Scene.prototype.oldRunCommand) Scene.prototype.oldRunCommand = Scene.prototype.runCommand;
  Scene.prototype.runCommand = function test_runCommand(line) {
    // skip commands that have already been covered
    if (!this.ignoreCoverage && coverage[this._lineNum] > 1) {
        if (/^\s*\*else/i.test(line)) {
          // else statements will have been covered by the "false" clones
          // but the fact that we're here means we must have fallen into an *else
          return this.oldRunCommand(line);
        } else if (seenInChoice[this.lineNum]) {
          // this is probably a case where we're falling out of an #option block
          // but the subsequent #option is *if conditional. Running the old
          // command will correctly raise an error.
          return this.oldRunCommand(line);
        } else {
          //log("overcovered " + (this._lineNum+1) + " " + coverage[this._lineNum]);
          this["return"]();
          return true;
        }
    } else {
      return this.oldRunCommand(line);
    }
    
  }
  
  if (!Scene.prototype.oldGoto) Scene.prototype.oldGoto = Scene.prototype["goto"];
  
  var seen = {};
  Scene.prototype["goto"] = function scene_goto(label, inChoice) {
      if (inChoice) {
        this.oldGoto(label, true);
        return;
      }
      //more specific keys are better tests!
      var key = label.toLowerCase();
      //var key = toJson(this.stats) + toJson(this.temps) + label;
      if (seen[key]) {
          //throw new Error("yay! seen!");
          this["return"]();
          return;
      }
      seen[key] = 1;
      //log("unseen: " + key);
      this.oldGoto(label);
  }

  if (!Scene.prototype.oldGosub) Scene.prototype.oldGosub = Scene.prototype.gosub;

  Scene.prototype.gosub = function scene_gosub(label, inChoice) {
    if (!seen[label.toLowerCase()]) this.oldGosub(label);
  }

  Scene.prototype.ending = function test_ending() {
    this.finished = true;
  };
  Scene.prototype.restart = Scene.prototype.ending;
  
  Scene.prototype.goto_scene = function testGotoScene(data) {
    var result = this.parseGotoScene(data);
    this.verifySceneFile(result.sceneName);
    this.finished = true;
  }

  Scene.prototype.redirect_scene = function testRedirectScene(data) {
    if (this.secondaryMode != "stats") throw new Error(this.lineMsg() + "The *redirect_scene command can only be used from the stats screen.");
    this.goto_scene(data);
  }

  Scene.prototype.gosub_scene = function testGosubScene(data) {
    var result = this.parseGotoScene(data);
    this.verifySceneFile(result.sceneName);
  }

  Scene.prototype["return"] = function scene_return() {
    var stackFrame;
    if (this.temps.choice_substack && this.temps.choice_substack.length) {
      stackFrame = this.temps.choice_substack.pop();
      this.lineNum = stackFrame.lineNum;
      this.indent = stackFrame.indent;
    } else {
      // testing the scenes in isolation, there's no way to know if a given *return is truly invalid
      this.finished = true;
    }
    
};
  
  if (!Scene.prototype.oldElse) Scene.prototype.oldElse = Scene.prototype["else"];
  Scene.prototype["else"] = function test_else(data, inChoice) {
    if (inChoice) {
      this.oldIf("true");
    } else {
      this.oldElse();
    }
  }
  
  Scene.prototype.elseif = Scene.prototype.elsif = function test_elseif(data, inChoice) {
    // Does the expression evaluate to a boolean?
    var stack = this.tokenizeExpr(data);
    var result = this.evaluateExpr(stack);
    if ("boolean" != typeof result) {
        throw new Error(this.lineMsg() + "Invalid boolean expression; this isn't a boolean: " + result);
    }
    this["else"](data, inChoice);
  }

  if (!Scene.prototype.oldIf) Scene.prototype.oldIf = Scene.prototype["if"];
  var seenInChoice = {};
  Scene.prototype["if"] = function test_if(line, inChoice) {
    // Does the expression evaluate to a boolean?
    var stack = this.tokenizeExpr(line);
    var result = this.evaluateExpr(stack);
    if ("boolean" != typeof result) {
        throw new Error(this.lineMsg() + "Invalid boolean expression; this isn't a boolean: " + result);
    }
    
    if (inChoice) {
      seenInChoice[this.lineNum] = 1;
      this.oldIf("true");
      return;
    }
    
    // add false branch to sceneList
    var scene = this.clone();
    scene.testPath.push(',');
    scene.testPath.push(this.lineNum+1);
    scene.testPath.push('F');
    scene.lineNum = this.lineNum;
    scene.rollbackLineCoverage();
    scene.indent = this.indent;
    scene.skipTrueBranch();
    scene.lineNum++;
    scene.rollbackLineCoverage(); // we haven't actually covered the line yet
    scene.resume = function() {
      this.lineNum = this.lineNum; // NOW we've covered it
      scene.printLoop(); }
    sceneList.push(scene);
    this.oldIf("true");
  }
  
  Scene.prototype.stat_chart = function() {
    this.parseStatChart();
  }

  Scene.operators["/"] = function divide(v1,v2,line,sceneObj) {
    let name = null;
    if (sceneObj) {
      name = sceneObj.name;
    }
    v2 = num(v2, line, name);
    if (v2 === 0) return 9007199254740991; //Number.MAX_SAFE_INTEGER
    return num(v1,line,name) / num(v2,line,name);
  };
  
  //Scene.prototype.choice = function() { this.finished = true;}
  
  if (!sceneName) sceneName = "test";
  
  var startingStats = {};
  if (!nav) {
    nav = {
      repairStats: function() {},
      resetStats: function() {},
      startingStats: {},
      bugLog: [],
      products: {},
    }
  }
  nav.resetStats(startingStats);

  // *finish will barf if we use the real sceneName
  var secondaryMode = undefined;
  if (sceneName == "choicescript_stats") {
    secondaryMode = "stats";
  } else if (sceneName == "choicescript_upgrade") {
    secondaryMode = "upgrade";
  }
  var scene = new Scene(sceneName, startingStats, nav, {secondaryMode: secondaryMode});
  var originalScene = scene;
  scene.testPath = [sceneName];
  scene.loadLines(sceneText);
  
  log("executing");
  scene.execute();
  
  while(scene = sceneList.shift()) {
    log (scene.testPath.join(''));
    //log(sceneList.length);
    scene.resume();
  }

  if (extraLabels) {
    for (var i = 0; i < extraLabels.length; i++) {
      var extraLabel = extraLabels[i];
      scene = new Scene(sceneName, startingStats, nav, {secondaryMode: secondaryMode});
      scene.lines = originalScene.lines;
      scene.labels = originalScene.labels;
      scene.loaded = true;
      scene.targetLabel = extraLabel;
      seen = {};
      scene.ignoreCoverage = true;
      scene.testPath = [sceneName,",","goto " + extraLabel.label];
      log (scene.testPath.join(''));
      scene.execute();
      while(scene = sceneList.shift()) {
        log (scene.testPath.join(''));
        //log(sceneList.length);
        scene.resume();
      }
    }
  }

  while(scene = sceneList.shift()) {
      log (scene.testPath.join(''));
      //log(sceneList.length);
      scene.resume();
  }
  
  //log(printed.join('\n'));
  var uncovered = [];
  var startRange = null;
  for (var i = 0; i < coverage.length; i++) {
      //log("line "+(i+1) +": " +coverage[i]);
      line = trim(originalScene.lines[i]);
      if (!coverage[i]) {
        if (startRange === null) {
          if (!line || /\*(comment|bug)\b/.test(line)) continue;
          startRange = i+1;
        }
      } else if (startRange == i) {
        uncovered.push(startRange);
        startRange = null;
      } else if (startRange) {
        uncovered.push(startRange + "-" + i);
        startRange = null;
      }
  }
  if (startRange) {
    uncovered.push(startRange + "-" + (i-1));
  }
  
  if (uncovered.length) {
      log("UNCOVERED:");
      log(uncovered.join('\n'));
      return [coverage, uncovered];
  }
  return [coverage];
}
