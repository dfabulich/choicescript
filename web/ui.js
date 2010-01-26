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
    
    var greyStuff = document.createElement("div");
    greyStuff.setAttribute("id", "greybackground");
    
    document.body.appendChild(greyStuff);
    
    var statScreen = document.createElement("div");
    
    
    statScreen.setAttribute("id", "stats");
    
    
    statScreen.innerHTML="TODO: Automatic stats screen (should this be a vignette?)";
    
    var restartLink = document.createElement("a");
    restartLink.innerHTML="Start Over from the Beginning";
    restartLink.onclick = function() {
        if (window.confirm("Restart your game?  Did you click that intentionally?")) {
            clearCookie();
            document.body.removeChild(greyStuff);
            document.body.removeChild(statScreen);
            clearScreen(restoreGame);
        }
        return false;
    }
    
    var button = document.createElement("button");
    button.innerHTML="OK";
    button.onclick = function() {
        document.body.removeChild(greyStuff);
        document.body.removeChild(statScreen);
    }
    statScreen.appendChild(button);    
    document.body.appendChild(statScreen);
    var ssWidth = statScreen.clientWidth;
    var bodyWidth = document.body.clientWidth;
    var bodyMarginLeft = 8; // getComputedStyle(document.body, null).marginLeft;
    var left = Math.floor((bodyWidth - ssWidth) / 2) + bodyMarginLeft;
    statScreen.style.left = left + "px";
    document.getElementById('restart').appendChild(restartLink);
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
  var footer = document.getElementById('footer');
  var body = document.body;
  if (footer) {
    footer.parentNode.removeChild(footer);
    body.appendChild(footer);
  } else {
    footer = document.createElement("div");
    footer.setAttribute("id", "footer");
    footer.innerHTML=""; // INSERT footer links here
    body.appendChild(footer);
  }
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

window.loadTime = new Date().getTime();

window.onerror=function(msg, file, line) {
    if (window.Event && msg instanceof window.Event && /WebKit/.test(navigator.userAgent)) {
      return; // ignore "adsense offline" error
    } else if (/(Error loading script|Script error)/.test(msg) && /(show_ads|google-analytics)/.test(file)) {
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
        body += "\n\n" + statMsg + "\n\nversion=" + window.version;
        window.location.href=("mailto:support+external@choiceofgames.com?subject=Error Report&body=" + encodeURIComponent(body));
    }
}

window.onload=function() {
    window.main = document.getElementById("main");
    if (window.isFile) {
      var s = document.createElement('script');
      s.setAttribute("src", "../file.js");
      document.getElementsByTagName("head")[0].appendChild(s);
    }
    stats.sceneName = window.nav.getStartupScene();
    var map = parseQueryString(window.location.search);
        
    if (map) {
      if (map.scene) stats.sceneName = map.scene;
      restoreGame({version:window.version, stats:stats, temps:{}, lineNum: 0, indent: 0, debug: map.debug});
      return;
    } else {
      loadAndRestoreGame();
    }
    if (window.Touch && window.isWeb) {
      // INSERT ADMOB AD
    }
};
