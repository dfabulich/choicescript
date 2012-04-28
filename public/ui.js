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
    if (!parent) parent = document.getElementById('text');
    var text = window.document.createTextNode(msg);
    parent.appendChild(text);
}
    
function println(msg, parent) {
    if (!parent) parent = document.getElementById('text');
    printx(msg, parent);
    var br = window.document.createElement("br");
    parent.appendChild(br);
}


function showStats() {
    if (window.showingStatsAlready) return;
    window.showingStatsAlready = true;
    document.getElementById("statsButton").style.display = "none";
    main.innerHTML = "<div id='text'></div>";
    
    var currentScene = window.stats.scene;
    
    var scene = new Scene("choicescript_stats", window.stats, this.nav);
    scene.save = function(callback) {if (callback) callback.call(scene);}; // Don't save state in stats screen, issue #70
    // TODO ban *choice/*page_break/etc. in stats screen
    scene.finish = scene.autofinish = function(buttonName) {
      this.finished = true;
      this.paragraph();
      var p = document.createElement("p");
      var restartLink = document.createElement("a");
      restartLink.setAttribute("style", "text-decoration: underline; cursor: pointer; text-align: left");
      restartLink.onclick = function() {
          if (window.confirm("Restart your game?  Did you click that intentionally?")) {
              window.showingStatsAlready = false;
              document.getElementById("statsButton").style.display = "inline";
              clearCookie(function() {
                window.nav.resetStats(window.stats);
                clearScreen(restoreGame);
              }, "");
          }
          return false;
      }
      restartLink.innerHTML = "Start Over from the Beginning";  
      p.appendChild(restartLink);
      var text = document.getElementById('text');
      text.appendChild(p);

      printButton(buttonName || "Next", main, false, function() {
          window.stats.scene = currentScene;
          window.showingStatsAlready = false;
          document.getElementById("statsButton").style.display = "inline";
          clearScreen(loadAndRestoreGame);
      });
    }
    scene.execute();
}

function callIos(scheme, path) {
  if (!window.isIosApp) return;
  if (!path) path = "";
  window.location = scheme + "://" + path;
}

function asyncAlert(message, callback) {
  if (false/*window.isIosApp*/) {
    // TODO asyncAlert
    window.alertCallback = callback;
    callIos("alert", message)
  } else {
    setTimeout(function() {
      alert(message);
      if (callback) callback();
    }, 0);
  }
}

function clearScreen(code) {
    // can't create div via innerHTML; div mysteriously doesn't show up on iOS
    main.innerHTML = "";
    var text = document.createElement("div");
    text.setAttribute("id", "text");
    main.appendChild(text);
    
    var useAjax = true;
    if (isWeb && window.noAjax) {
      useAjax = false;
    }
    
    if (useAjax) {
      doneLoading();
      setTimeout(function() { window.scrollTo(0,0); callIos("curl");}, 0);
      safeCall(null, code);
    } else {
      if (!initStore()) alert("Your browser has disabled cookies; this game requires cookies to work properly.  Please re-enable cookies and refresh this page to continue.");
      startLoading();
      var form = window.document.createElement("form");
      var axn = window.location.protocol + "//" + window.location.host + window.location.pathname;
      form.setAttribute("action", axn);
      form.setAttribute("method", "POST");
      main.appendChild(form);
      form.submit();
    }
}

function safeSubmit(code) {
    return function safelySubmitted() {
        safeCall(code);
        return false;
    }
}

function startLoading() {
    var loading = document.getElementById('loading');
    if (!loading) {
      loading = document.createElement('div');
      loading.setAttribute("id", "loading");
      loading.innerHTML = "<p>Loading...</p><p><img src=\""+rootDir+"loader.gif\"></p>";
      main.appendChild(loading);
    }
}

function doneLoading() {
    var loading = document.getElementById('loading');
    if (loading) loading.parentNode.removeChild(loading);
    // TODO update header?
}

function setClass(element, classString) {
  element.setAttribute("class", classString);
  element.setAttribute("className", classString);
}
  
