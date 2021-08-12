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

_global = typeof globalThis !== "undefined" ? globalThis : this;

(function() {
  var userAgent, url, protocol, appMeta;
  if (typeof window !== "undefined") {
    userAgent = navigator.userAgent;
    url = window.location.href;
    protocol = window.location.protocol;
    appMeta = window.document.querySelector("meta[name=apple-itunes-app]");
  }
  _global.isWebOS = /webOS/.test(userAgent);
  _global.isMobile = _global.isWebOS || /Mobile/.test(userAgent);
  _global.isFile = /^file:/.test(url);
  _global.isXul = /^chrome:/.test(url);
  try {
    _global.greenworks = require('greenworks');
    _global.isGreenworks = true;
  } catch (ignored) {}
  _global.isWinOldApp = false;
  try {
    isWinOldApp = window.external.IsWinOldApp();
  } catch (ignored) {}
  _global.isAndroid = /Android/.test(userAgent);
  _global.isOmnibusApp = /CoGnibus/.test(userAgent);
  _global.isIosApp = _global.isIosApp || (_global.isOmnibusApp && !_global.isAndroid);
  _global.isAndroidApp = _global.isAndroidApp || (_global.isOmnibusApp && _global.isAndroid);
  _global.isAmazonAndroidApp = _global.isAmazonAndroidApp || (_global.isAndroidApp && _global.flavor && _global.flavor.isAmazon());
  _global.isWeb = !_global.isIosApp && !_global.isAndroidApp && !_global.isWinOldApp && /^https?:/.test(url);
  _global.isSecureWeb = /^https:?$/.test(protocol);
  _global.isSafari = /Safari/.test(userAgent);
  _global.isIE = /(MSIE|Trident)/.test(userAgent);
  _global.isIPad = /iPad/.test(userAgent);
  _global.isIPhone = /iPhone/.test(userAgent);
  _global.isKindleFire = /Kindle Fire/.test(userAgent);
  _global.isWinStoreApp = "ms-appx:" == protocol;
  _global.isCef = !!_global.cefQuery;
  _global.isNode = typeof process !== "undefined";
  _global.isHeartsChoice = appMeta && /1487052276/.test(appMeta.getAttribute("content"))
})();

_global.loadTime = new Date().getTime();

function callIos(scheme, path) {
  if (!_global.isIosApp) return;
  if (typeof webkit !== "undefined" && webkit.messageHandlers) {
    return webkit.messageHandlers.choicescript.postMessage([scheme, path]);
  }
  if (path) {
    path = encodeURIComponent(path).replace(/[!~*')(]/g, function(match) {
      return "%" + match.charCodeAt(0).toString(16);
    });
  } else {
    path = "";
  }
  setTimeout(function() {
    var iframe = document.createElement("IFRAME");
    iframe.setAttribute("src", scheme + "://" + path);
    iframe.setAttribute("style", "display:none");
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;
  }, 0);
}

function safeCall(obj, fn) {
    if (!fn) return;
    var isHeadless = typeof window == "undefined";
    var debug = false || (!isHeadless && window.debug);
    if (isIE || isHeadless) {
        // just call through; onerror will be called and debugger will handle it
        if (typeof MSApp != "undefined") {
            if (obj) {
                MSApp.execUnsafeLocalFunction(function () { fn.call(obj); });
            } else {
                MSApp.execUnsafeLocalFunction(fn);
            }
        } else if (obj) {
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
            if (e.message) {
              window.onerror(e.message, e.fileName, e.lineNumber, e.stack);
            } else if (e.stack) {
              window.onerror(e.stack, e.fileName, e.lineNumber, e.stack);
            } else {
              window.onerror(toJson(e, '\n'));
            }

            if (window.console) {
              window.console.error(e);
              if (e.message) window.console.error("Message: " + e.message);
              if (e.stack) window.console.error("Stack: " + e.stack);
            }
            // Rethrow here so the debugger can handle it
            // On Firefox this causes a second prompt.  Meh!
            if (debug) throw e;
        }
    }
}

function safeCallback(callback) {
  return function() {
    safeCall(null, callback);
  };
}

function safeTimeout(fn, time) {
  setTimeout(function() {
    safeCall(null, fn);
  }, time);
}

function isDefined(x) {
    return "undefined" !== typeof x;
}

function jsonStringifyAscii(obj) {
  var output = JSON.stringify(obj).replace(/(.)/g, function(x) {
    var code = x.charCodeAt(0);
    if (code > 127 || code < 32) {
     var outCode = code.toString(16);
     switch (outCode.length) {
       case 4:
         return "\\u" + outCode;
       case 3:
         return "\\u0" + outCode;
       case 2:
         return "\\u00" + outCode;
       case 1:
         return "\\u000" + outCode;
       default:
         return x;
     }
    }
    return x;
  });
  return output;
}

