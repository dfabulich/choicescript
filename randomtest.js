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

// usage: randomtest 10000 mygame 0

var gameName = "mygame";
var args;
if (typeof java == "undefined") {
  args = process.argv;
  args.shift();
  args.shift();
  var fs = require('fs');
  var path = require('path');
  eval(fs.readFileSync("web/scene.js", "utf-8"));
  eval(fs.readFileSync("web/navigator.js", "utf-8"));
  eval(fs.readFileSync("web/util.js", "utf-8"));
  eval(fs.readFileSync("headless.js", "utf-8"));
  eval(fs.readFileSync("seedrandom.js", "utf-8"));
  eval(fs.readFileSync("web/"+gameName+"/"+"mygame.js", "utf-8"));
  function print(str) {
    console.log(str);
  }
} else {
  args = arguments;  
  load("web/scene.js");
  load("web/navigator.js");
  load("web/util.js");
  load("headless.js");
  load("seedrandom.js");
  load("web/"+gameName+"/"+"mygame.js");
}
if (args[1]) gameName = args[1];

var randomSeed = args[2] || 1;

Math.seedrandom(randomSeed);

var hardCodedRandomness = null; //[1, 1, 2, 1, 3, 3, 1, 1, 2, 5, 3, 1, 1, 2, 5, 1, 3, 3, 2, 2, 1, 2, 3, 2, 3, 1, 4, 5, 2, 3, 3, 2, 1, 1, 2, 2, 1, 1, 2, 3, ];
function randomIndex(len) {
  if (hardCodedRandomness) {
    var hardCodedResult = hardCodedRandomness.shift();
    if ("number" !== typeof(hardCodedResult)) throw new Error("Out of randomness!");
    return hardCodedResult - 1;
  }
  return Math.floor(Math.random()*(len));
}

function log(msg) {
  print(msg);
}

var printed = [];
printx = println = function printx(msg, parent) {
  //printed.push(msg);
}


slurps = {}
function slurpFileCached(name) {
  if (!slurps[name]) slurps[name] = slurpFile(name);
  return slurps[name];
}

function debughelp() {
    debugger;
}

function noop() {}
Scene.prototype.page_break = noop;
Scene.prototype.printLine = function randomtest_printLine(line) {
  if (!line) return null;
  line = this.replaceVariables(line);
}
Scene.prototype.subscribe = noop;
Scene.prototype.save = function(callback) { if (callback) callback.call(); };
Scene.prototype.stat_chart = function() {
  this.parseStatChart();
}
Scene.prototype.check_purchase = function scene_checkPurchase(data) {
  var products = data.split(/ /);
  for (var i = 0; i < products.length; i++) {
    this.temps["choice_purchased_"+products[i]] = true;
  }
  this.temps.choice_purchase_supported = false;
  this.temps.choice_purchased_everything = true;
}

Scene.prototype.save_game = noop;

Scene.prototype.restore_game = function() {
  this.parseRestoreGame(false/*alreadyFinished*/);
};

Scene.prototype.delay_break = function randomtest_delayBreak(durationInSeconds) {
  if (isNaN(durationInSeconds * 1)) throw new Error(this.lineMsg() + "invalid duration");
}

Scene.prototype.delay_ending = function test_delayEnding(data) {
    var args = data.split(/ /);
    var durationInSeconds = args[0];
    var price = args[1];
    if (isNaN(durationInSeconds * 1)) throw new Error(this.lineMsg() + "invalid duration");
    if (!/^\$/.test(price)) throw new Error(this.lineMsg() + "invalid price");
    this.paragraph();
    this.finished = true;
}

crc32 = noop;

parsedLines = {};
Scene.prototype.oldLoadLines = Scene.prototype.loadLines;
Scene.prototype.loadLines = function cached_loadLines(str) {
  var parsed = parsedLines[str];
  if (parsed) {
    this.labels = parsed.labels;
    this.lines = parsed.lines;
    return;
  } else {
    this.oldLoadLines(str);
    parsedLines[str] = {labels: this.labels, lines: this.lines};
  }
}

