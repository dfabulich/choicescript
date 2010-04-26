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
load("web/"+gameName+"/"+"mygame.js");

function log(msg) {
  print(msg);
}

var printed = [];
printx = println = function printx(msg, parent) {
  //printed.push(msg);
}


function slurpFile(name) {
    var lines = [];
    var reader = new java.io.BufferedReader(new java.io.FileReader(name));
    var line;
    while (line = reader.readLine()) {
         lines.push(line);
    }
    return lines.join('\n');
}

function debughelp() {
  //    debugger;
}

function noop() {}
Scene.prototype.page_break = noop;
Scene.prototype.stat_chart = noop;

crc32 = noop;

Scene.prototype.ending = function () {
  this.finished = true;
}

Scene.prototype.input_text = function(variable) {
   this.setVar(variable, "blah blah");
}

Scene.prototype.finish = function random_finish() {
    var nextSceneName = this.nav && nav.nextSceneName(this.name);
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
    if (fakeChoice) scene.temps.fakeChoiceEnd = this.lineNum;
    scene.getFormValue = function(name) {return item[name];}

    log((this.lineNum+1)+'#'+(index+1)+' ('+item.ultimateOption.line+')');

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
    

var scene = new Scene(nav.getStartupScene(), stats, nav, false);
scene.execute();