function toJson(obj, standardized) {
 if (typeof JSON != "undefined" && JSON.stringify) {
  return jsonStringifyAscii(obj);
 }
 switch (typeof obj) {
  case 'object':
   if (obj) {
    var list = [];
    if (obj instanceof Array) {
     for (var i=0;i < obj.length;i++) {
      list.push(toJson(obj[i], standardized));
     }
     return '[' + list.join(',') + ']';
    } else {
     for (var prop in obj) {
      if (prop == "scene") continue;
      if (!standardized && /^[a-zA-Z][a-zA-Z_0-9]\w+$/.test(prop) && !/\b(abstract|boolean|break|byte|case|catch|char|class|comment|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|label|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throws|transient|true|try|typeof|var|void|volatile|while|with)\b/.test(prop)) {
        list.push(prop + ':' + toJson(obj[prop], standardized));
      } else {
        list.push('"' + prop + '":' + toJson(obj[prop], standardized));
      }
     }
     return '{' + list.join(',') + '}';
    }
   } else {
    return 'null';
   }
   break;
  case 'string':
   var encoded = obj.replace(/(.)/g, function(x) {
     if (x == "'" || x == '"' || x == '\\') {
       return "\\" + x;
     }
     var code = x.charCodeAt(0);
     if (code > 127 || code < 32) {
       var outCode = code.toString(16);
       switch (outCode.length) {
         case 4:
           return "\\u" + outCode;
         case 3:
           return "\\u0" + outCode;
         case 2:
           return "\\u00" + outCode;
         case 1:
           return "\\u000" + outCode;
         default:
           return x;
       }
     }
     return x;
   });
   return '"' + encoded + '"';
  case 'number':
  case 'boolean':
   return String(obj);
  case 'function':
   return 'badfunction';
  case 'undefined':
    return 'undefined';
  default:
   throw new Error("invalid type: " + typeof obj);
 }
}

var loginUrlBase = "https://www.choiceofgames.com/api/";
function xhrAuthRequest(method, endpoint, callback) {
  var paramBuilder = new Array(arguments.length*3);
  for (var i = 3; i < arguments.length; i=i+2) {
    if (i > 3) paramBuilder.push("&");
    paramBuilder.push(arguments[i]);
    paramBuilder.push("=");
    paramBuilder.push(arguments[i+1]);
  }
  var params = paramBuilder.join("");
  var xhr = findXhr();
  if (method == "POST") {
    xhr.open(method, loginUrlBase + endpoint + ".php", true);
    xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
  } else {
    xhr.open(method, loginUrlBase + endpoint + ".php?" + params, true);
  }

  var done = false;

  xhr.onreadystatechange = function() {
    if (done) return;
    if (xhr.readyState != 4) return;
    done = true;
    var ok = xhr.status == 200;
    var response = {};
    try {
      if (xhr.responseText) response = JSON.parse(xhr.responseText);
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      if (!response.error) response.error = "unknown error";
      response.status = xhr.status;
    }
    if (callback) safeCall(null, function() {callback(ok, response);});
  };
  xhr.send(params);
}

function login(email, password, register, subscribe, callback) {
  xhrAuthRequest("POST", "login", callback, "email", encodeURIComponent(email), "password", encodeURIComponent(password), "register", register, "subscribe", subscribe);
}

function forgotPassword(email, callback) {
  xhrAuthRequest("POST", "forgot", callback, "email", encodeURIComponent(email));
}

function logout(callback) {
  document.cookie = 'login=0;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  xhrAuthRequest("GET", "logout", callback);
  recordLogin(false);
  window.knownPurchases = null;
  window.registered = false;
  if (typeof FB != "undefined" && FB.logout) FB.logout();
  if (typeof gapi != "undefined" && gapi.auth && gapi.auth.signOut) gapi.auth.signOut();
}

function recordLogin(registered, loginId, email, callback) {
  if (initStore()) {
    if (registered) recordEmail(email);
    window.store.set("login", loginId || 0, function() {safeCall(null, callback);});
    window.registered = registered;
  } else {
    safeTimeout(callback, 0);
  }
}

function getRemoteEmail(callback) {
  xhrAuthRequest("GET", "getuser", callback);
}

function saveCookie(callback, slot, stats, temps, lineNum, indent) {
    var value = computeCookie(stats, temps, lineNum, indent);
    return writeCookie(value, slot, callback);
}

function computeCookie(stats, temps, lineNum, indent) {
  var scene = stats.scene;
  delete stats.scene;
  if (scene) stats.sceneName = scene.name;
  var version = "UNKNOWN";
  if (typeof(window) != "undefined" && window && window.version) version = window.version;
  var value = toJson({version:version, stats:stats, temps:temps, lineNum: lineNum, indent: indent});
  stats.scene = scene;
  return value;
}

