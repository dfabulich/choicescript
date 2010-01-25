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

function safeCall(obj, fn) {
    var debug = false;
    var userAgent = this.window && window.navigator && window.navigator.userAgent;
    var isSafari = /Safari/.test(userAgent);
    var isIE = /MSIE/.test(userAgent);
    if (isIE) {
        // just call through; onerror will be called and debugger will handle it
        if (obj) {
            fn.call(obj);
        } else {
            fn.call();
        }
    } else {
        try {
            if (obj) {
                fn.call(obj);
            } else {
                fn.call();
            }
        } catch (e) {
            // On Safari we call this because it won't get called otherwise
            // On Firefox we call this because it gives us the full stack
            window.onerror(toJson(e, '\n'));
            // Rethrow here so the debugger can handle it
            // On Firefox this causes a second prompt.  Meh!
            throw e;
        }
    }
}

function isDefined(x) {
    return "undefined" !== typeof x;
}

function toJson(obj) {
 switch (typeof obj) {
  case 'object':
   if (obj) {
    var list = [];
    if (obj instanceof Array) {
     for (var i=0;i < obj.length;i++) {
      list.push(toJson(obj[i]));
     }
     return '[' + list.join(',') + ']';
    } else {
     for (var prop in obj) {
      if (prop == "scene") continue;
      list.push('"' + prop + '":' + toJson(obj[prop]));
     }
     return '{' + list.join(',') + '}';
    }
   } else {
    return 'null';
   }
  case 'string':
   return '"' + obj.replace(/(["'])/g, '\\$1') + '"';
  case 'number':
  case 'boolean':
   return new String(obj);
  case 'function':
   return 'badfunction';
  default:
   throw new Error("invalid type: " + typeof obj);
 }
}

function saveCookie(stats, temps, lineNum, indent, debug) {
    var scene = stats.scene;
    delete stats.scene;
    stats.sceneName = scene.name;
    var value = toJson({version:window.version, stats:stats, temps:temps, lineNum: lineNum, indent: indent, debug: debug});
    stats.scene = scene;
    return writeCookie(value);
}

function writeCookie(value) {
  if (!initStore()) return;
  window.store.set("state", value);
}

function clearCookie() {
    writeCookie('');
}

function initStore() {
  return false; // TODO turn persistence back on; it's confusing for first-time users
  if (window.store) return window.store;
  try {
    window.store = new Persist.Store('MyGame'); // INSERT real store name
  } catch (e) {}
  return window.store;
}
function loadAndRestoreGame() {
  if (!initStore()) return restoreGame();
  window.store.get("state", function(ok, value) {
    var state = null;
    if (ok && value) {
      state = eval("state="+value);
      //alert ("Error loading game state");
    }
    restoreGame(state);
  });
}

function isStateValid(state) {
  if (!state) return false;
  if (!state.stats) return false;
  if (!state.stats.sceneName) return false;
  if (!state.version) return false;
  if (state.version != window.version) {
    alert("We apologize, but the game must now restart to incorporate the latest bug fixes.");
    return false;
  }
  return true;
}

function restoreGame(state) {
    if (!isStateValid(state)) {
        var scene = new Scene(window.nav.getStartupScene(), window.stats, window.nav, false);
        scene.loadScene();
        safeCall(scene, scene.execute);
    } else {
      window.stats = state.stats;
      // Someday, inflate the navigator using the state object
      var scene = new Scene(state.stats.sceneName, state.stats, window.nav, state.debug);
      scene.loadScene();
      scene.temps = state.temps;
      scene.lineNum = state.lineNum;
      scene.indent = state.indent;
      safeCall(scene, scene.execute);
    }
}

function getCookieByName(cookieName, ck) {
    if (!ck) ck = window.document.cookie;
    if (!ck) return null;
    var ckPairs = ck.split(/;/);
    for (var i = 0; i < ckPairs.length; i++) {
        var ckPair = trim(ckPairs[i]);
        var ckNameValue = ckPair.split(/=/);
        var ckName = decodeURIComponent(ckNameValue[0]);
        if (ckName === cookieName) {
            return decodeURIComponent(ckNameValue[1]);
        }
    }
    return null;
}

function parseQueryString(str) {
  if (!str) return null;
  var map = {};
  var pairs = str.substring(1).split("&");
  var i = pairs.length;
  while (i--) {
    var pair = pairs[i];
    var parts = pair.split("=");
    map[parts[0]] = parts[1];
  }
  return map;
}
function trim(str) {
    if (str == null) return null;
    var result = str.replace(/^\s+/g, "");
    // strip leading
    return result.replace(/\s+$/g, "");
    // strip trailing
}


function findOptimalDomain(docDomain) {
    if (!docDomain) docDomain = document.domain;
    // localhost and 127.0.0.1 will cause cookie not to be set; just omit them, it works fine
    if (docDomain == "localhost" || docDomain == "127.0.0.1") return null;
    // ip address
    if (/^\d+\.\d+\.\d+\.\d+$/.test(docDomain)) return null;
    // dotcom
    var result = docDomain.match(/(\w+\.\w{3}$)/);
    if (result) return result[1];
    return null;
}

function num(x) {
    var x_num = x * 1; 
    if (isNaN(x_num)) throw new Error("Not a number: " + x);
    return x_num;
}

function findXhr() {
  if (window.XMLHttpRequest) return new window.XMLHttpRequest();
  var ids = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
  for (var i = 0; i < 3; i++) {
    try {
      return new ActiveXObject(ids[i]);
    } catch (e) {}
  }
  throw new Error("Couldn't create XHR object");
}