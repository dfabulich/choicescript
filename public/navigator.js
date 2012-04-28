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
function SceneNavigator(sceneList) {
    this._sceneMap = {};
    this._sceneList = sceneList;
    this.addArray(sceneList);
    this._startupScene = sceneList[0];
}

SceneNavigator.prototype.addArray = function addArray(arr) {
    for (var i = 0; i < arr.length-1; i++) {
        var scene1 = arr[i];
        var scene2 = arr[i+1];
        this._sceneMap[scene1] = scene2;
    }
}

SceneNavigator.prototype.nextSceneName = function nextSceneName(currentSceneName) {
    var nextScene = this._sceneMap[currentSceneName];
    //if (!nextScene) throw new Error("No scene follows " + currentSceneName);
    return nextScene;
}

SceneNavigator.prototype.getStartupScene = function getStartupScene() {
    return this._startupScene;
}

SceneNavigator.prototype.setStartingStatsClone = function setStartingStatsClone(stats) {
  this.startingStats = {};
  for (var i in stats) {
    this.startingStats[i] = stats[i];
  }
}

SceneNavigator.prototype.resetStats = function resetStats(stats) {
  for (var i in stats) {
    delete stats[i];
  }
  for (var i in this.startingStats) {
    stats[i] = this.startingStats[i];
  }
}

SceneNavigator.prototype.repairStats = function repairStats(stats) {
  for (var i in this.startingStats) {
    if (this.startingStats[i] == null) continue;
    if (typeof(stats[i]) === "undefined" || stats[i] === null) {
      stats[i] = this.startingStats[i];
    }
  }
}