function writeCookie(value, slot, callback) {
  if (!_global.pseudoSave) _global.pseudoSave = {};
  if (!slot) {
    slot = "";
  }
  _global.pseudoSave[slot] = value;
  if (!initStore()) {
    if (callback) safeTimeout(callback, 0);
    return;
  }
  window.store.set("state"+slot, value, safeCallback(callback));
}

function clearCookie(callback, slot) {
    writeCookie('', slot, safeCallback(callback));
}

function areSaveSlotsSupported() {
  return !!(initStore() && window.Persist.type != "cookie");
}

function recordSave(slot, callback) {
  if (!areSaveSlotsSupported()) {
    safeTimeout(callback, 0);
    return;
  }
  restoreObject(initStore(), "save_list", [], function (saveList) {
    saveList.push(slot);
    window.store.set("save_list", toJson(saveList), safeCallback(callback));
  });
}

function recordDirtySlots(slots, callback) {
  if (!areSaveSlotsSupported()) {
    safeTimeout(callback, 0);
    return;
  }
  restoreObject(initStore(), "dirty_save_list", [], function (saveList) {
    saveSet = {};
    for (var i = 0; i < saveList.length; i++) {
      saveSet[saveList[i]] = 1;
    }
    for (i = 0; i < slots.length; i++) {
      if (!saveSet[slots[i]]) saveList.push(slots[i]);
    }
    window.store.set("dirty_save_list", toJson(saveList), safeCallback(callback));
  });
}

function recordEmail(email, callback) {
  if (initStore()) {
    window.recordedEmail = email;
    window.store.set("email", email, safeCallback(callback));
  } else {
    safeTimeout(callback, 0);
  }
}

function fetchEmail(callback) {
  if (!initStore()) {
    safeTimeout(function(){callback("");}, 0);
    return;
  }
  if (window.recordedEmail) {
    return safeTimeout(function() {
      callback(window.recordedEmail);
    })
  }
  if (window.isWeb) {
    var cookieEmail = getCookieByName("login");
    if (/@/.test(cookieEmail)) {
      return recordEmail(cookieEmail, function() {
        callback(cookieEmail);
      });
    }
  }
  // For some reason, this get seems to not respond sometimes
  // adding a fallback timeout
  window.store.get("email", function(ok, value) {
    safeCall(null, function() {
      if (ok) window.recordedEmail = value;
      if (!callback) return;
      var temp = callback;
      callback = null;
      if (ok && value) {
        temp(value);
      } else {
        temp("");
      }
    });
  });
  safeTimeout(function() {
    if (!callback) return;
    var temp = callback;
    callback = null;
    temp("");
  }, 1000);
}

function restoreObject(store, key, defaultValue, callback) {
  if (!store) {
    safeTimeout(function() {callback(defaultValue);}, 0);
    return;
  }
  store.get(key, function(ok, value) {
    var result = defaultValue;
    if (ok && value) {
      try{
        result = jsonParse(value);
      } catch (e) {}
    }
    safeCall(null, function() {callback(result);});
  });
}

function getDirtySaveList(callback) {
  restoreObject(initStore(), "dirty_save_list", [], function (slotList) {
    callback(slotList);
  });
}

function remoteSaveMerger(i, callback) {
  var remoteStore = new Persist.Store(window.remoteStoreNames[i]);
  restoreObject(remoteStore, "save_list", [], function (remoteSlotList) {
    fetchSavesFromSlotList(remoteStore, remoteSlotList, 0, [], function(remoteSaveList) {
      mergeRemoteSaves(remoteSaveList, 0/*recordDirty*/, function() {
        i++;
        if (i < window.remoteStoreNames.length) {
          remoteSaveMerger(i, callback);
        } else {
          callback.apply(null, arguments);
        }
      });
    });
  });
}

function getSaves(callback) {
  if (window.remoteStoreNames && window.remoteStoreNames.length) {
    remoteSaveMerger(0, callback);
  } else if (window.remoteStoreName && window.storeName != window.remoteStoreName) {
    var remoteStore = new Persist.Store(window.remoteStoreName);
    restoreObject(remoteStore, "save_list", [], function (remoteSlotList) {
      fetchSavesFromSlotList(remoteStore, remoteSlotList, 0, [], function(remoteSaveList) {
        mergeRemoteSaves(remoteSaveList, 0/*recordDirty*/, callback);
      });
    });
  } else {
    restoreObject(initStore(), "save_list", [], function (localSlotList) {
      fetchSavesFromSlotList(initStore(), localSlotList, 0, [], callback);
    });
  }
}

function fetchSavesFromSlotList(store, slotList, i, saveList, callback) {
  if (i >= slotList.length) {
    return safeCall(null, function() {callback(saveList);});
  }
  restoreObject(store, "state"+slotList[i], null, function(saveState) {
    if (saveState) {
      saveState.timestamp = slotList[i].substring(4/*"save".length*/);
      saveList.push(saveState);
    }
    fetchSavesFromSlotList(store, slotList, i+1, saveList, callback);
  });
}

