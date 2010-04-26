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
var gameName = "mygame";
load("web/scene.js");
load("web/navigator.js");
load("web/util.js");
load("headless.js");
load("seedrandom.js");
load("web/"+gameName+"/"+"mygame.js");

Math.seedrandom(1);

function log(msg) {
  print(msg);
}

var printed = [];
printx = println = function printx(msg, parent) {
  //printed.push(msg);
}


function slurpFileLines(name) {
    var lines = [];
    var reader = new java.io.BufferedReader(new java.io.FileReader(name));
    var line;
    while (line = reader.readLine()) {
         lines.push(line);
    }
    return lines;
}

function slurpFile(name) {
  return slurpFileLines(name).join('\n');
}

function debughelp() {
    debugger;
}

function noop() {}
Scene.prototype.page_break = noop;
Scene.prototype.stat_chart = function() {
  this.parseStatChart();
}

crc32 = noop;

Scene.prototype.ending = function () {
  this.reset();
  this.finished = true;
}

Scene.prototype.input_text = function(variable) {
   this.setVar(variable, "blah blah");
}

Scene.prototype.finish = function random_finish() {
    var nextSceneName = this.nav && nav.nextSceneName(this.name);
    this.finished = true;
    // if there are no more scenes, then just halt
    if (!nextSceneName) {
        return;
    }
    var scene = new Scene(nextSceneName, this.stats, this.nav, this.debugMode);
    scene.resetPage();
}
    

Scene.prototype.choice = function choice(data, fakeChoice) {
    var groups = ["choice"];
    if (data) groups = data.split(/ /);
    var choiceLine = this.lineNum;
    var options = this.parseOptions(this.indent, groups);
    var flattenedOptions = [];
    flattenOptions(flattenedOptions, options);

    var index = Math.floor(Math.random()*(flattenedOptions.length));

    var item = flattenedOptions[index];
    if (fakeChoice) this.temps.fakeChoiceEnd = this.lineNum;
    this.getFormValue = function(name) {return item[name];}

    log(this.name + " " + (choiceLine+1)+'#'+(index+1)+' ('+item.ultimateOption.line+')');
    var self = this;
    timeout = function() {self.resolveChoice(options, groups);}
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

}

  Scene.prototype.loadScene = function loadScene() {
    var file = slurpFile('web/'+gameName+'/scenes/'+this.name+'.txt');
    this.loadLines(file);
    this.loaded = true;
    if (this.executing) {
      this.execute();
    }
  }
    

    var coverage = {};
var sceneNames = [];

  Scene.prototype.rollbackLineCoverage = function(lineNum) {
    if (!lineNum) lineNum = this.lineNum;
    coverage[this.name][lineNum]--;
  }
  
  try {
    Scene.prototype.__defineGetter__("lineNum", function() { return this._lineNum; });
    Scene.prototype.__defineSetter__("lineNum", function(val) {
	var sceneCoverage;
	if (!coverage[this.name]) {
	  sceneNames.push(this.name);
	  coverage[this.name] = [];
	}
	sceneCoverage = coverage[this.name];
	
        if (sceneCoverage[val]) {
            sceneCoverage[val]++;
        } else {
            sceneCoverage[val] = 1;
        }
        this._lineNum = val;
    });
  } catch (e) {
    // IE doesn't support getters/setters; no coverage for you!
  }

nav.setStartingStatsClone(stats);

var iterations = 10;
for (i = 0; i < iterations; i++) {
  log("*****" + i);
  timeout = null;
  var scene = new Scene(nav.getStartupScene(), stats, nav, false);
  scene.execute();
  while (timeout) {
    var fn = timeout;
    timeout = null;
    fn();
  }
}

for (i = 0; i < sceneNames.length; i++) {
  var sceneName = sceneNames[i];
  var sceneLines = slurpFileLines('web/'+gameName+'/scenes/'+sceneName+'.txt');
  var sceneCoverage = coverage[sceneName];
  for (var j = 0; j < sceneCoverage.length; j++) {
    log(sceneName + " "+ (sceneCoverage[j] || 0) + ": " + sceneLines[j]);
  }
}