function printFooter() {
  // var footer = document.getElementById('footer');
  // We could put anything we want in the footer here, but perhaps we should avoid it.
  setTimeout(function() {callIos("curl");}, 0);
}

function printImage(source, alignment) {
  var img = document.createElement("img");
  img.src = source;
  setClass(img, "align"+alignment);
  document.getElementById("text").appendChild(img);
}

function moreGames() {
    if (window.isIosApp) {
      window.location.href = "itms-apps://itunes.com/apps/choiceofgames";
    } else if (window.isAndroidApp) {
      if (isKindleFire) {
        var androidLink = document.getElementById('androidLink');
        if (androidLink && androidLink.href) {
          androidUrl = androidLink.href;
          var package = androidUrl.substring(androidUrl.indexOf("id=") + 3);
          window.location.href = "http://www.amazon.com/gp/mas/dl/android?p="+package+"&showAll=1";
        } else {
          window.location.href = "http://www.amazon.com/gp/mas/dl/android?p=com.choiceofgames.dragon&showAll=1";
        }
      } else {
        window.location.href = "market://search?q=pub:%22Choice+of+Games,+Inc%22";
      }
    } else {
      window.location.href = "http://www.choiceofgames.com/";
    }
}

function printShareLinks(target, now) {
  if (!target) target = document.getElementById('text');
  var msgDiv = document.createElement("div");
  if (window.isIosApp) {
    if (now) {
      callIos("share");
      return;
    }
    var button = document.createElement("button");
    button.appendChild(document.createTextNode("Share This Game"));
    button.onclick = function() {
      callIos("share");
    };
    msgDiv.appendChild(button);
    msgDiv.appendChild(document.createElement("br")); // insert our own paragraph break, to match <ul>
    msgDiv.appendChild(document.createElement("br"));
    target.appendChild(msgDiv);
    return;
  }
  
  var mobileMesg = "";
  if (isMobile && isFile) {
    if (/Android/.test(navigator.userAgent)) {
      var androidLink = document.getElementById('androidLink');
      var androidUrl;
      if (androidLink) {
        androidUrl = androidLink.href;
        if (androidUrl) {
          if (isKindleFire) {
            var package = androidUrl.substring(androidUrl.indexOf("id=") + 3);
            androidUrl = "http://www.amazon.com/gp/mas/dl/android?p="+package;
            mobileMesg = "  <li><a href='"+androidUrl+"'>Rate this app</a> in the Amazon Appstore</li>\n";
          } else {
            mobileMesg = "  <li><a href='"+androidUrl+"'>Rate this app</a> in the Google Play Store</li>\n";
          }
          
        }
      }
    } else if (/webOS/.test(navigator.userAgent)) {
      var palmLink = document.getElementById('palmLink');
      var palmUrl;
      if (palmLink) {
        palmUrl = palmLink.href;
        if (palmUrl) {
          mobileMesg = "  <li><a href='"+palmUrl+"'>Rate this app</a> in the Palm App Catalog</li>\n";
        }
      }
    } else if (/iPad/.test(navigator.userAgent)) {
      var ipadLink = document.getElementById('ipadLink');
      var ipadUrl;
      if (ipadLink) {
        ipadUrl = ipadLink.href;
      } else {
        var iphoneLink = document.getElementById('iphoneLink');
        if (iphoneLink) {
          ipadUrl = iphoneLink.href;
        }
      }
      if (ipadUrl) {
        mobileMesg = "  <li><a href='"+ipadUrl+"'>Rate this app</a> in the App Store</li>\n";
      }
    } else if (/iPhone/.test(navigator.userAgent)) {
      var iphoneLink = document.getElementById('iphoneLink');
      var iphoneUrl;
      if (iphoneLink) {
        iphoneUrl = iphoneLink.href;
        if (iphoneUrl) {
          mobileMesg = "  <li><a href='"+iphoneUrl+"'>Rate this app</a> in the App Store</li>\n";
        }
      }
    }
  }
  var shareLinkText = "";
  var headerShareTag = document.getElementById("share");
  if (headerShareTag) {
    var spans = headerShareTag.getElementsByTagName("span");
    for (var i = 1; i < spans.length; i++) {
      shareLinkText += "<li>" + spans[i].innerHTML;
    }
  } else {
    shareLinkText = "<li>TODO Share Link 1, e.g. \"Rate this App in the App Store\"<li>TODO Share Link 2, e.g. StumbleUpon<li>TODO Share Link 3, e.g. Facebook<li>TODO Share Link 4, e.g. Twitter"
  }
    
  msgDiv.innerHTML = "<ul id='sharelist'>\n"+
    mobileMesg+
    shareLinkText+
    "</ul><br>\n"; // just one line break; <ul> provides its own
  target.appendChild(msgDiv);
}

