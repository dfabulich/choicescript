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

 // autotest.js [sceneName1] [sceneName2] [sceneName3]
var gameName = "mygame";
if (typeof java == "undefined") {
  var fs = require('fs');
  var path = require('path');
  eval(fs.readFileSync("web/scene.js", "utf-8"));
  eval(fs.readFileSync("web/navigator.js", "utf-8"));
  eval(fs.readFileSync("web/util.js", "utf-8"));
  eval(fs.readFileSync("headless.js", "utf-8"));
  eval(fs.readFileSync("web/"+gameName+"/"+"mygame.js", "utf-8"));
  eval(fs.readFileSync("editor/embeddable-autotester.js", "utf-8"));
  function print(str) {
    console.log(str);
  }
} else {
  load("web/scene.js");
  load("web/navigator.js");
  load("web/util.js");
  load("headless.js");
  load("web/"+gameName+"/"+"mygame.js");
  load("editor/embeddable-autotester.js");
  if (typeof(console) == "undefined") console = {log: print};
}

nav.setStartingStatsClone(stats);

var sceneList = [];

function debughelp() {
    debugger;
}
var list;
if (isRhino) {
  list = arguments;
} else {
  list = process.argv;
  list.shift();
  list.shift();
}
if (!list.length || (list.length == 1 && !list[0])) {
  list = [];
  var name = nav.getStartupScene();
  while (name) {
    list.push(name);
    name = nav.nextSceneName(name);
  }
  if (fileExists("web/"+gameName+"/scenes/choicescript_stats.txt")) {
    list.push("choicescript_stats");
  }
}

var uncoveredScenes = [];
var uncovered;

function verifyFileName(name) {
  var filePath = "web/"+gameName+"/scenes/"+name+".txt";
  if (!fileExists(filePath)) throw new Error("File does not exist: " + name);
  if (isRhino) {
    var file = new java.io.File(filePath);
    var canonicalName = file.getCanonicalFile().getName();
    if (name+".txt" != canonicalName) throw new Error("Incorrect capitalization/canonicalization; the file is called " + canonicalName + " but you requested " + name + ".txt");
  } else {
    var canonicalName = path.basename(fs.realpathSync(filePath));
    if (name+".txt" != canonicalName) throw new Error("Incorrect capitalization/canonicalization; the file is called " + canonicalName + " but you requested " + name + ".txt");
  }
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
  if (isRhino) java.lang.Thread.sleep(100); // sleep to allow print statements to flush :-(
  try {
    verifyFileName(list[i]);
    var sceneText = slurpFile("web/"+gameName+"/scenes/"+list[i]+".txt", true /*throwOnError*/);
    uncovered = autotester(sceneText, nav, list[i])[1];
  } catch (e) {
    print("QUICKTEST FAILED\n");
    print(e);
    if (isRhino) {
      java.lang.System.exit(1);
    } else {
      process.exit(1);
    }
  }
  if (uncovered) {
    uncoveredScenes.push({name:list[i], lines:uncovered});
  }
}

var allLinesTested = true;
for (var i = 0; i < uncoveredScenes.length; i++) {
  allLinesTested = false;
  var uncoveredScene = uncoveredScenes[i];
  uncoveredScene.lines.push("");
  print(uncoveredScene.lines.join(" UNTESTED " + uncoveredScene.name + "\n"));
}

if (!allLinesTested) print("SOME LINES UNTESTED");
print("QUICKTEST PASSED");
