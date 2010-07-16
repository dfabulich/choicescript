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
load("editor/embeddable-autotester.js");

nav.setStartingStatsClone(stats);

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

var list = arguments;
if (!list.length || (list.length == 1 && !list[0])) {
  list = [];
  var name = nav.getStartupScene();
  while (name) {
    list.push(name);
    name = nav.nextSceneName(name);
  }
  var statsFile = new java.io.File("web/"+gameName+"/scenes/choicescript_stats.txt");
  if (statsFile.exists()) {
    list.push("choicescript_stats");
  }
}

var uncoveredScenes = [];
var uncovered;

function verifyFileName(name) {
  var file = new java.io.File("web/"+gameName+"/scenes/"+name+".txt");
  if (!file.exists()) throw new Error("File does not exist: " + name);
  var canonicalName = file.getCanonicalFile().getName();
  if (name+".txt" != canonicalName) throw new Error("Incorrect capitalization/canonicalization; the file is called " + canonicalName + " but you requested " + name + ".txt");
}

Scene.prototype.verifyFileName = function commandLineVerifyFileName(name) {
  try {
    verifyFileName(name);
  } catch (e) {
    throw new Error(this.lineMsg() + e.message);
  }
  this.finish();
}

// In autotest, impossible combinations occur, so ignore all conflicting options
// We'll catch these with randomtest instead
Scene.prototype.conflictingOptions = function() {};

for (var i = 0; i < list.length; i++) {
  print(list[i]);
  java.lang.Thread.sleep(100); // sleep to allow print statements to flush :-(
  verifyFileName(list[i]);
  var sceneText = slurpFile("web/"+gameName+"/scenes/"+list[i]+".txt");
  window = {console: {log: function(msg) { print(msg); } }};
  uncovered = autotester(sceneText, nav)[1];
  if (uncovered) {
    uncoveredScenes.push({name:list[i], lines:uncovered});
  }
}

for (var i = 0; i < uncoveredScenes.length; i++) {
  var uncoveredScene = uncoveredScenes[i];
  uncoveredScene.lines.push("");
  print(uncoveredScene.lines.join(" UNCOVERED " + uncoveredScene.name + "\n"));
}