function isWebSavePossible() {
  if (!initStore()) return false;
  if (/^http/.test(window.location.protocol)) {
    return document.domain == window.webSaveDomain || document.domain == "localhost";
  }
  // if it's a file URL with a valid store, either you're a 3rd party developer
  // who knows what you're doing, or you're a mobile app
  return true;
}


webSaveDomain = "www.choiceofgames.com";
webSaveUrl = "https://" + webSaveDomain + "/ajax_proxy.php/websave";

function submitRemoteSave(slot, email, subscribe, callback) {
  if (!isWebSavePossible()) return safeTimeout(function() { callback(false); });
  window.store.get("state"+slot, function(ok, value) {
    if (ok) {
      var timestamp = slot.substring(4/*"save".length*/);
      var xhr = findXhr();
      var gameName = window.remoteStoreName || window.storeName;
      var params = "email="+email+"&game="+gameName+"&realGame="+window.storeName+"&json="+encodeURIComponent(value)+"&timestamp="+ timestamp+"&subscribe="+subscribe;
      xhr.open("POST", webSaveUrl,true);
      xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
      var done = false;

      xhr.onreadystatechange = function() {
        if (done) return;
        if (xhr.readyState != 4) return;
        done = true;
        var ok = xhr.status == 200;
        if (ok) {
          safeCall(null, function() {callback(true);});
        } else {
          recordDirtySlots([slot], function() {
            safeCall(null, function() {callback(false);});
          });
        }
      };
      xhr.send(params);
    } else {
      recordDirtySlots([slot], function() {
        asyncAlert("There was a problem uploading the saved game. This is probably a bug; please contact support@choiceofgames.com with code 17891.", function() {
          safeCall(null, function() {callback(false);});
        });
      });
    }
  });
}

function submitDirtySaves(dirtySaveList, email, callback) {
  function submitDirtySave(i) {
    if (dirtySaveList[i]) {
      submitRemoteSave(dirtySaveList[i], email, false, function(ok) {
        if (ok) {
          submitDirtySave(i+1);
        } else {
          safeCall(null, function() {callback(false);});
        }
      });
    } else {
      window.store.remove("dirty_save_list", function() {
        safeCall(null, function() {callback(true);});
      });
    }
  }
  submitDirtySave(0);
}

function submitAnyDirtySaves(callback) {
  if (!callback) callback = function(ok) {};
  try {
    getDirtySaveList(function(dirtySaveList) {
      if (dirtySaveList && dirtySaveList.length) {
        try {
          fetchEmail(function(email) {
            if (email) {
              submitDirtySaves(dirtySaveList, email, callback);
            } else {
              callback(false);
            }
          });
        } catch (e) {
          callback(false);
        }
      }
    });
  } catch (e) {
    callback(false);
  }
}

function getRemoteSaves(email, callback) {
  if (!isWebSavePossible()) {
    safeTimeout(function() {callback([]);}, 0);
    return;
  }
  var xhr = findXhr();
  var gameName = window.remoteStoreName || window.storeName;
  xhr.open("GET", webSaveUrl + "?email="+email+"&game="+gameName, true);
  var done = false;
  xhr.onreadystatechange = function() {
    if (done) return;
    if (xhr.readyState != 4) return;
    done = true;
    if (xhr.status != 200) {
      if (window.console) console.log("Couldn't load remote saves. " + xhr.status + ": " + xhr.responseText);
      safeCall(null, function() {callback(null);});
    } else {
      var result = xhr.responseText;
      result = jsonParse(result);
      var remoteSaveList = [];
      for (var i = 0; i < result.length; i++) {
        if (!result[i]) continue;
        var save = result[i].json;
        if (!save) continue;
        save.timestamp = result[i].timestamp;
        remoteSaveList.push(save);
      }
      safeCall(null, function() {callback(remoteSaveList);});
    }
  };
  xhr.send();
}