function subscribe() {
  if (window.isIosApp) {
    callIos("subscribe");
    return;
  }
  var mailToSupported = isFile;
  if (window.isAndroidApp) mailToSupported = urlSupport.isSupported("mailto:support@choiceofgames.com");
  if (mailToSupported) {
    window.location.href = "mailto:subscribe-"+window.storeName+"@choiceofgames.com?subject=Sign me up&body=Please notify me when the next game is ready."
    return;
  }
  var email = window.prompt("Type your email address; we'll notify you when our next game is ready!");
  if (!email) return;
  while (!/^\S+@\S+\.\S+$/.test(email)) {
    email = window.prompt("Sorry, \""+email+"\" is not an email address.  Please type your email address again.");
    if (!email) return;
  }
  email = (""+email)
  email = email.replace(/\'/g, "\\'");
  window.location.href = "http://www.choiceofgames.com/subscribe-redirect.html?email=" + encodeURIComponent(email) + "&gameName=" + window.storeName;
}

// Callback expects a map from product ids to booleans
function checkPurchase(products, callback) {
  if (window.isIosApp) {
    window.checkPurchaseCallback = callback;
    callIos("checkpurchase", products);
  } else if (window.isAndroidApp) {
    window.checkPurchaseCallback = callback;
    androidBilling.checkPurchase(products);
  } else {
    var productList = products.split(/,/);
    var purchases = {};
    for (var i = 0; i < productList.length; i++) {
      purchases[productList[i]] = true;
    }
    purchases.billingSupported = false;
    setTimeout(function() {callback(purchases)}, 0);
  }
}

function isRestorePurchasesSupported() {
  return !!window.isIosApp;
}

function restorePurchases(callback) {
  if (window.isIosApp) {
    window.restoreCallback = callback;
    callIos("restorepurchases");
  } else {
    setTimeout(callback, 0);
  }
}
// Callback expects a localized string, or "", or "free", or "guess"
function getPrice(product, callback) {
  if (window.isIosApp) {
    window.priceCallback = callback;
    callIos("price", product);
  } else if (window.isAndroidApp) {
      // TODO: support android price localization?
    setTimeout(function () {
      callback.call(this, "guess");
    }, 0);
  } else {
    setTimeout(function () {
      callback.call(this, "$1");
    }, 0);
  }
}
// Callback expects no args, but should only be called on success
function purchase(product, callback) {
  var purchaseCallback = function() {
    window.purchaseCallback = null;
    callback();
  }
  if (window.isIosApp) {
    window.purchaseCallback = purchaseCallback;
    callIos("purchase", product);
  } else if (window.isAndroidApp) {
    window.purchaseCallback = purchaseCallback;
    androidBilling.purchase(product);
  } else {
    setTimeout(callback, 0);
  }
}

function isFullScreenAdvertisingSupported() {
  return window.isIosApp || window.isAndroidApp;
}

function showFullScreenAdvertisement(callback) {
  if (window.isIosApp) {
    callIos("advertisement");
    setTimeout(callback, 0);
  } else if (window.isAndroidApp && window.mobclixBridge) {
    mobclixBridge.displayFullScreenAdvertisement();
    setTimeout(callback, 0);
  } else {
    setTimeout(callback, 0);
  }
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
    if (window.isAndroidApp) {
      notificationBridge.scheduleNotification(endTimeInSeconds);
    } else if (window.isIosApp) {
      callIos("schedulenotification", endTimeInSeconds);
    }
  }
  
  function cleanUpTicker() {
    window.tickerRunning = false;
    if (window.isAndroidApp) {
      notificationBridge.cancelNotification();
    } else if (window.isIosApp) {
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
    window.tickerRunning = true;
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
  var button;
  if (isSubmit) {
    button = document.createElement("input");
    button.type = "submit";
    button.value = name;
    button.name = name;
  } else {
    button = document.createElement("button");
    button.appendChild(document.createTextNode(name));
  }
  setClass(button, "next");
  if (code) button.onclick = function() {
    if (window.isIosApp) {
      window.freezeCallback = function() {
        window.freezeCallback = null;
        code();
      }
      callIos("freeze");
    } else {
      safeCall(null, code);
    }
  }
  if (!isMobile) try { button.focus(); } catch (e) {}
  parent.appendChild(button);
  return button;
}

function printLink(target, href, anchorText) {
  if (!target) target = document.getElementById('text');
  var link = document.createElement("a");
  link.setAttribute("href", href);
  link.appendChild(document.createTextNode(anchorText));
  target.appendChild(link);
}

function printInput(target, inputType, callback, minimum, maximum, step) {
    if (!target) target = document.getElementById('text');
    var form = document.createElement("form");
    target.appendChild(form);
    var self = this;
    form.action="#";
    
    
    var input = document.createElement("input");
    input.type=inputType;
    if (inputType == "number") {
      input.setAttribute("min", minimum);
      input.setAttribute("max", maximum);
      step = step || "any"
      input.setAttribute("step", step);
    }

    input.name="text";
    input.setAttribute("style", "font-size: 25px; width: 90%;");
    form.appendChild(input);
    
    form.onsubmit = function(e) { 
        preventDefault(e);
        if (!input.value) {
            // TODO optional value?
            // TODO configurable error message?
            alert("Don't just leave it blank!  Type something!");
            return;
        }
        callback(input.value);
        return false;
    };

    form.appendChild(document.createElement("br"));
    form.appendChild(document.createElement("br"));
    printButton("Next", form, true);

}

function promptEmailAddress(target, defaultEmail, callback) {
  if (!target) target = document.getElementById('text');
  var form = document.createElement("form");
  var self = this;
  form.action="#";
  
  var message = document.createElement("div");
  message.style.color = "red";
  message.style.fontWeight = "bold";
  form.appendChild(message);
  
  var input = document.createElement("input");
  // This can fail on IE
  try { input.type="email"; } catch (e) {}
  input.name="email";
  input.value=defaultEmail;
  input.setAttribute("style", "font-size: 25px; width: 90%;");
  form.appendChild(input);
  target.appendChild(form);
  println("", form);
  println("", form);
  printButton("Next", form, true);
  
  printButton("Cancel", target, false, function() {
    callback(true);
  });
  
  form.onsubmit = function(e) {
    preventDefault(e);
    safeCall(this, function() {
      var email = trim(input.value);
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        var messageText = document.createTextNode("Sorry, \""+email+"\" is not an email address.  Please type your email address again.");
        message.innerHTML = "";
        message.appendChild(messageText);
      } else {
        recordEmail(email, function() {
          callback(false, email);
        });
      }
    });
  };
  
  setTimeout(function() {callIos("curl");}, 0);
}

function preventDefault(event) {
  if (!event) event = window.event;
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }
}

