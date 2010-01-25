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
load("web/"+gameName+"/"+gameName+".js");
var djConfig = {baseUrl:"./tests/dojo-release-1.3.2-src/dojo/"};
load("tests/dojo-release-1.3.2-src/dojo/dojo.js");

var coverage = [1];

var printed = [];
printx = function printx(msg, parent) {
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

var sceneList = [];

function debughelp() {
    debugger;
}


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
    dojo.forEach(options, function(item, index) {
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
    }, this);
    
    this.finished = true;
}

Scene.prototype.clone = function clone() {
  this.stats.scene = null;
  var clonedStats = dojo.clone(this.stats);
  var scene = new Scene(this.name, clonedStats);
  scene.lines = this.lines;
  scene.labels = this.labels;
  scene.temps = dojo.clone(this.temps);
  scene.loaded = true;
  scene.testPath = dojo.clone(this.testPath);
  this.stats.scene = this;
  return scene;
}

Scene.prototype.oldGoto = Scene.prototype["goto"];

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
    //print("unseen: " + key);
    this.oldGoto(label);
}

Scene.prototype.goto_scene = Scene.prototype.ending = Scene.prototype.finish;

Scene.prototype.oldIf = Scene.prototype["if"];
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

var sceneName = arguments[0];

function StartingStats() {};
for (var i in stats) {
  StartingStats.prototype[i] = stats[i];
}

var startingStats = new StartingStats();

var scene = new Scene(sceneName, startingStats);
var originalScene = scene;
scene.testPath = [];
scene.loadLines(slurpFile("web/"+gameName+"/scenes/"+sceneName+".txt"));

print("executing");
scene.execute();

while(scene = sceneList.shift()) {
    print (scene.testPath.join(''));
    //print(sceneList.length);
    scene.resume();
}

//print(printed.join('\n'));
var uncovered = [];
for (var i = 0; i < coverage.length; i++) {
    print("line "+(i+1) +": " +coverage[i]);
    line = trim(originalScene.lines[i]);
    if (!coverage[i] && line && !/\*comment /.test(line)) {
      uncovered.push(i+1);
    }
}

if (uncovered.length) {
    print("UNCOVERED:");
    print(uncovered.join('\n'));
}