function mergeRemoteSaves(remoteSaveList, recordDirty, callback) {
  if (!isWebSavePossible()) {
    safeTimeout(function() { callback([], 0, []); }, 0);
    return;
  }
  restoreObject(initStore(), "save_list", [], function (localSlotList) {
    fetchSavesFromSlotList(initStore(), localSlotList, 0, [], function(localSaveList) {
      var localSlotMap = {};
      for (var i = 0; i < localSlotList.length; i++) {
        localSlotMap[localSlotList[i]] = 1;
      }
      var remoteSlotMap = {};
      for (i = 0; i < remoteSaveList.length; i++) {
        remoteSlotMap["save"+remoteSaveList[i].timestamp] = 1;
      }
      var newRemoteSaves = 0;
      for (i = 0; i < remoteSaveList.length; i++) {
        var remoteSave = remoteSaveList[i];
        var slot = "save"+remoteSave.timestamp;
        if (!localSlotMap[slot]) {
          saveCookie(null, slot, remoteSave.stats, remoteSave.temps, remoteSave.lineNum, remoteSave.indent);
          localSlotList.push(slot);
          localSaveList.push(remoteSave);
          newRemoteSaves++;
        }
      }

      var dirtySaveList = [];
      for (i = 0; i < localSlotList.length; i++) {
        if (!remoteSlotMap[localSlotList[i]]) {
          dirtySaveList.push(localSlotList[i]);
        }
      }

      if (recordDirty) {
        window.store.set("dirty_save_list", toJson(dirtySaveList), finale);
      } else {
        finale();
      }

      function finale() {
        if (newRemoteSaves) {
          window.store.set("save_list", toJson(localSlotList), function() {
            safeCall(null, function() { callback(localSaveList, newRemoteSaves, dirtySaveList); });
          });
        } else {
          safeCall(null, function() {callback(localSaveList, newRemoteSaves, dirtySaveList);});
        }
      }
    });
  });
}

function getAppId() {
  if (window.isIosApp) {
    var appBanner = document.querySelector("meta[name=apple-itunes-app]");
    return /app-id=(\d+)/.exec(appBanner.getAttribute("content"))[1];
  } else if (window.isAndroidApp) {
    var androidLink = document.getElementById('androidLink');
    return /id=([\.\w]+)/.exec(androidLink.href)[1];
  }
}

function submitReceipts(receipts, callback) {
  console.log("submitReceipts: " + JSON.stringify(receipts));
  if (!callback) callback = function(error) {
    if (window.transferPurchaseCallback) {
      window.transferPurchaseCallback(error || "done");
    }
  };
  var appId = receipts.appId;
  var count = 0;
  var error;
  function submitCallback(product) {
    return function submitCallback(ok, response) {
      if (!ok) {
        console.log("failed: " + product + " " + JSON.stringify(response));
        if (!error) {
          var match = /^receipt transaction already processed: (\d+) current login (\d+)$/.exec(response.error);
          if (match) {
            callback("409-" + match[1] + "-" + match[2]);
          } else {
            callback("" + response.status + "r");
          }
        }
        error = true;
      }
      if (error) return;
      count--;
      if (!count) {
        if (!receipts.avoidOverrides) cacheKnownPurchases(response);
        callback();
      }
    }
  }

  if (window.isAndroidApp) {
    window.store.get("login", function(ok, loginId) {
      loginId = loginId || 0;
      var platform = window.isAmazonAndroidApp ? 'amazon' : 'google';
      if (receipts.prePurchased && platform === 'google') {
        for (var i = 0; i < receipts.prePurchased.length; i++) {
          var product = receipts.prePurchased[i];
          count++;
          xhrAuthRequest("POST", "submit-device-receipt", submitCallback(product),
            'platform', platform,
            'company', receipts.company,
            'game_id', window.storeName,
            'app_package', appId,
            'product_id', product,
            'signature', encodeURIComponent(receipts.signature),
            'receipt', encodeURIComponent(receipts.signedData),
            'login_id', loginId
          );
        }
      }
      if (receipts.iaps) {
        for (var product in receipts.iaps) {
          count++;
          xhrAuthRequest("POST", "submit-device-receipt", submitCallback(product),
            'platform', platform,
            'company', receipts.company,
            'game_id', window.storeName,
            'app_package', appId,
            'product_id', product,
            'receipt', encodeURIComponent(receipts.iaps[product]),
            'login_id', loginId
          );
        }
      }
      if (!count) safeTimeout(function () { callback(); }, 0);
    });
  } else {
    callback("error");
  }
}

function delayBreakStart(callback) {
  var nowInSeconds = Math.floor(new Date().getTime() / 1000);
  if (!initStore()) {
    safeTimeout(function() {callback(nowInSeconds);}, 0);
    return;
  }
  window.store.get("delayBreakStart", function(ok, value) {
    var valueNum = value*1;
    safeCall(null, function() {
      if (ok && value && !isNaN(valueNum)) {
        callback(valueNum);
      } else {
        window.store.set("delayBreakStart", nowInSeconds);
        callback(nowInSeconds);
      }
    });
  });
}

function delayBreakEnd() {
  if (initStore()) window.store.remove("delayBreakStart");
}

function initStore() {
  if (!window.storeName) return false;
  if (window.store) return window.store;
  try {
    window.store = new Persist.Store(window.storeName);
  } catch (e) {}
  return window.store;
}
function loadAndRestoreGame(slot, forcedScene) {
  function valueLoaded(ok, value) {
    safeCall(null, function() {
      var state = null;
      if (ok && value && ""+value) {
        //console.log("successfully loaded slot " + slot);
        state = jsonParse(value);
      } else if (slot == "backup") {
        console.log("loadAndRestoreGame couldn't find backup");
        return loadAndRestoreGame("", forcedScene);
      }
      restoreGame(state, forcedScene);
    });
  }
  if (!slot) slot = "";
  if (_global.pseudoSave && pseudoSave[slot]) return valueLoaded(true, pseudoSave[slot]);
  if (!initStore()) return restoreGame(null, forcedScene);
  window.store.get("state"+slot, valueLoaded);
}

