function autotester(sceneText, nav, sceneName) {
  function log(msg) {
    if (typeof(window) != "undefined" && window.console) window.console.log(msg)
  }
  var coverage = [];

  var printed = [];
  printx = function printx(msg, parent) {
      //printed.push(msg);
  }
    
  var sceneList = [];
  
  
  Scene.prototype.page_break = function() {};
  Scene.prototype.subscribe = function() {};
  
  Scene.prototype.input_text = function(variable) {
      this.setVar(variable, "blah blah");
  }
  
  Scene.prototype.save_game = function(data) {
    var stack = this.tokenizeExpr(data);
    var result = this.evaluateExpr(stack);
  }
  
  Scene.prototype.restore_game = function() {};
  
  Scene.prototype.rollbackLineCoverage = function(lineNum) {
    if (!lineNum) lineNum = this.lineNum;
    coverage[lineNum]--;
    //print("un-covered: " + lineNum);
  }
  
  try {
    Scene.prototype.__defineGetter__("lineNum", function() { return this._lineNum; });
    Scene.prototype.__defineSetter__("lineNum", function(val) {
        if (coverage[val]) {
            coverage[val]++;
        } else {
            coverage[val] = 1;
        }
        //print("covered: " + val);
        this._lineNum = val;
    });
  } catch (e) {
    // IE doesn't support getters/setters; no coverage for you!
  }
  
  
  Scene.prototype.choice = function choice(data, fakeChoice) {
      var groups = ["choice"];
      if (data) groups = data.split(/ /);
      var choiceLine = this.lineNum;
      var options = this.parseOptions(this.indent, groups);
      var flattenedOptions = [];
      flattenOptions(flattenedOptions, options);
      
      for (var index = 0; index < flattenedOptions.length; index++) {
          var item = flattenedOptions[index];
          this.printLine(item.ultimateOption.name);
          var scene = this.clone();
          if (fakeChoice) scene.temps.fakeChoiceEnd = this.lineNum;
          scene.testFormValues = item;
          scene.getFormValue = function(name) {return this.testFormValues[name];}
          scene.testOptions = options;
          scene.testGroups = groups;
          scene.testChoiceLine = choiceLine;
          scene.testPath.push(',');
          scene.testPath.push(choiceLine+1);
          scene.testPath.push('#');
          scene.testPath.push(index+1);
          scene.testPath.push(' (');
          scene.testPath.push(item.ultimateOption.line);
          scene.testPath.push(')');
          scene.resume = function() {this.resolveChoice(this.testOptions, this.testGroups);}
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
    var scene = new Scene(this.name, clonedStats, this.nav);
    scene.lines = this.lines;
    scene.labels = this.labels;
    scene.temps = dojoClone(this.temps);
    scene.loaded = true;
    scene.testPath = dojoClone(this.testPath);
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
  	r = new o.constructor(); // specific to dojo.declare()'d classes!
  	for(i in o){
  		if(!(i in r) || r[i] != o[i]){
  			r[i] = dojoClone(o[i]);
  		}
  	}
  	return r; // Object
  }
  
  if (!Scene.prototype.oldRunCommand) Scene.prototype.oldRunCommand = Scene.prototype.runCommand;
  Scene.prototype.runCommand = function test_runCommand(line) {
    // skip commands that have already been covered
    if (coverage[this._lineNum] > 1) {
        if (/^\s*\*else/i.test(line)) {
          // else statements will have been covered by the "false" clones
          // but the fact that we're here means we must have fallen into an *else
          return this.oldRunCommand(line);
        } else {
          //log("overcovered " + (this._lineNum+1) + " " + coverage[this._lineNum]);
          return this.finish();
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
      var key = label;
      //var key = toJson(this.stats) + toJson(this.temps) + label;
      if (seen[key]) {
          //throw new Error("yay! seen!");
          this.finished = true;
          return;
      }
      seen[key] = 1;
      //log("unseen: " + key);
      this.oldGoto(label);
  }

  if (!Scene.prototype.oldGosub) Scene.prototype.oldGosub = Scene.prototype.gosub;

  Scene.prototype.gosub = function scene_gosub(label, inChoice) {
    if (!seen[label]) this.oldGosub(label);
  }
  
  Scene.prototype.ending = Scene.prototype.finish;
  
  Scene.prototype.goto_scene = function testGotoScene(name) {
    if (this.verifyFileName) this.verifyFileName(name);
    this.finish();
  }
  
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
  Scene.prototype["if"] = function test_if(line, inChoice) {
    // Does the expression evaluate to a boolean?
    var stack = this.tokenizeExpr(line);
    var result = this.evaluateExpr(stack);
    if ("boolean" != typeof result) {
        throw new Error(this.lineMsg() + "Invalid boolean expression; this isn't a boolean: " + result);
    }
    
    if (inChoice) {
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
  
  //Scene.prototype.choice = function() { this.finished = true;}
  
  if (!sceneName) sceneName = "test";
  
  function StartingStats() {};
  for (var i in stats) {
    StartingStats.prototype[i] = stats[i];
  }
  
  if (!nav) nav = {
    repairStats: function() {}
    ,resetStats: function() {}
  }
  
  var startingStats = new StartingStats();
  
  // *finish will barf if we use the real sceneName
  var scene = new Scene("test"/*sceneName*/, startingStats, nav);
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
  
  //log(printed.join('\n'));
  var uncovered = [];
  for (var i = 0; i < coverage.length; i++) {
      log("line "+(i+1) +": " +coverage[i]);
      line = trim(originalScene.lines[i]);
      if (!coverage[i] && line && !/\*comment /.test(line)) {
        uncovered.push(i+1);
      }
  }
  
  if (uncovered.length) {
      log("UNCOVERED:");
      log(uncovered.join('\n'));
      return [coverage, uncovered];
  }
  return [coverage];
}