function getPassword(target, code) {
  if (!target) target = document.getElementById('text');
  var textArea = document.createElement("textarea");
  textArea.cols = 41;
  textArea.rows = 30;
  setClass(textArea, "savePassword");
  target.appendChild(textArea);
  println("", target);
  printButton("Next", target, false, function() {
    code(false, textArea.value);
  });
  
  printButton("Cancel", target, false, function() {
    code(true);
  });
}

function showPassword(target, password) {
  if (!target) target = document.getElementById('text');
  
  var textBuffer = [];
  var colWidth = 40;
  for (var i = 0; i < password.length; i++) {
    textBuffer.push(password.charAt(i));
    if ((i + 1) % colWidth == 0) {
      textBuffer.push('\n');
    }
  }
  password = "----- BEGIN PASSWORD -----\n" + textBuffer.join('') + "\n----- END PASSWORD -----";
  
  var shouldButton = isMobile;
  if (shouldButton) {
    var button = printButton("Email My Password to Me", target, false, 
      function() { 
        safeCall(self, function() {
            if (isWeb) {
              // TODO more reliable system
            }
            window.location.href = "mailto:?subject=Save%20this%20password&body=" + encodeURIComponent(password);
        });
      }
    );
    setClass(button, "");
  }
  
  var shouldTextArea = !isMobile;
  if (shouldTextArea) {
    var textArea = document.createElement("textarea");
    textArea.cols = colWidth + 1;
    textArea.rows = 30;
    setClass(textArea, "savePassword");

    textArea.setAttribute("readonly", true);
    textArea.onclick = function() {textArea.select();}
    textArea.value = (password);
    target.appendChild(textArea);
  }
} 