function isStateValid(state) {
  if (!state) return false;
  if (!state.stats) return false;
  if (!state.stats.sceneName) return false;
  return true;
}

function restartGame(shouldPrompt) {
  if (_global.blockRestart) {
    asyncAlert("Please wait until the timer has run out.");
    return;
  }
  function actuallyRestart(result) {
    if (!result) return;
    delayBreakEnd();
    submitAnyDirtySaves();
    clearCookie(function() {}, 'temp');
    clearCookie(function() {
      _global.nav.resetStats(_global.stats);
      clearScreen(restoreGame);
    }, "");
  }
  if (shouldPrompt) {
    asyncConfirm("Start over from the beginning?", actuallyRestart);
  } else {
    actuallyRestart(true);
  }
}

function restoreGame(state, forcedScene, userRestored) {
    var scene;
    var secondaryMode = null;
    var saveSlot = "";
    var forcedSceneLabel = null;
    if (/\|/.test(forcedScene)) {
      var parts = forcedScene.split("|");
      forcedScene = parts[0];
      forcedSceneLabel = parts[1];
    }
    if (forcedScene == "choicescript_stats") {
      secondaryMode = "stats";
      saveSlot = "temp";
    } else if (forcedScene == "choicescript_upgrade") {
      secondaryMode = "upgrade";
      saveSlot = "temp";
    }
    if (!isStateValid(state)) {
        var startupScene = forcedScene ? forcedScene : _global.nav.getStartupScene();
        scene = new Scene(startupScene, _global.stats, _global.nav, {debugMode:_global.debug, secondaryMode:secondaryMode, saveSlot:saveSlot});
    } else {
      if (forcedScene) state.stats.sceneName = forcedScene;
      _global.stats = state.stats;
      // Someday, inflate the navigator using the state object
      scene = new Scene(state.stats.sceneName, state.stats, _global.nav, {debugMode:state.debug || _global.debug, secondaryMode:secondaryMode, saveSlot:saveSlot});
      if (!forcedScene) {
        scene.temps = state.temps;
        scene.lineNum = state.lineNum;
        scene.indent = state.indent;
      }
      if (userRestored) {
        scene.temps.choice_user_restored = true;
      }
    }
    if (forcedSceneLabel !== null) {
      scene.targetLabel = {label:forcedSceneLabel, origin:"url", originLine:0}
    }
    safeCall(scene, scene.execute);
}

function redirectScene(sceneName, label, originLine) {
  var scene = new Scene(sceneName, window.stats, window.nav, {debugMode:window.debug});
  if (label) scene.targetLabel = {label:label, origin:"choicescript_stats", originLine:originLine};
  scene.redirectingFromStats = true;
  clearScreen(function() {scene.execute();});
}

tempStatWrites = {};

function transferTempStatWrites() {
  if (!_global.isIosApp) return;
  callIos("transferwrites", JSON.stringify(tempStatWrites));
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
  str = String(str).substring(1);
  if (!str) return null;
  var map = {};
  var pairs = str.split("&");
  var i = pairs.length;
  while (i--) {
    var pair = pairs[i];
    var parts = pair.split("=");
    map[parts[0]] = parts[1];
  }
  return map;
}

