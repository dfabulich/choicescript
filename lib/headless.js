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

isRhino = typeof(java) != "undefined";

clearScreen = function clearScreen(code) {code.call();}
saveCookie = function(callback) { if (callback) callback.call(); }
doneLoading = function() {}
printFooter = function() {}
printShareLinks = function() {}
printLink = function() {}
printImage = function() {}
showPassword = function() {}

function fileExists(filePath) {
    if (isRhino) {
        return new java.io.File(filePath).exists();
    } else {
        return path.existsSync(filePath);
    }
}

function fileLastMod(filePath) {
    if (isRhino) {
        return new java.io.File("xmltranslator.js").lastModified()
    } else {
        if (path.existsSync(filePath)) return fs.statSync(filePath).mtime.getTime();
        return 0;
    }
}

function mkdirs(filePath) {
    if (isRhino) {
        new java.io.File(filePath).mkdirs()
    } else {
        if (!path.existsSync(filePath)) {
            var parentDir = path.dirname(filePath);
            if (!path.existsSync(parentDir)) {
                mkdirs(parentDir);
            }
            fs.mkdirSync(filePath);
        }
        
    }
}

function slurpFile(name, throwOnError) {
    return slurpFileLines(name, throwOnError).join('\n');
}

function slurpFileLines(name, throwOnError) {
    if (isRhino) {
        var lines = [];
        var reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(name), "UTF-8"));
        var line;
        for (var i = 0; line = reader.readLine(); i++) {
            if (i == 0 && line.charCodeAt(0) == 65279) line = line.substring(1);
            if (throwOnError) {
                var invalidCharacter = line.match(/^(.*)\ufffd/);
                if (invalidCharacter) throw new Error("line " + (i+1) + ": invalid character. Is this text Unicode?\n" + invalidCharacter[0]);
            }
            lines.push(line);
        }
        return lines;
    } else {
        var blob = fs.readFileSync(name, "utf-8");
        var lines = blob.split(/\r?\n/);
        var firstLine = lines[0]
        // strip byte order mark
        if (firstLine.charCodeAt(0) == 65279) lines[0] = firstLine.substring(1);
        if (throwOnError) {
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var invalidCharacter = line.match(/^(.*)\ufffd/);
                if (invalidCharacter) throw new Error("line " + (i+1) + ": invalid character. Is this text Unicode?\n" + invalidCharacter[0]);
            }
        }
        return lines;
    }
}

function initStore() { return false; }