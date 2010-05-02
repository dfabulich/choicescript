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
    
    var greyStuff = document.createElement("div");
    greyStuff.setAttribute("id", "greybackground");
    
    document.body.appendChild(greyStuff);
    
    var statScreen = document.createElement("div");
    
    
    statScreen.setAttribute("id", "stats");
    var currentScene = window.stats.scene;
    
    var scene = new Scene("choicescript_stats", window.stats, this.nav);
    scene.save = function() {}; // Don't save state in stats screen, issue #70
    // TODO ban *choice/*page_break/etc. in stats screen
    scene.finish = function() {
      this.finished = true;
      this.paragraph();
      var div = document.createElement("div");
      var restartLink = document.createElement("a");
      restartLink.setAttribute("style", "float: left; text-decoration: underline; cursor: pointer; text-align: left");
      restartLink.onclick = function() {
          if (window.confirm("Restart your game?  Did you click that intentionally?")) {
              window.showingStatsAlready = false;
              clearCookie();
              document.body.removeChild(greyStuff);
              document.body.removeChild(statScreen);
              clearScreen(restoreGame);
          }
          return false;
      }
      restartLink.innerHTML = "Start Over from the Beginning";  
      div.appendChild(restartLink);
      this.target.appendChild(div);
      
      var button = document.createElement("button");
      button.innerHTML="OK";
      button.onclick = function() {
          document.body.removeChild(greyStuff);
          document.body.removeChild(statScreen);
          window.stats.scene = currentScene;
	  window.showingStatsAlready = false;
      }
      div.appendChild(button);    
    }
    
    
    
    
    document.body.appendChild(statScreen);
    var ssWidth = statScreen.clientWidth;
    var bodyWidth = document.body.clientWidth;
    var bodyMarginLeft = 8; // getComputedStyle(document.body, null).marginLeft;
    var left = Math.floor((bodyWidth - ssWidth) / 2) + bodyMarginLeft;
    statScreen.style.left = left + "px";
    
    scene.target = statScreen;
    scene.execute();
}

function clearScreen(code) {
    main.innerHTML = "<div id='text'></div>";
    var useAjax = true;
    
    if (useAjax) {
      doneLoading();
      setTimeout(function() { window.scrollTo(0,0); }, 0);
      code.call();
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
      loading.innerHTML = "<p>Loading...</p><p><img src=\"../loader.gif\"></p>";
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
}

function printShareLinks() {
  var msgDiv = document.createElement("div");
  var mobileMesg = "";
  if (isMobile && isFile) {
    if (/Android/.test(navigator.userAgent)) {
      var androidLink = document.getElementById('androidLink');
      var androidUrl;
      if (androidLink) {
        androidUrl = androidLink.href;
        if (androidUrl) {
          mobileMesg = "  <li><a href='"+androidUrl+"'>Rate this app</a> in the Android Market</li>\n";
        }
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
    shareLinkText = "<li>TODO Share Link 1, e.g. StumbleUpon<li>TODO Share Link 2, e.g. Facebook<li>TODO Share Link 3, e.g. Twitter"
  }
    
  msgDiv.innerHTML = "<ul id='sharelist'>\n"+
    mobileMesg+
    shareLinkText+
    "</ul>\n";
  main.appendChild(msgDiv);
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
    safeCall(null, code);
  }
  if (!isMobile) try { button.focus(); } catch (e) {}
  parent.appendChild(button);
}
  

window.isMobile = /Mobile/.test(navigator.userAgent);
window.isFile = /^file:/.test(window.location.href);
window.isWeb = /^https?:/.test(window.location.href);
window.isSafari = /Safari/.test(navigator.userAgent);
window.isIE = /MSIE/.test(navigator.userAgent);

window.loadTime = new Date().getTime();

window.onerror=function(msg, file, line) {
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
        if (file) body += "\nFile: " + file;
        if (line) body += "\nLine: " + line;
        body += "\nUser Agent: " + navigator.userAgent;
        body += "\nLoad time: " + window.loadTime;
        if (window.Persist) body += "\nPersist: " + window.Persist.type;
        body += "\n\n" + statMsg + "\n\nversion=" + window.version;
        window.location.href=("mailto:support+external@choiceofgames.com?subject=Error Report&body=" + encodeURIComponent(body));
    }
}

window.onload=function() {
    window.main = document.getElementById("main");
    var head = document.getElementsByTagName("head")[0];
    if (window.isFile) {
      var s = document.createElement('script');
      s.setAttribute("src", "../file.js");
      head.appendChild(s);
    }
    window.nav.setStartingStatsClone(window.stats);
    stats.sceneName = window.nav.getStartupScene();
    var map = parseQueryString(window.location.search);
        
    if (map) {
      if (map.scene) stats.sceneName = map.scene;
      restoreGame({version:window.version, stats:stats, temps:{}, lineNum: 0, indent: 0, debug: map.debug});
      return;
    } else {
      safeCall(null, loadAndRestoreGame);
    }
    if (window.Touch && window.isWeb) {
      // INSERT ADMOB AD
    }
};

if (window.isWeb) {
  document.write("<style>.webOnly { display: block !important; }</style>");
}