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
printed = [];
headless = true;
debughelp = function debughelp() {
  debugger;
}
printx = function printx(msg, parent) {
    printed.push(msg);
}
function println(msg, parent) {
    printed.push(msg);
    printed.push("<br>");
}

clearScreen = function clearScreen(code) {code.call();}
saveCookie = function(callback) { if (callback) callback.call(); }
doneLoading = function() {}
printFooter = function() {}
printShareLinks = function() {}
showPassword = function() {}

function slurpFile(name) {
    return slurpFileLines(name).join('\n');
}

function slurpFileLines(name) {
    var lines = [];
    var reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(name), "UTF-8"));
    var line = reader.readLine();
    // strip byte order mark
    if (line.charCodeAt(0) == 65279) line = line.substring(1);
    lines.push(line);
    while (line = reader.readLine()) {
      lines.push(line);
    }
    return lines;
}

function initStore() { return false; }