function trim(str) {
    if (str === null || str === undefined) return null;
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

function num(x, line, sceneName) {
    if (!line) line = "UNKNOWN";
    errorInfo = "line "+line;
    if (sceneName) errorInfo = sceneName + " " + errorInfo;
    var x_num = parseFloat(x);
    if (isNaN(x_num)) throw new Error(errorInfo+": Not a number: " + x);
    if (!isFinite(x_num)) throw new Error(errorInfo+": Not finite " + x);
    return x_num;
}

function bool(x, line, sceneName) {
  if (!line) line = "UNKNOWN";
  if ("boolean" == typeof x) {
    return x;
  } else if ("true" === x) {
    return true;
  } else if ("false" === x) {
    return false;
  }
  errorInfo = "line "+line;
  if (sceneName) errorInfo = sceneName + " " + errorInfo;
  throw new Error(errorInfo+": Neither true nor false: " + x);
}

function findXhr() {
  var ieFile = isIE && isFile;
  if (window.XMLHttpRequest && !ieFile) return new window.XMLHttpRequest();
  var ids = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
  for (var i = 0; i < 3; i++) {
    try {
      return new ActiveXObject(ids[i]);
    } catch (e) {}
  }
  throw new Error("Couldn't create XHR object");
}

    crcTable = "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";

    /* Number */
    function crc32( /* String */ str, /* Number */ crc ) {
        if( !crc ) crc = 0;
        var n = 0; //a number between 0 and 255 
        var x = 0; //an hex number 

        crc = crc ^ (-1);
        for( var i = 0, iTop = str.length; i < iTop; i++ ) {
            n = ( crc ^ str.charCodeAt( i ) ) & 0xFF;
            x = "0x" + crcTable.substr( n * 9, 8 );
            crc = ( crc >>> 8 ) ^ x;
        }
        return crc ^ (-1);
    }

function simpleDateTimeFormat(date) {
  var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
  var minutes = date.getMinutes();
  if (minutes < 10) minutes = "0" + (""+minutes);
  var oneYearInMillis = 1000 * 60 * 60 * 24 * 365;
  var millisAgo = new Date().getTime() - date.getTime();
  var yearString = ""
  if (millisAgo > oneYearInMillis) {
    yearString = ", " + date.getFullYear();
  }
  return day + ", " + month + " " + date.getDate() + yearString + ", " + date.getHours() + ":" + minutes;
}

function jsonParse(str) {
  if (typeof JSON != "undefined") {
    try {
      return JSON.parse(str);
    } catch (e) {
      // try to handle unquoted keys
      try {
        return eval('('+str+')');
      } catch (e2) {
        // that might have failed because eval is forbidden
        try {
          eval("1");
        } catch (e3) {
          // eval forbidden; let's try a hack to fix unquoted keys
          var str2 = (str+"").replace(/([,\{])\s*(\w+)\s*\:/g, '$1"$2":');
          try {
            return JSON.parse(str2);
          } catch (e4) {}
        }
        // at this point, just report a clear error
        return JSON.parse(str);
      }
    }
  } else {
    return eval('('+str+')');
  }
}

function cefQuerySimple(method) {
  cefQuery({
    request:method,
    onSuccess: function(response) {console.log(method + " success");},
    onFailure: function(error_code, error_message) {console.error(method + " error: " + error_message);}
  });
}

shortMonthStrings = [null, "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
// "Given a date string of "March 7, 2014", parse() assumes a local time zone, but given an
// ISO format such as "2014-03-07" it will assume a time zone of UTC for ES5 or local for
// ECMAScript 2015."
function parseDateStringInCurrentTimezone(YYYY_MM_DD, line) {
  var result = /^(\d{4})-(\d{2})-(\d{2})$/.exec(YYYY_MM_DD);
  if (!result) throw new Error("line "+line+": invalid date string " + YYYY_MM_DD);
  var fullYear = result[1];
  var oneBasedMonthNumber = parseInt(result[2],10);
  var dayOfMonth = parseInt(result[3],10);
  var shortMonthString = shortMonthStrings[oneBasedMonthNumber];
  return new Date(shortMonthString + " " + dayOfMonth + ", " + fullYear);
}

function matchBracket(line, brackets, startIndex) {
  var openBracket = brackets[0];
  var closeBracket = brackets[1];
  var brackets = 0;
  for (var i = startIndex; i < line.length; i++) {
    var c = line.charAt(i);
    if (c === openBracket) {
      brackets++;
    } else if (c === closeBracket) {
      if (brackets) {
        brackets--;
      } else {
        return i;
      }
    }
  }
  return -1;
}

function isStoreSceneCacheRequired() {
  if (!(initStore() &&
    _global.purchases &&
    _global.checkPurchase &&
    _global.hashes &&
    !(_global.isOmnibusApp && _global.isIosApp) &&
    hashes.scenes
  )) return false;
  var empty = true;
  for (var scene in purchases) {
    if (/^fake:/.test(scene)) continue;
    empty = false;
    break;
  }
  return !empty;
}

function updateSinglePaidSceneCache(sceneName, callback) {
  sceneName = sceneName.replace(/ /g, "_");
  var fileName = sceneName + ".txt.json";
  if (initStore() && _global.hashes && hashes.scenes && hashes.scenes[fileName]) {
    function actualRequest(receiptsSent) {
      var xhr = new XMLHttpRequest();
      var canonical = document.querySelector("link[rel=canonical]");
      var canonicalHref = canonical && canonical.getAttribute("href");
      var url = canonicalHref + "scenes/" + fileName + "?hash="+hashes.scenes[fileName];
      xhr.open("GET", url);
      xhr.onload = function() {
        var error;
        if (xhr.status !== 200) {
          try {
            error = JSON.parse(xhr.responseText).error;
          } catch (e) {}
        }
        if (xhr.status === 404) {
          try {
            if (error === "hash doesn't match") {
              return awaitAppUpdate(function() {
                callback("strange");
              })
            }
          } catch (e) {
            if (window.console) console.error(e, e.stack);
          }
        }
        if (xhr.status == 403 && _global.isOmnibusApp && _global.isAndroidApp) {
          if (!receiptsSent) {
            window.receiptRequestCallback = function(receipts) {
              window.receiptRequestCallback = null;
              submitReceipts(receipts, function(error) {
                if (error) {
                  return callback(error);
                } else {
                  actualRequest("receiptsSent");
                }
              });
            }
            androidBilling.requestReceipts();
            return;
          } else if (error === "not registered" || error == "not purchased") {
            return callback(error);
          }
        } else if (xhr.status !== 200) {
          return callback(xhr.status);
        }
        var result;
        try {
          result = jsonParse(xhr.responseText);
        } catch (e) {
          if (window.console) console.error(e, e.stack);
        }
        var ok = result && result.crc && result.lines && result.labels;
        if (!ok) return callback("network");
        window.store.set("cache_scene_"+sceneName, xhr.responseText, function() {
          window.store.set("cache_scene_hash_"+sceneName, hashes.scenes[fileName], function() {
            callback(null, result);
          });
        });
      };
      xhr.onerror = function() {
        callback("network");
      }
      console.log("updateSinglePaidSceneCache " + url);
      xhr.send();
    }
    actualRequest();
  }
}

function updateAllPaidSceneCaches(receiptsSent) {
  if (!isStoreSceneCacheRequired()) {
    if (window.isOmnibusApp && window.isAndroidApp) {
      window.receiptRequestCallback = submitReceipts;
      androidBilling.requestReceipts();
    }
    return;
  }
  if (_global.isOmnibusApp && _global.isAndroidApp && !receiptsSent) {
    window.receiptRequestCallback = function(receipts) {
      submitReceipts(receipts, function() {updateAllPaidSceneCaches("receiptsSent");});
    };
    androidBilling.requestReceipts();
    return;
  }
  var flipped = {};
  for (var scene in purchases) {
    if (/^fake:/.test(scene)) continue;
    scene = scene.replace(/ /g, "_");
    if (!flipped[purchases[scene]]) flipped[purchases[scene]] = [];
    flipped[purchases[scene]].push(scene);
  }
  var products = [];
  for (var product in flipped) {
    products.push(product);
  }
  if (!products.length) return;
  checkPurchase(products.join(" "), function(ok, result) {
    if (!ok || !result) return;
    var sceneList = [];
    var push = Array.prototype.push;
    for (var product in flipped) {
      if (result[product]) {
        push.apply(sceneList, flipped[product]);
      }
    }
    if (!sceneList.length) return;
    for (var i = 0; i < sceneList.length; i++) {
      (function(i) {
        var scene = sceneList[i];
        var fileName = scene + ".txt.json";
        window.store.get("cache_scene_hash_"+scene, function(ok, result) {
          if (!ok || result !== hashes.scenes[fileName]) {
            updateSinglePaidSceneCache(scene, function() {});
          }
        });
      })(i);
    }
  })
}

function checkForAppUpdates() {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg) reg.update();
    });
  }
}

