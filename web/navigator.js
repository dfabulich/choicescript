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
    this.setSceneList(sceneList);
    this.startingStats = {implicit_control_flow:false};
}

SceneNavigator.prototype.setSceneList = function setSceneList(sceneList) {
    this._sceneList = sceneList;
    this._sceneMap = {};
    for (var i = 0; i < sceneList.length-1; i++) {
        var scene1 = sceneList[i];
        var scene2 = sceneList[i+1];
        this._sceneMap[scene1] = scene2;
    }
    this._startupScene = sceneList[0];
};

SceneNavigator.prototype.nextSceneName = function nextSceneName(currentSceneName) {
    var nextScene = this._sceneMap[currentSceneName];
    //if (!nextScene) throw new Error("No scene follows " + currentSceneName);
    return nextScene;
};

SceneNavigator.prototype.getStartupScene = function getStartupScene() {
    return this._startupScene;
};

SceneNavigator.prototype.setStartingStatsClone = function setStartingStatsClone(stats) {
  this.startingStats = {};
  for (var i in stats) {
    this.startingStats[i] = stats[i];
  }
};

SceneNavigator.prototype.resetStats = function resetStats(stats) {
  for (var i in stats) {
    delete stats[i];
  }
  for (i in this.startingStats) {
    stats[i] = this.startingStats[i];
  }
  this.bugLog = [];
};

SceneNavigator.prototype.repairStats = function repairStats(stats) {
  for (var i in this.startingStats) {
    var startingStat = this.startingStats[i];
    if (startingStat === null || startingStat === undefined) continue;
    if (typeof(stats[i]) === "undefined" || stats[i] === null) {
      stats[i] = this.startingStats[i];
    }
  }
};

SceneNavigator.prototype.bugLog = [];
SceneNavigator.prototype.achievements = {};
SceneNavigator.prototype.achievementList = [];
SceneNavigator.prototype.achieved = {};
SceneNavigator.prototype.products = {};

SceneNavigator.prototype.loadAchievements = function(achievementArray) {
  if (!achievementArray) return;
  this.achievements = {};
  this.achievementList = [];
  for (var i = 0; i < achievementArray.length; i++) {
    var achievement = achievementArray[i];
    var achievementName = achievement[0];
    var visible = achievement[1];
    var points = achievement[2];
    var title = achievement[3];
    var earnedDescription = achievement[4];
    var preEarnedDescription = achievement[5];
    this.achievements[achievementName] = {
      visible: visible,
      points: points,
      title: title,
      earnedDescription: earnedDescription,
      preEarnedDescription: preEarnedDescription
    };
    this.achievementList.push(achievementName);
  }
};
SceneNavigator.prototype.loadProducts = function(productArray, purchaseMap) {
  if (!productArray && !purchaseMap) return;
  this.products = {};
  for (var i = 0; i < productArray; i++) {
    this.products[productArray[i]] = {};
  }
  for (var scene in purchaseMap) {
    var product = purchaseMap[scene];
    this.products[product] = {};
  }
}
