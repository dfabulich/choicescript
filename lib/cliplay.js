var gameName = "mygame";
var args;
if (typeof java == "undefined") {
  // args = process.argv;
  //   args.shift();
  //   args.shift();
  var fs = require('fs');
  var path = require('path');
  eval(fs.readFileSync(__dirname + "/../public/scene.js", "utf-8"));
  eval(fs.readFileSync(__dirname + "/../public/navigator.js", "utf-8"));
  eval(fs.readFileSync(__dirname + "/../public/util.js", "utf-8"));
  //eval(fs.readFileSync(__dirname + "/headless.js", "utf-8"));
  eval(fs.readFileSync("./game.js", "utf-8"));
  function print(str) {
    console.log(str);
  }
} else {
  args = arguments;  
  load(__dirname + "/../public/scene.js");
  load(__dirname + "/../public/navigator.js");
  load(__dirname + "/../public/util.js");
  load(__dirname + "./headless.js");
  load("game.js");
}
//if (args[1]) gameName = args[1];

//var randomSeed = args[2] || 1;

function initStore() { return false; }
headless = true;
doneLoading = function() {}

var choiceStack = [];


function listenForKey() {
  var ke = new (require('events').EventEmitter);
  var keypress = require('keypress');
  keypress(process.stdin);
  var self = this;
   // listen for the "keypress" event

  process.stdin.on('keypress', function (ch, key) {
    //console.log(ch, typeof ch, key);
     if (key && key.ctrl && key.name == 'c') {
       process.stdin.pause();
       return;
     }
     if (key) {
       ke.emit(key.name);
     } else if(typeof(key) == 'undefined' && ch) {
       ke.emit(ch);
     } 
     ke.emit('keypress', ch, key);
   });
   ke.setMaxListeners(50);
   process.stdin.setRawMode(true);
   process.stdin.resume();
   
   
   return ke;
}

var keyEmitter = listenForKey();

function slurpFile(name, throwOnError) {
    return slurpFileLines(name, throwOnError).join('\n');
}