cachedNonBlankLines = {};
Scene.prototype.oldNextNonBlankLine = Scene.prototype.nextNonBlankLine;

Scene.prototype.nextNonBlankLine = function cached_nextNonBlankLine(includingThisOne) {
  var key = this.name+" "+this.lineNum +""+ !!includingThisOne;
  var cached = cachedNonBlankLines[key];
  if (cached) {
    return cached;
  }
  cached = this.oldNextNonBlankLine(includingThisOne);
  cachedNonBlankLines[key] = cached;
  return cached;
}

cachedTokenizedExpressions = {};
Scene.prototype.oldTokenizeExpr = Scene.prototype.tokenizeExpr;
Scene.prototype.tokenizeExpr = function cached_tokenizeExpr(str) {
  var cached = cachedTokenizedExpressions[str];
  if (cached) return cloneStack(cached);
  cached = this.oldTokenizeExpr(str);
  cachedTokenizedExpressions[str] = cloneStack(cached);
  return cached;
  function cloneStack(stack) {
    var twin = new Array(stack.length);
    var i = stack.length;
    while (i--) {
      twin[i] = stack[i];
    }
    return twin;
  }
}

// TODO bring back this performance optimization; make parseOptions return all options
// Scene.prototype.oldParseOptions = Scene.prototype.parseOptions;
// parsedOptions = {};
// Scene.prototype.parseOptions = function cached_parseOptions(indent, groups, expectedSuboptions) {
//   if (expectedSuboptions) return this.oldParseOptions(indent, groups, expectedSuboptions);
//   var key = this.name + this.lineNum;
//   var parsed = parsedOptions[key];
//   if (parsed) {
//     this.lineNum = parsed.lineNum;
//     this.indent = parsed.indent;
//     return parsed.result;
//   }
//   var result = this.oldParseOptions(indent, groups, expectedSuboptions);
//   parsedOptions[key] = {lineNum:this.lineNum, indent:this.indent, result:result};
//   return result;
// }

Scene.prototype.ending = function () {
  this.reset();
  this.finished = true;
}

Scene.prototype.restart = Scene.prototype.ending;

Scene.prototype.input_text = function(variable) {
   this.setVar(variable, "blah blah");
}

Scene.prototype.input_number = function(data) {
   this.rand(data);
}

Scene.prototype.finish = Scene.prototype.autofinish = function random_finish() {
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

    var index = randomIndex(flattenedOptions.length);

    var item = flattenedOptions[index];
    if (fakeChoice) this.temps.fakeChoiceEnd = this.lineNum;

    log(this.name + " " + (choiceLine+1)+'#'+(index+1)+' ('+item.ultimateOption.line+')');
    var self = this;
    timeout = function() {self.standardResolution(item.ultimateOption);}
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
          if (!option.unselectable) list.push(dojoClone(flattenedOption));
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
    var file = slurpFileCached('web/'+gameName+'/scenes/'+this.name+'.txt');
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

var iterations = 10000;
if (args[0]) iterations = args[0];
for (i = 0; i < iterations; i++) {
  log("*****" + i);
  timeout = null;
  var scene = new Scene(nav.getStartupScene(), stats, nav, false);
  try {
    scene.execute();
    while (timeout) {
      var fn = timeout;
      timeout = null;
      fn();
    }
  } catch (e) {
    print("RANDOMTEST FAILED\n");
    print(e);
    if (isRhino) {
      java.lang.System.exit(1);
    } else {
      process.exit(1);
    }
  }
  nav.resetStats(stats);
}

for (i = 0; i < sceneNames.length; i++) {
  var sceneName = sceneNames[i];
  var sceneLines = slurpFileLines('web/'+gameName+'/scenes/'+sceneName+'.txt');
  var sceneCoverage = coverage[sceneName];
  for (var j = 0; j < sceneCoverage.length; j++) {
    log(sceneName + " "+ (sceneCoverage[j] || 0) + ": " + sceneLines[j]);
  }
}
log("RANDOMTEST PASSED");