window.isWebOS = /webOS/.test(navigator.userAgent);
window.isMobile = isWebOS || /Mobile/.test(navigator.userAgent);
window.isFile = /^file:/.test(window.location.href);
window.isWeb = /^https?:/.test(window.location.href);
window.isSafari = /Safari/.test(navigator.userAgent);
window.isIE = /MSIE/.test(navigator.userAgent);
window.isIPad = /iPad/.test(navigator.userAgent);
window.isKindleFire = /Kindle Fire/.test(navigator.userAgent);

window.loadTime = new Date().getTime();

window.onerror=function(msg, file, line, stack) {
    if (window.console) {
      window.console.error(msg);
      if (file) window.console.error("file: " + file);
      if (line) window.console.error("line: " + line);
    }
    if (window.Event && msg instanceof window.Event && /WebKit/.test(navigator.userAgent)) {
      return; // ignore "adsense offline" error
    } else if (/(Error loading script|Script error)/.test(msg) && /(show_ads|google-analytics|version\.js)/.test(file)) {
      return; // ignore "adsense offline" error
    }
    alert(msg);
    var ok = confirm("Sorry, an error occured.  Click OK to email error data to support.");
    if (ok) {
        var statMsg = "(unknown)";
        try {
            statMsg = toJson(window.stats, '\n');
        } catch (ex) {}
        var body = "What were you doing when the error occured?\n\nError: " + msg;
        if (window.stats && window.stats.scene && window.stats.scene.name) body += "\nScene: " + window.stats.scene.name;
        if (file) body += "\nFile: " + file;
        if (line) body += "\nLine: " + line;
        if (stack) body += "\nStack: " + stack;
        body += "\nUser Agent: " + navigator.userAgent;
        body += "\nLoad time: " + window.loadTime;
        if (window.Persist) body += "\nPersist: " + window.Persist.type;
        body += "\n\n" + statMsg + "\n\nversion=" + window.version;
        var supportEmail = "mailto:support-external@choiceofgames.com";
        try {
          supportEmail=document.getElementById("supportEmail").getAttribute("href");
          supportEmail=supportEmail.replace(/\+/g,"%2B");
        } catch (e) {}
        window.location.href=(supportEmail + "?subject=Error Report&body=" + encodeURIComponent(body));
    }
}

window.onload=function() {
    if (window.alreadyLoaded) return;
    window.alreadyLoaded = true;
    window.main = document.getElementById("main");
    var head = document.getElementsByTagName("head")[0];
    window.nav.setStartingStatsClone(window.stats);
    stats.sceneName = window.nav.getStartupScene();
    var map = parseQueryString(window.location.search);
        
    if (map) {
      var forcedScene = map.forcedScene
      window.slot = map.slot;
      window.debug = map.debug;
      if (map.restart) {
        restoreGame(null, forcedScene);
      } else {
        safeCall(null, function() {loadAndRestoreGame(window.slot, forcedScene)});
      }
    } else {
      safeCall(null, loadAndRestoreGame);
    }
    if (window.Touch && window.isWeb) {
      // INSERT ADMOB AD
    }
};

if ( document.addEventListener ) {
  document.addEventListener( "DOMContentLoaded", window.onload, false );
}

if (window.isWeb) {
  document.write("<style>.webOnly { display: block !important; }</style>");
}