function slurpFileLines(name, throwOnError) {
    if (typeof java != "undefined") {
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

Scene.prototype.ending = function ending() {
  process.exit();
}

Scene.prototype.renderOptions = function renderOptions(groups, options, callback) {

    this.paragraph();

    var self = this;
    
    
    if (!options) throw new Error(this.lineMsg()+"undefined options");
    if (!options.length) throw new Error(this.lineMsg()+"no options");
    // global num will be used to assign accessKeys to the options
    var globalNum = 1;
    var currentOptions = options;

    for (var groupNum = 0; groupNum < groups.length; groupNum++) {
        var group = groups[groupNum];
        if (group) {
            var textBuilder = ["Select "];
            textBuilder.push(/^[aeiou]/i.test(group)?"an ":"a ");
            textBuilder.push(group);
            textBuilder.push(":");
            
            println(textBuilder.join());
        }
        var checked = null;
        for (var optionNum = 0; optionNum < currentOptions.length; optionNum++) {
            var option = currentOptions[optionNum];
            if (!checked && !option.unselectable) checked = option;
            var isLast = (optionNum == currentOptions.length - 1);
            //this.printRadioButton(div, group, option, optionNum, globalNum++, isLast, checked == option);
            (function(globalNum, groupNum, option) {
              keyEmitter.once(globalNum.toString(), function() {
                 var variable = "choice_" + (groupNum+1);
                 self.temps[variable] = null;
                 self.setVar(variable, option.name);
                 if (!callback) callback = self.standardResolution;
                 callback.call(self, option);
              });
              self.printLine("["+ globalNum +"]  " + option.name + "\n");
            })(globalNum++, groupNum, option);
            
            
            
        }
        // for rendering, the first options' suboptions should be as good as any other
        currentOptions = currentOptions[0].suboptions;
    }
}

main = {};

function log(msg, always) {
  if(always || !program.quiet)
    print(msg);
}

// var printed = [];
// printx = println = function printx(msg, parent) {
//   //printed.push(msg);
// }


slurps = {}
function slurpFileCached(name) {
  if (!slurps[name]) slurps[name] = slurpFile(name);
  return slurps[name];
}

function debughelp() {
    debugger;
}

function noop() {}
//Scene.prototype.page_break = noop;
//Scene.prototype.printLine = noop;
// Scene.prototype.subscribe = noop;
Scene.prototype.save = function(callback) { 
  //console.log(callback.toString());
  if (callback) callback.call(); 
};
Scene.prototype.stat_chart = function() {
  this.parseStatChart();
}

Scene.prototype.save_game = function(data) {
  var stack = this.tokenizeExpr(data);
  var result = this.evaluateExpr(stack);
}

// Scene.prototype.restore_game = function() {};

crc32 = noop;

// parsedLines = {};
// Scene.prototype.oldLoadLines = Scene.prototype.loadLines;
// Scene.prototype.loadLines = function cached_loadLines(str) {
//   var parsed = parsedLines[str];
//   if (parsed) {
//     this.labels = parsed.labels;
//     this.lines = parsed.lines;
//     return;
//   } else {
//     this.oldLoadLines(str);
//     parsedLines[str] = {labels: this.labels, lines: this.lines};
//   }
// }

// cachedNonBlankLines = {};
// Scene.prototype.oldNextNonBlankLine = Scene.prototype.nextNonBlankLine;
// 
// Scene.prototype.nextNonBlankLine = function cached_nextNonBlankLine(includingThisOne) {
//   var key = this.name+" "+this.lineNum +""+ !!includingThisOne;
//   var cached = cachedNonBlankLines[key];
//   if (cached) {
//     return cached;
//   }
//   cached = this.oldNextNonBlankLine(includingThisOne);
//   cachedNonBlankLines[key] = cached;
//   return cached;
// }

cachedTokenizedExpressions = {};
// Scene.prototype.oldTokenizeExpr = Scene.prototype.tokenizeExpr;
// Scene.prototype.tokenizeExpr = function cached_tokenizeExpr(str) {
//   var cached = cachedTokenizedExpressions[str];
//   if (cached) return cloneStack(cached);
//   cached = this.oldTokenizeExpr(str);
//   cachedTokenizedExpressions[str] = cloneStack(cached);
//   return cached;
//   function cloneStack(stack) {
//     var twin = new Array(stack.length);
//     var i = stack.length;
//     while (i--) {
//       twin[i] = stack[i];
//     }
//     return twin;
//   }
// }


// Scene.prototype.ending = function () {
//   this.reset();
//   this.finished = true;
// }

// Scene.prototype.restart = Scene.prototype.ending;

// Scene.prototype.input_text = function(variable) {
//    this.setVar(variable, "blah blah");
// }

// Scene.prototype.input_number = function(data) {
//    this.rand(data);
// }

// Scene.prototype.finish = function random_finish() {
//     var nextSceneName = this.nav && nav.nextSceneName(this.name);
//     this.finished = true;
//     // if there are no more scenes, then just halt
//     if (!nextSceneName) {
//         return;
//     }
//     var scene = new Scene(nextSceneName, this.stats, this.nav, this.debugMode);
//     scene.resetPage();
// }
    

// Scene.prototype.choice = function choice(data, fakeChoice) {
//     var groups = ["choice"];
//     if (data) groups = data.split(/ /);
//     var choiceLine = this.lineNum;
//     var options = this.parseOptions(this.indent, groups);
//     var flattenedOptions = [];
//     flattenOptions(flattenedOptions, options);
// 
//     var index = randomIndex(flattenedOptions.length);
// 
//     var item = flattenedOptions[index];
//     if (fakeChoice) this.temps.fakeChoiceEnd = this.lineNum;
//     this.getFormValue = function(name) {return item[name];}
// 
//     log(this.name + " " + (choiceLine+1)+'#'+(index+1)+' ('+item.ultimateOption.line+')');
//     var self = this;
//     timeout = function() {self.resolveChoice(options, groups);}
//     this.finished = true;
// 
//     function flattenOptions(list, options, flattenedOption) {
//       if (!flattenedOption) flattenedOption = {};
//       for (var i = 0; i < options.length; i++) {
//        var option = options[i];
//        flattenedOption[option.group] = i;
//        if (option.suboptions) {
//          flattenOptions(list, option.suboptions, flattenedOption);
//        } else {
//          flattenedOption.ultimateOption = option;
//           if (!option.unselectable) list.push(dojoClone(flattenedOption));
//        }
//       }
//     }
// 
//   function dojoClone(/*anything*/ o){
//    // summary:
//    //    Clones objects (including DOM nodes) and all children.
//    //    Warning: do not clone cyclic structures.
//    if(!o){ return o; }
//    if(o instanceof Array || typeof o == "array"){
//      var r = [];
//      for(var i = 0; i < o.length; ++i){
//        r.push(dojoClone(o[i]));
//      }
//      return r; // Array
//    }
//    if(typeof o != "object" && typeof o != "function"){
//      return o; /*anything*/
//    }
//    if(o.nodeType && o.cloneNode){ // isNode
//      return o.cloneNode(true); // Node
//    }
//    if(o instanceof Date){
//      return new Date(o.getTime()); // Date
//    }
//    // Generic objects
//    r = new o.constructor(); // specific to dojo.declare()'d classes!
//    for(i in o){
//      if(!(i in r) || r[i] != o[i]){
//        r[i] = dojoClone(o[i]);
//      }
//    }
//    return r; // Object
//   }
// 
// }

  Scene.prototype.loadScene = function loadScene() {
    var file = slurpFileCached('./scenes/'+this.name+'.txt');
    this.loadLines(file);
    this.loaded = true;
    if (this.executing) {
      this.execute();
    }
  }
    
clearScreen();
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

// for (i = 0; i < iterations; i++) {
  // log("*****" + i);
  timeout = null;
  var scene = new Scene(nav.getStartupScene(), stats, nav, false);
  try {
    scene.execute();
    for (var i = choiceInput.length - 1; i >= 0; i--){
       keyEmitter.emit(choiceInput[i]);
     };
    while (timeout) {
      var fn = timeout;
      timeout = null;
      fn();
    }
  } catch (e) {
    print("RANDOMTEST FAILED\n");
    print(e);
    if (typeof java != "undefined") {
      java.lang.System.exit(1);
    } else {
      process.exit(1);
    }
  }
  //nav.resetStats(stats);
// }

// for (i = 0; i < sceneNames.length; i++) {
  // var sceneName = sceneNames[i];
  var sceneLines = slurpFileLines('./scenes/'+sceneNames[0]+'.txt');
  //var sceneCoverage = coverage[sceneName];
  // for (var j = 0; j < sceneCoverage.length; j++) {
  //     log(sceneName + " "+ (sceneCoverage[j] || 0) + ": " + sceneLines[j], true);
  //   }
// }
// log("RANDOMTEST PASSED", true);





// define cli UI

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


function printx(msg, parent) {
    if (msg == null) return;
    if (msg === "") return;
    process.stdout.write(msg);
}
    
function println(msg, parent) {
    //if (!parent) parent = document.getElementById('text');
    console.log(msg);
    // var br = global.document.createElement("br");
    //     parent.appendChild(br);
}


function showStats() {
    if (global.showingStatsAlready) return;
    global.showingStatsAlready = true;
    
    var currentScene = global.stats.scene;
    
    var scene = new Scene("choicescript_stats", global.stats, this.nav);
    scene.save = function(callback) {if (callback) callback.call(scene);}; // Don't save state in stats screen, issue #70
    // TODO ban *choice/*page_break/etc. in stats screen
    scene.finish = scene.autofinish = function(buttonName) {
      this.finished = true;
      this.paragraph();
      // var p = document.createElement("p");
      //       var restartLink = document.createElement("a");
      //       restartLink.setAttribute("style", "text-decoration: underline; cursor: pointer; text-align: left");
      //       restartLink.onclick = function() {
      //           if (global.confirm("Restart your game?  Did you click that intentionally?")) {
      //               global.showingStatsAlready = false;
      //               document.getElementById("statsButton").style.display = "inline";
      //               clearCookie(function() {
      //                 global.nav.resetStats(global.stats);
      //                 clearScreen(restoreGame);
      //               }, "");
      //           }
      //           return false;
      //       }
      //       restartLink.innerHTML = "Start Over from the Beginning";  
      //       p.appendChild(restartLink);
      //       var text = document.getElementById('text');
      //       text.appendChild(p);
      // 
      //       printButton(buttonName || "Next", main, false, function() {
      //           global.stats.scene = currentScene;
      //           global.showingStatsAlready = false;
      //           document.getElementById("statsButton").style.display = "inline";
      //           clearScreen(loadAndRestoreGame);
      //       });
    }
    scene.execute();
}

function callIos(scheme, path) {}

function asyncAlert(message, callback) {
  if (false/*global.isIosApp*/) {
    // TODO asyncAlert
    global.alertCallback = callback;
    callIos("alert", message)
  } else {
    setTimeout(function() {
      console.log(message);
      if (callback) callback();
    }, 0);
  }
}

function clearScreen(code) {
  console.log('clearScreen');
  process.stdout.write('\u001B[2J\u001B[0;0f');
  if(code) code();
}

function safeSubmit(code) {
    return function safelySubmitted() {
        safeCall(code);
        return false;
    }
}

function startLoading() {
    // var loading = document.getElementById('loading');
    // if (!loading) {
    //   loading = document.createElement('div');
    //   loading.setAttribute("id", "loading");
    //   loading.innerHTML = "<p>Loading...</p><p><img src=\""+rootDir+"loader.gif\"></p>";
    //   main.appendChild(loading);
    // }
}

function doneLoading() {
    // var loading = document.getElementById('loading');
    // if (loading) loading.parentNode.removeChild(loading);
    // // TODO update header?
}

function setClass(element, classString) {
  // element.setAttribute("class", classString);
  // element.setAttribute("className", classString);
}
  
function printFooter() {
  // var footer = document.getElementById('footer');
  // We could put anything we want in the footer here, but perhaps we should avoid it.
  // setTimeout(function() {callIos("curl");}, 0);
}

function printImage(source, alignment) {
  // var img = document.createElement("img");
  // img.src = source;
  // setClass(img, "align"+alignment);
  // document.getElementById("text").appendChild(img);
}

function moreGames() {

}

function printShareLinks(target, now) {}
function subscribe() {}

// Callback expects a map from product ids to booleans
function checkPurchase(products, callback) {
}

function isRestorePurchasesSupported() {
}

function restorePurchases(callback) {
}
// Callback expects a localized string, or "", or "free", or "guess"
function getPrice(product, callback) {
}
// Callback expects no args, but should only be called on success
function purchase(product, callback) {
}

function isFullScreenAdvertisingSupported() {
  return false;
}

function showFullScreenAdvertisement(callback) {
}

function showTicker(target, endTimeInSeconds, finishedCallback, skipCallback) {
  if (!target) target = document.getElementById('text');
  var div = document.createElement("div");
  target.appendChild(div);
  var timerDisplay = document.createElement("div");
  div.appendChild(timerDisplay);
  var timer;

  var defaultStatsButtonDisplay = document.getElementById("statsButton").style.display;
  document.getElementById("statsButton").style.display = "none";


  if (endTimeInSeconds > Math.floor(new Date().getTime() / 1000)) {
    if (global.isAndroidApp) {
      notificationBridge.scheduleNotification(endTimeInSeconds);
    } else if (global.isIosApp) {
      callIos("schedulenotification", endTimeInSeconds);
    }
  }
  
  function cleanUpTicker() {
    global.tickerRunning = false;
    if (global.isAndroidApp) {
      notificationBridge.cancelNotification();
    } else if (global.isIosApp) {
      callIos("cancelnotifications");
    }
    clearInterval(timer);
    document.getElementById("statsButton").style.display = defaultStatsButtonDisplay;
  }

  function formatSecondsRemaining(secondsRemaining, forceMinutes) {
    if (!forceMinutes && secondsRemaining < 60) {
      return ""+secondsRemaining+"s";
    } else {
      var minutesRemaining = Math.floor(secondsRemaining / 60);
      if (minutesRemaining < 60) {
        var remainderSeconds = secondsRemaining - minutesRemaining * 60;
        return ""+minutesRemaining+"m " + formatSecondsRemaining(remainderSeconds);
      } else {
        var hoursRemaining = Math.floor(secondsRemaining / 3600);
        var remainderSeconds = secondsRemaining - hoursRemaining * 3600;
        return ""+hoursRemaining+"h " + formatSecondsRemaining(remainderSeconds, true);
      }
    }
  }

  function tick() {
    global.tickerRunning = true;
    var tickerStillVisible = div.parentNode && div.parentNode.parentNode;
    if (!tickerStillVisible) {
      cleanUpTicker();
      return;
    }
    var nowInSeconds = Math.floor(new Date().getTime() / 1000);
    var secondsRemaining = endTimeInSeconds - nowInSeconds;
    if (secondsRemaining >= 0) {
      timerDisplay.innerHTML = "" + formatSecondsRemaining(secondsRemaining) + " seconds remaining";
    } else {
      cleanUpTicker();
      div.innerHTML = "0s remaining";
      if (finishedCallback) finishedCallback();
    }
  }

  timer = setInterval(tick, 1000);
  tick();

  if (skipCallback) skipCallback(div, function() {
    endTimeInSeconds = 0;
    tick();
  });
}







function printButton(name, parent, isSubmit, code) {
  println(name);
  //console.log(code.toString());
  if(code) keyEmitter.once('enter', code);

  // make `process.stdin` begin emitting "keypress" events
 
  //return button;
}

function printLink(target, href, anchorText) {
  // if (!target) target = document.getElementById('text');
  // var link = document.createElement("a");
  // link.setAttribute("href", href);
  // link.appendChild(document.createTextNode(anchorText));
  // target.appendChild(link);
  print(anchorText);
}

function printInput(target, inputType, callback, minimum, maximum, step) {
  printx("> ");
  var inp = "";
  var ignore = true;
  function ls(ch, key) {
    if(key && key.name == 'enter') {
      keyEmitter.removeListener('keypress', ls);
      callback(inp);
    } else if(key && key.name == 'backspace') {
      inp =  inp.slice(0,inp.length-1);
      printx("\b \b");
    } else if(!ignore) {
      printx(ch);
      inp += ch;
    } else {
      ignore = false;
    }
  }
  keyEmitter.on('keypress', ls);
}

function promptEmailAddress(target, defaultEmail, callback) {
  // if (!target) target = document.getElementById('text');
  //   var form = document.createElement("form");
  //   var self = this;
  //   form.action="#";
  //   
  //   var message = document.createElement("div");
  //   message.style.color = "red";
  //   message.style.fontWeight = "bold";
  //   form.appendChild(message);
  //   
  //   var input = document.createElement("input");
  //   // This can fail on IE
  //   try { input.type="email"; } catch (e) {}
  //   input.name="email";
  //   input.value=defaultEmail;
  //   input.setAttribute("style", "font-size: 25px; width: 90%;");
  //   form.appendChild(input);
  //   target.appendChild(form);
  //   println("", form);
  //   println("", form);
  //   printButton("Next", form, true);
  //   
  //   printButton("Cancel", target, false, function() {
  //     callback(true);
  //   });
  //   
  //   form.onsubmit = function(e) {
  //     preventDefault(e);
  //     safeCall(this, function() {
  //       var email = trim(input.value);
  //       if (!/^\S+@\S+\.\S+$/.test(email)) {
  //         var messageText = document.createTextNode("Sorry, \""+email+"\" is not an email address.  Please type your email address again.");
  //         message.innerHTML = "";
  //         message.appendChild(messageText);
  //       } else {
  //         recordEmail(email, function() {
  //           callback(false, email);
  //         });
  //       }
  //     });
  //   };
  //   
  //   setTimeout(function() {callIos("curl");}, 0);
}

function preventDefault(event) {
  // if (!event) event = global.event;
  //   if (event.preventDefault) {
  //     event.preventDefault();
  //   } else {
  //     event.returnValue = false;
  //   }
}

function getPassword(target, code) {
  // if (!target) target = document.getElementById('text');
  //   var textArea = document.createElement("textarea");
  //   textArea.cols = 41;
  //   textArea.rows = 30;
  //   setClass(textArea, "savePassword");
  //   target.appendChild(textArea);
  //   println("", target);
  //   printButton("Next", target, false, function() {
  //     code(false, textArea.value);
  //   });
  //   
  //   printButton("Cancel", target, false, function() {
  //     code(true);
  //   });
}

function showPassword(target, password) {
  // if (!target) target = document.getElementById('text');
  //   
  //   var textBuffer = [];
  //   var colWidth = 40;
  //   for (var i = 0; i < password.length; i++) {
  //     textBuffer.push(password.charAt(i));
  //     if ((i + 1) % colWidth == 0) {
  //       textBuffer.push('\n');
  //     }
  //   }
  //   password = "----- BEGIN PASSWORD -----\n" + textBuffer.join('') + "\n----- END PASSWORD -----";
  //   
  //   var shouldButton = isMobile;
  //   if (shouldButton) {
  //     var button = printButton("Email My Password to Me", target, false, 
  //       function() { 
  //         safeCall(self, function() {
  //             if (isWeb) {
  //               // TODO more reliable system
  //             }
  //             global.location.href = "mailto:?subject=Save%20this%20password&body=" + encodeURIComponent(password);
  //         });
  //       }
  //     );
  //     setClass(button, "");
  //   }
  //   
  //   var shouldTextArea = !isMobile;
  //   if (shouldTextArea) {
  //     var textArea = document.createElement("textarea");
  //     textArea.cols = colWidth + 1;
  //     textArea.rows = 30;
  //     setClass(textArea, "savePassword");
  // 
  //     textArea.setAttribute("readonly", true);
  //     textArea.onclick = function() {textArea.select();}
  //     textArea.value = (password);
  //     target.appendChild(textArea);
  //   }
} 

// global.isWebOS = /webOS/.test(navigator.userAgent);
// global.isMobile = isWebOS || /Mobile/.test(navigator.userAgent);
// global.isFile = /^file:/.test(global.location.href);
// global.isWeb = /^https?:/.test(global.location.href);
// global.isSafari = /Safari/.test(navigator.userAgent);
// global.isIE = /MSIE/.test(navigator.userAgent);
// global.isIPad = /iPad/.test(navigator.userAgent);
// global.isKindleFire = /Kindle Fire/.test(navigator.userAgent);

global.loadTime = new Date().getTime();



// if ( document.addEventListener ) {
//   document.addEventListener( "DOMContentLoaded", global.onload, false );
// }




