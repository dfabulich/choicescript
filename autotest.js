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

 // autotest.js mygame [sceneName1] [sceneName2] [sceneName3]
var list;
var gameName;
if (typeof java == "undefined") {
  list = process.argv;
  list.shift();
  list.shift();
  gameName = list.shift();
  fs = require('fs');
  vm = require('vm');
  path = require('path');
  load = function(file) {
    vm.runInThisContext(fs.readFileSync(file), file);
  };
  load("web/scene.js");
  load("web/navigator.js");
  load("web/util.js");
  load("headless.js");
  load("web/"+gameName+"/"+"mygame.js");
  load("editor/embeddable-autotester.js");
  print = function print(str) {
    console.log(str);
  };
} else {
  list = arguments;
  gameName = list.shift();
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
var fullGame = false;
if (!list.length || (list.length == 1 && !list[0])) {
  fullGame = true;
  list = [];
  var sceneName = nav.getStartupScene();
  while (sceneName) {
    list.push(sceneName+".txt");
    sceneName = nav.nextSceneName(sceneName);
  }
  if (fileExists("web/"+gameName+"/scenes/choicescript_stats.txt")) {
    list.push("choicescript_stats.txt");
  }
  if (fileExists("web/"+gameName+"/scenes/choicescript_upgrade.txt")) {
    list.push("choicescript_upgrade.txt");
  }
} else {
  for (var i = list.length - 1; i >= 0; i--) {
    list[i] += ".txt";
  }
}

var uncoveredScenes = [];
var uncovered;

var sceneFileSet;
verifyFileName = function verifyFileName(name) {
  var filePath = "web/"+gameName+"/scenes/"+name;
  if (!fileExists(filePath)) throw new Error("File does not exist: " + name);
  var canonicalName, fileName, i;
  if (isRhino) {
    var file = new java.io.File(filePath);
    fileName = file.getName();
    canonicalName = file.getCanonicalFile().getName();
    if (fileName != canonicalName) throw new Error("Incorrect capitalization/canonicalization; the file is called " + canonicalName + " but you requested " + name);
  } else {
    if (!sceneFileSet) {
      sceneFileSet = {};
      var sceneFiles = fs.readdirSync("web/"+gameName+"/scenes");
      for (i = sceneFiles.length - 1; i >= 0; i--) {
        sceneFileSet[sceneFiles[i]] = 1;
      }
    }
    if (!sceneFileSet[name]) {
      for (var sceneFile in sceneFileSet) {
        if (sceneFile.toLowerCase() == name.toLowerCase()) {
          throw new Error("Incorrect capitalization/canonicalization; the file is called " + sceneFile + " but you requested " + name);
        }
      }
      throw new Error("Incorrect capitalization/canonicalization? you requested " + name + " but that file doesn't exist");
    }
  }
  if (fullGame) {
    // add the scene to the list if it isn't in mygame.js
    var found = false;
    for (i = 0; i < list.length && !found; i++) {
      found = list[i] == name;
    }
    if (!found) {
      list.push(name);
    }
  }
};

Scene.prototype.verifyFileName = function commandLineVerifyFileName(name) {
  try {
    verifyFileName(name+".txt");
  } catch (e) {
    throw new Error(this.lineMsg() + e.message);
  }
  this.finish();
};

// In autotest, impossible combinations occur, so ignore all conflicting options
// We'll catch these with randomtest instead
Scene.prototype.conflictingOptions = function() {};

for (var i = 0; i < list.length; i++) {
  print(list[i]);
  if (isRhino) java.lang.Thread.sleep(100); // sleep to allow print statements to flush :-(
  try {
    var fileName = list[i];
    var sceneName = fileName.replace(/\.txt$/, "");
    verifyFileName(fileName);
    var sceneText = slurpFile("web/"+gameName+"/scenes/"+fileName, true /*throwOnError*/);
    uncovered = autotester(sceneText, nav, sceneName)[1];
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