function refreshIfAppUpdateReady() {
  if (navigator.serviceWorker) {
    if (window.controllerchanged) {
      return window.location.reload();
    }
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg.waiting) {
        reg.waiting.postMessage('skipWaiting');
        return window.location.reload();
      }
    });
  }
}

function awaitAppUpdate(callback) {

  var serviceWorkerExists = (navigator.serviceWorker && navigator.serviceWorker.controller);
  if (!serviceWorkerExists) return callback();

  var calledBack = false;
  var maybeCallback = function() {
    if (calledBack) return;
    calledBack = true;
    callback();
  }

  if (window.controllerchanged) return maybeCallback();
  setTimeout(maybeCallback, 10000);
  navigator.serviceWorker.getRegistration().then(function(reg) {
    if (!reg) return maybeCallback();
    if (reg.waiting) {
      reg.waiting.postMessage('skipWaiting');
      return maybeCallback();
    }
    var watchStateChange = function() {
      if (this.state == 'installed') {
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
        maybeCallback();
      }
    };
    if (reg.installing) reg.installing.addEventListener('statechange', watchStateChange);
    reg.update();
    reg.addEventListener('updatefound', function() {
      reg.installing.addEventListener('statechange', watchStateChange);
    })
  });
}

function remoteConfig(variable, callback) {
  if (!_global.isOmnibusApp) {
    safeTimeout(function() {callback(null);}, 0);
    return;
  }
  if (_global.isIosApp) {
    var nonce = "remoteConfig" + variable + (+new Date);
    window[nonce] = function(value) {
      delete window[nonce];
      callback(value);
    }
    callIos("remoteconfig", variable + " " + nonce);
  } else {
    var result = (_global.androidRemoteConfig && androidRemoteConfig.remoteConfig(variable)) || null;
    return safeTimeout(function() {callback(result);}, 0);
  }
}
