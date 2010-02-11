function autotester(sceneText) {
  function log(msg) {
    //console.log(msg)
  }
  var coverage = [1];

  var printed = [];
  printx = function printx(msg, parent) {
      //printed.push(msg);
  }
    
  var sceneList = [];
  
  
  Scene.prototype.page_break = function() {};
  
  Scene.prototype.input_text = function(variable) {
      this.setVar(variable, "blah blah");
  }
  
  Scene.prototype.rollbackLineCoverage = function(lineNum) {
    if (!lineNum) lineNum = this.lineNum;
    coverage[lineNum]--;
  }
  
  Scene.prototype.__defineGetter__("lineNum", function() { return this._lineNum; });
  Scene.prototype.__defineSetter__("lineNum", function(val) {
      if (coverage[val]) {
          coverage[val]++;
      } else {
          coverage[val] = 1;
      }
      this._lineNum = val;
  });
  
  
  Scene.prototype.choice = function choice(data, fakeChoice) {
      if (data) throw new Error(this.lineMsg() + "Groups not yet supported: " + data);
      var groups = [];
      var choiceLine = this.lineNum;
      var options = this.parseOptions(this.indent, groups);
      for (var index = 0; index < options.length; index++) {
          (function (index) {
            var item = options[index];
            var scene = this.clone();
            if (fakeChoice) scene.temps.fakeChoiceEnd = this.lineNum;
            scene.testFormValues = {choice:index};
            scene.getFormValue = function(name) {return scene.testFormValues[name];}
            scene.testOptions = options;
            scene.testGroups = ["choice"];
            scene.testChoiceLine = choiceLine;
            scene.testPath.push(',');
            scene.testPath.push(choiceLine+1);
            scene.testPath.push('#');
            scene.testPath.push(index+1);
            scene.resume = function() {scene.resolveChoice(scene.testOptions, scene.testGroups);}
            sceneList.push(scene);
          }).call(this, index);
      }
      
      this.finished = true;
  }
  
  Scene.prototype.clone = function clone() {
    this.stats.scene = null;
    var clonedStats = dojoClone(this.stats);
    var scene = new Scene(this.name, clonedStats);
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
  
  Scene.prototype.goto_scene = Scene.prototype.ending = Scene.prototype.finish;
  
  if (!Scene.prototype.oldIf) Scene.prototype.oldIf = Scene.prototype["if"];
  Scene.prototype["if"] = function test_if(line, inChoice) {
    if (inChoice) {
      this.oldIf(line);
      return;
    }
    
    // Does the expression evaluate to a boolean?
    var stack = this.tokenizeExpr(line);
    var result = this.evaluateExpr(stack);
    if ("boolean" != typeof result) {
        throw new Error(this.lineMsg() + "Invalid boolean expression; this isn't a boolean: " + result);
    }
    
    // add false branch to sceneList
    var scene = this.clone();
    scene.testPath.push(',');
    scene.testPath.push(this.lineNum+1);
    scene.testPath.push('F');
    scene.lineNum = this.lineNum;
    scene.indent = this.indent;
    scene.skipTrueBranch();
    scene.lineNum++;
    scene.resume = function() {
      scene.printLoop(); }
    sceneList.push(scene);
    this.oldIf("true");
  }
  
  //Scene.prototype.choice = function() { this.finished = true;}
  
  var sceneName = "test";
  
  function StartingStats() {};
  for (var i in stats) {
    StartingStats.prototype[i] = stats[i];
  }
  
  var startingStats = new StartingStats();
  
  var scene = new Scene(sceneName, startingStats);
  var originalScene = scene;
  scene.testPath = [];
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
  }
}
