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

;(function() {
  var lastTime = 0;
  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
})();

function printx(msg, parent) {
    if (msg === null || msg === undefined || msg === "") return;
    if (!parent) parent = document.getElementById('text');
    if (msg == " ") {
      // IE7 doesn't like innerHTML that's nothing but " "
      parent.appendChild(document.createTextNode(" "));
      return;
    }
    msg = replaceBbCode(msg);
    var frag = document.createDocumentFragment();
    temp = document.createElement('div');
    temp.innerHTML = msg;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    parent.appendChild(frag);
}

function replaceBbCode(msg) {
  return msg = String(msg).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\[url\=(.*?)\]/g, '<a href="$1">')
      .replace(/\[\/url\]/g, '</a>')
      .replace(/\[n\/\]/g, '<br>')
      .replace(/\[c\/\]/g, '')
      .replace(/\[b\]/g, '<b>')
      .replace(/\[\/b\]/g, '</b>')
      .replace(/\[i\]/g, '<i>')
      .replace(/\[\/i\]/g, '</i>')
      .replace(/\u2022([\s\S]*)/, '<ul>•$1</ul>')
      .replace(/\u2022([^\u2022]*)/g, '<li>$1</li>')
}

function println(msg, parent) {
    if (!parent) parent = document.getElementById('text');
    printx(msg, parent);
    var br = window.document.createElement("br");
    parent.appendChild(br);
}

function printParagraph(msg, parent) {
  if (msg === null || msg === undefined || msg === "") return;
  if (!parent) parent = document.getElementById('text');
  msg = replaceBbCode(msg);
  p = document.createElement('p');
  p.innerHTML = msg;
  parent.appendChild(p);
  return p;
}

function showStats() {
    if (document.getElementById('loading')) return;
    var button = document.getElementById("statsButton");
    if (button && button.innerHTML == "Return to the Game") {
      return clearScreen(function() {
        setButtonTitles();
        loadAndRestoreGame();
      });
    }
    var currentScene = window.stats.scene;
    var scene = new Scene("choicescript_stats", window.stats, this.nav, {secondaryMode:"stats", saveSlot:"temp"});
    clearScreen(function() {
      setButtonTitles();
      scene.execute();
    })
}

function redirectFromStats(scene, label, originLine, callback) {
  if (window.isIosApp) {
    if (!label) label = "";
    callIos("redirectfromstats", scene + " " +label  + " " + originLine);
  } else if (window.isAndroidApp) {
    statsMode.redirectFromStats(scene, label || "", originLine);
  } else {
    safeTimeout(callback, 0);
  }
}

function showAchievements(hideNextButton) {
  if (document.getElementById('loading')) return;
  var button = document.getElementById("achievementsButton");
  if (!button) return;
  if (button.innerHTML == "Return to the Game") {
    return clearScreen(function() {
      setButtonTitles();
      loadAndRestoreGame();
    });
  }
  clearScreen(function() {
    setButtonTitles();
    var button = document.getElementById("achievementsButton");
    button.innerHTML = "Return to the Game";
    checkAchievements(function() {
      printAchievements(document.getElementById("text"));
      if (!hideNextButton) printButton("Next", main, false, function() {
        clearScreen(function() {
          setButtonTitles();
          loadAndRestoreGame();
        });
      });
      curl();
    });
  });
}

function showMenu() {
  if (document.getElementById('loading')) return;
  var button = document.getElementById("menuButton");
  if (!button) return;
  if (button.innerHTML == "Return to the Game") {
    return clearScreen(function() {
      setButtonTitles();
      loadAndRestoreGame();
    });
  }
  function menu() {
    setButtonTitles();
    var button = document.getElementById("menuButton");
    button.innerHTML = "Return to the Game";
    options = [
      {name:"Return to the game.", group:"choice", resume:true},
      {name:"View the credits.", group:"choice", credits:true},
      {name:"Play more games like this.", group:"choice", moreGames:true},
      {name:"Email us at " + getSupportEmail() + ".", group:"choice", contactUs:true},
      {name:"Share this game with friends.", group:"choice", share:true},
      {name:"Email me when new games are available.", group:"choice", subscribe:true},
      {name:"Make the text bigger or smaller.", group:"choice", fontSizeMenu:true},
      {name:"Change the background color.", group:"choice", background:true},
    ];
    if (window.animationProperty) options.push(
      {name:"Change the animation between pages.", group:"choice", animation:true}
    );
    printOptions([""], options, function(option) {
      if (option.resume) {
        return clearScreen(function() {
          setButtonTitles();
          loadAndRestoreGame();
        });
      } else if (option.credits) {
        absolutizeAboutLink();
        aboutClick();
      } else if (option.moreGames) {
        moreGames();
        curl();
      } else if (option.share) {
        clearScreen(function() {
          printShareLinks(document.getElementById("text"), "now");
          menu();
        });
      } else if (option.subscribe) {
        setButtonTitles();
        subscribeLink();
      } else if (option.contactUs) {
        window.location.href="mailto:"+getSupportEmail();
      } else if (option.fontSizeMenu) {
        textOptionsMenu({size:1});
      } else if (option.background) {
        textOptionsMenu({color:1});
      } else if (option.animation) {
        textOptionsMenu({animation:1});
      }
    });
    curl();
  }
  clearScreen(menu);
}

function setButtonTitles() {
  var button;
  button = document.getElementById("menuButton");
  if (button) {
    if (window.isCef || window.isNode || window.isMacApp) {
      button.innerHTML = "Menu";
    } else {
      button.innerHTML = "Settings";
    }
  }
  button = document.getElementById("statsButton");
  if (button) {
    button.innerHTML = "Show Stats";
  }
  button = document.getElementById("achievementsButton");
  if (button) {
    if (nav.achievementList.length) {
      button.style.display = "";
      button.innerHTML = "Achievements";
    } else {
      button.style.display = "none";
    }
  }
}


function textOptionsMenu(categories) {
  if (!categories) {
    categories = {size:1, color:1, animation:window.animationProperty};
    if (document.getElementById('loading')) return;
    var button = document.getElementById("menuButton");
    if (!button) return;
    if (button.innerHTML == "Menu") return showMenu();
    if (button.innerHTML == "Return to the Game") {
      return clearScreen(function() {
        setButtonTitles();
        loadAndRestoreGame();
      });
    }
  }
  clearScreen(function() {
    var button = document.getElementById("menuButton");
    if (button) button.innerHTML = "Return to the Game";
    var text = document.getElementById("text");
    var oldZoom = getZoomFactor();
    if (categories.size && categories.color) {
      text.innerHTML = "<p>Change the game's appearance.</p>";
    } else if (categories.size) {
      text.innerHTML = "<p>Make the text bigger or smaller.</p>";
    } else if (categories.color) {
      text.innerHTML = "<p>Change the background color.</p>";
    } else if (categories.animation) {
      text.innerHTML = "<p>Change the animation between pages.</p>";
    }
    options = [
      {name:"Return to the game.", group:"choice", resume:true},
    ];
    if (categories.size) {
      options.push(
        {name:"Make the text bigger.", group:"choice", bigger:true},
        {name:"Make the text smaller.", group:"choice", smaller:true}
      );
      if (oldZoom <= 0.5) {
        options[options.length-1].unselectable = true;
      }
      if (oldZoom !== 1) {
        options.push({name:"Reset the text to its original size.", group:"choice", reset:true});
      }
    }
    if (categories.color) options.push(
      {name:"Use a black background.", group:"choice", color:"black"},
      {name:"Use a sepia background.", group:"choice", color:"sepia"},
      {name:"Use a white background.", group:"choice", color:"white"}
    );
    if (categories.animation) options.push(
      {name: "Animate between pages.", group:"choice", animation:1},
      {name: "Don't animate between pages.", group:"choice", animation:2}
    );
    printOptions([""], options, function(option) {
      if (option.resume) {
        return clearScreen(function() {
          setButtonTitles();
          loadAndRestoreGame();
        });
      } else if (option.color) {
        changeBackgroundColor(option.color);
      } else if (option.reset) {
        setZoomFactor(1);
      } else if (option.animation) {
        window.animateEnabled = option.animation !== 2;
        if (initStore()) store.set("preferredAnimation", parseFloat(option.animation));
      } else {
        changeFontSize(option.bigger);
      }
      textOptionsMenu(categories);
    })
    curl();
  });
}

function getZoomFactor() {
  if (document.body.style.fontSize === undefined) {
    return window.zoomFactor || 1;
  } else {
    var fontSize = parseFloat(document.body.style.fontSize);
    if (isNaN(fontSize)) fontSize = 100;
    return fontSize / 100;
  }
}

function setZoomFactor(zoomFactor) {
  document.body.style.fontSize = Math.round(100*zoomFactor) + "%";
  window.zoomFactor = zoomFactor;
  if (initStore()) store.set("preferredZoom", String(zoomFactor));
}

function changeFontSize(bigger) {
  var oldZoom = getZoomFactor();
  if (bigger) {
    setZoomFactor(oldZoom + 0.1);
  } else {
    setZoomFactor(oldZoom - 0.1);
  }
}

function changeBackgroundColor(color) {
  if (color === "sepia") {
    document.body.classList.remove("nightmode");
    document.body.classList.remove("whitemode");
  } else if (color === "black") {
    document.body.classList.remove("whitemode");
    document.body.classList.add("nightmode");
  } else if (color === "white") {
    document.body.classList.remove("nightmode");
    document.body.classList.add("whitemode");
  }
  if (initStore()) store.set("preferredBackground", color);
}

function isNightMode() {
  return document.body.classList.contains("nightmode");
}

function spell(num) {
  if (num > 99) return num;
  var smallNumbers = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var tens = ["zero", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  if (num < 20) {
    return smallNumbers[num];
  }
  var onesDigit = num % 10;
  if (onesDigit === 0) {
    return tens[num / 10];
  }
  var tensDigit = (num - onesDigit) / 10;
  return tens[tensDigit]+"-"+smallNumbers[onesDigit];
}

function printAchievements(target) {
  var unlockedBuffer = [];
  var lockedBuffer = [];
  var achievedCount = 0, hiddenCount = 0, score = 0, totalScore = 0;
  var totalAchievements = nav.achievementList.length;
  var buffer;
  for (var i = 0; i < totalAchievements; i++) {
    var name = nav.achievementList[i];
    var achievement = nav.achievements[name];
    var points = achievement.points;
    totalScore += points;

    var description;

    if (nav.achieved[name]) {
      achievedCount++;
      score += points;
      buffer = unlockedBuffer;
      description = achievement.earnedDescription;
    } else {
      if (achievement.visible) {
        buffer = lockedBuffer;
        description = achievement.preEarnedDescription;
      } else {
        hiddenCount++;
        continue;
      }
    }

    if (buffer.length) buffer.push("<br>");
    buffer.push("<b>");
    buffer.push(achievement.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
    buffer.push(":");
    buffer.push("</b> ");
    buffer.push(description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/\[b\]/g, '<b>')
      .replace(/\[\/b\]/g, '</b>')
      .replace(/\[i\]/g, '<i>')
      .replace(/\[\/i\]/g, '</i>')
    );
    buffer.push(" (");
    buffer.push(points);
    buffer.push(" points)");
  }

  // What if there's exactly one achievement worth exactly one point?
  if (achievedCount === 0) {
    if (hiddenCount === 0) {
      buffer = ["You haven't unlocked any achievements yet. There are "+spell(totalAchievements)+" possible achievements, worth a total of "+totalScore+" points.<p>"];
    } else if (hiddenCount == 1) {
      buffer = ["You haven't unlocked any achievements yet. There are "+spell(totalAchievements)+" possible achievements (including one hidden achievement), worth a total of "+totalScore+" points.<p>"];
    } else if (hiddenCount == totalAchievements) {
      buffer = ["You haven't unlocked any achievements yet. There are "+spell(totalAchievements)+" hidden achievements, worth a total of "+totalScore+" points.<p>"];
    } else {
      buffer = ["You haven't unlocked any achievements yet. There are "+spell(totalAchievements)+" possible achievements (including "+spell(hiddenCount)+" hidden achievements), worth a total of "+totalScore+" points.<p>"];
    }
    if (lockedBuffer.length) {
      buffer.push.apply(buffer, lockedBuffer);
      buffer.push("<p>");
    }
  } else if (score == totalScore) {
    if (totalAchievements == 2) {
      buffer = ["Congratulations! You have unlocked both achievements, earning a total of "+score+" points, a perfect score.<p>"];
    } else {
      buffer = ["Congratulations! You have unlocked all "+spell(totalAchievements)+" achievements, earning a total of "+score+" points, a perfect score.<p>"];
    }
    buffer.push.apply(buffer, unlockedBuffer);
    buffer.push("<p>");
  } else {
    buffer = ["You have unlocked "+spell(achievedCount)+" out of "+spell(totalAchievements)+" possible achievements, earning you a score of "+score+" out of a possible "+totalScore+" points.<p>"];
    buffer.push.apply(buffer, unlockedBuffer);
    var remaining = totalAchievements-achievedCount;
    if (remaining == hiddenCount) {
      if (remaining == 1) {
        buffer.push("<p>There is still one hidden achievement remaining.<p>");
      } else {
        buffer.push("<p>There are still " + spell(remaining) + " hidden achievements remaining.<p>");
      }
    } else if (hiddenCount > 1) {
      buffer.push("<p>There are still "+spell(remaining)+" achievements remaining, including "+spell(hiddenCount)+" hidden achievements.<p>");
    } else if (hiddenCount == 1) {
      buffer.push("<p>There are still "+spell(remaining)+" achievements remaining, including one hidden achievement.<p>");
    } else if (remaining == 1) {
      buffer.push("<p>There is still one achievement remaining.<p>");
    } else {
      buffer.push("<p>There are still "+spell(remaining)+" achievements remaining.<p>");
    }
    if (lockedBuffer.length) {
      buffer.push.apply(buffer, lockedBuffer);
      buffer.push("<p>");
    }
  }

  target.innerHTML = buffer.join("");
}

function asyncAlert(message, callback) {
  if (!callback) callback = function(){};
  if (window.isIosApp) {
    window.alertCallback = callback;
    callIos("alert", message);
  } else if (window.isAndroidApp) {
    setTimeout(function() {
      alert(message);
      if (callback) callback();
    }, 0);
  } else if (window.isWinOldApp) {
    setTimeout(function() {
      window.external.Alert(message);
      if (callback) callback();
    }, 0);
  } else {
    alertify.alert(message, function() {safeCall(null, callback);});
  }
}

function asyncConfirm(message, callback) {
  if (false/*window.isIosApp*/) {
    // TODO asyncConfirm
    window.confirmCallback = callback;
    callIos("confirm", message);
  } else if (window.isAndroidApp) {
    setTimeout(function() {
      var result = confirm(message);
      if (callback) callback(result);
    }, 0);
  } else if (window.isWinOldApp) {
    setTimeout(function() {
      var result = window.external.Confirm(message);
      if (callback) callback(result);
    }, 0);
  } else {
    alertify.confirm(message, function(result) {safeCall(null, callback(result));});
  }
}


function clearScreen(code) {
    var text = document.getElementById("text");
    var container1 = document.getElementById("container1");
    if (!container1) throw new Error("<div id=container1> is missing from index.html");

    if (window.animateEnabled && window.animationProperty && !window.isIosApp && !document.getElementById('container2')) {
      var container2 = document.createElement("div");
      container2.setAttribute("id", "container2");
      container2.classList.add('container');
      document.body.classList.add('frozen');
      container2.style.opacity = 0;


      // get the vertical scroll position as pageYOffset
      // translate up by pageYOffset pixels, then scroll to the top
      // now we're scrolled up, but the viewport *looks* like it has retained its scroll position
      var pageYOffset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      var extraScroll = 0;
      if (window.isMobile && window.isWeb && window.isAndroid && !/Chrome/.test(navigator.userAgent)) {
        extraScroll = 1; // try to hide url bar
      }
      pageYOffset -= extraScroll;
      container1.style.transform = "translateY(-"+pageYOffset+ "px)";
      container1.style.webkitTransform = "translateY(-"+pageYOffset+ "px)";
      window.scrollTo(0,extraScroll);

      container2.innerHTML = container1.innerHTML;
      [].forEach.call(container1.querySelectorAll('input,button,a,textarea,label'), function(element) {
        element.setAttribute("tabindex", "-1");
        element.removeAttribute("accesskey");
      });

      document.body.insertBefore(container2, container1);
      main = document.getElementById("main");
      main.innerHTML = "";
      text = document.createElement("div");
      text.setAttribute("id", "text");
      main.appendChild(text);
      if (window.isChromeApp) fixChromeLinks();
    } else {
      main = document.getElementById("main");
      main.innerHTML = "";
      text = document.createElement("div");
      text.setAttribute("id", "text");
      main.appendChild(text);

      window.scrollTo(0,1);
    }


    var useAjax = true;
    if (isWeb && window.noAjax) {
      useAjax = false;
    }

    if (useAjax) {
      doneLoading();
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

// in the iOS app, display a page curl animation
function curl() {
  var focusFirst = function() {
    var text = document.getElementById("text");
    if (text.firstElementChild) {
      var focusable = text.firstElementChild;
      if (/^img$/i.test(focusable.tagName) && focusable.complete === false) {
        focusable.addEventListener("load", focusFirst);
        return;
      }
      focusable.setAttribute("tabindex", "-1");
      focusable.classList.add("tempfocus");
      focusable.focus();
      focusable.blur();
      requestAnimationFrame(function() {
        focusable.focus();
        requestAnimationFrame(function() {
          focusable.blur();
          focusable.removeAttribute("tabindex");
          focusable.classList.remove("tempfocus");
        });
      });
    }
  }

  // TODO force a reflow before curling the page
  var container2 = document.getElementById('container2');
  if (!container2) {
    focusFirst();
    return window.animateEnabled ? callIos("curl") : callIos("unfreeze");
  }

  var container1 = document.getElementById('container1');
  var onContainer1Disappeared = function(e) {
    if (container1.parentElement) container1.parentElement.removeChild(container1);
  };
  var onContainer2Appeared = function(e) {
    document.body.classList.remove('frozen');
    focusFirst();
    container2.removeEventListener('transitionend', onContainer2Appeared);
    container2.removeEventListener('webkitTransitionEnd', onContainer2Appeared);
  };

  if (!window.isIosApp && window.animationProperty) {
    var slideoutStyle = document.getElementById('slideoutStyle');
    if (!slideoutStyle) {
      slideoutStyle = document.createElement("style");
      slideoutStyle.setAttribute("id", "slideoutStyle");
      document.head.appendChild(slideoutStyle);
    }

    var shouldSlide = true;

    var timingFunction = "\n.container { transition-timing-function: ease-in; };";
    if (shouldSlide) timingFunction = "";

    slideoutStyle.innerHTML = "@keyframes containerslideout { "+
      "from { transform: "+container1.style.transform+"; } " +
      "to   { transform: "+container1.style.transform+" translateX(-105%); } }\n"+
      "@-webkit-keyframes containerslideout { "+
      "from { -webkit-transform: "+container1.style.webkitTransform+"; } " +
      "to   { -webkit-transform: "+container1.style.webkitTransform+" translateX(-105%); } }"+
      timingFunction;

    // double rAF so we start after container1 is transformed and scrolled to the top
    // minimizes flicker on iOS
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (shouldSlide) {
          var fastApple = window.isIPad || window.isIPhone || window.isMacApp;
          var slowAndroid = window.isAndroidApp && /Android 4/.test(navigator.userAgent);
          var useCssAnimations = true; // fastApple || slowAndroid;
          if (useCssAnimations) {
            container1.style[window.animationProperty] = 'containerslideout';
            container2.style[window.animationProperty] = 'containerslidein';
          } else {
            var frames = 0;
            var durationInSeconds = 0.5;
            var framesPerSecond = 60;
            var totalSteps = framesPerSecond * durationInSeconds;
            var oldContainer1Transform = container1.style.transform;
            var rafSlide = function(stamp) {
              var fraction = frames / totalSteps;
              // ease approximation https://github.com/mietek/ease-tween/blob/master/src/index.js
              fraction = 1.0042954579734844 * Math.exp(
                -6.4041738958415664 * Math.exp(
                  -7.2908241330981340 * fraction));
              container1.style.transform = container1.style.webkitTransform =
                oldContainer1Transform + " translateX(-" + (105 * fraction) + "%)";
              container2.style.transform = container2.style.webkitTransform =
                "translateX(" + (100 - 100 * fraction) + "%)";
              if (frames < totalSteps) {
                frames++;
                requestAnimationFrame(rafSlide);
              }
            }
            requestAnimationFrame(rafSlide);
          }
        }
        container1.style.opacity = 0;
        container2.style.opacity = 1;
        container1.addEventListener('transitionend', onContainer1Disappeared);
        container2.addEventListener('transitionend', onContainer2Appeared);
        container1.addEventListener('webkitTransitionEnd', onContainer1Disappeared);
        container2.addEventListener('webkitTransitionEnd', onContainer2Appeared);
      })
    })
  } else {
    onContainer2Appeared();
    onContainer1Disappeared();
    window.animateEnabled ? callIos("curl") : callIos("unfreeze");
  }

  container1.removeAttribute("id");
  container2.setAttribute("id", "container1");
}

function safeSubmit(code) {
    return function safelySubmitted() {
        safeCall(code);
        return false;
    };
}

function startLoading() {
    var loading = document.getElementById('loading');
    if (!loading) {
      safeCall(null, function() {
        loading = document.createElement('div');
        loading.setAttribute("id", "loading");
        loading.innerHTML = (/MSIE [67]/.test(navigator.userAgent)?"":"<img src=\"data:image/gif;base64,R0lGODlhgAAPAPEAAPf08WJhYMvJx2JhYCH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAgAAPAAACo5QvoIC33NKKUtF3Z8RbN/55CEiNonMaJGp1bfiaMQvBtXzTpZuradUDZmY+opA3DK6KwaQTCbU9pVHc1LrDUrfarq765Ya9u+VRzLyO12lwG10yy39zY11Jz9t/6jf5/HfXB8hGWKaHt6eYyDgo6BaH6CgJ+QhnmWWoiVnI6ddJmbkZGkgKujhplNpYafr5OooqGst66Uq7OpjbKmvbW/p7UAAAIfkECQoAAAAsAAAAAIAADwAAArCcP6Ag7bLYa3HSZSG2le/Zgd8TkqODHKWzXkrWaq83i7V5s6cr2f2TMsSGO9lPl+PBisSkcekMJphUZ/OopGGfWug2Jr16x92yj3w247bh6teNXseRbyvc0rbr6/x5Ng0op4YSJDb4JxhI58eliEiYYujYmFi5eEh5OZnXhylp+RiaKQpWeDf5qQk6yprawMno2nq6KlsaSauqS5rLu8cI69k7+ytcvGl6XDtsyzxcAAAh+QQJCgAAACwAAAAAgAAPAAACvpw/oIC3IKIUb8pq6cpacWyBk3htGRk1xqMmZviOcemdc4R2kF3DvfyTtFiqnPGm+yCPQdzy2RQMF9Moc+fDArU0rtMK9SYzVUYxrASrxdc0G00+K8ruOu+9tmf1W06ZfsfXJfiFZ0g4ZvEndxjouPfYFzk4mcIICJkpqUnJWYiYs9jQVpm4edqJ+lkqikDqaZoquwr7OtHqAFerqxpL2xt6yQjKO+t7bGuMu1L8a5zsHI2MtOySVwo9fb0bVQAAIfkECQoAAAAsAAAAAIAADwAAAsucP6CAt9zSErSKZyvOd/KdgZaoeaFpRZKiPi1aKlwnfzBF4jcNzDk/e7EiLuLuhzwqayfmaNnjCCGNYhXqw9qcsWjT++TqxIKp2UhOprXf7PoNrpyvQ3p8fAdu82o+O5w3h2A1+Nfl5geHuLgXhEZVWBeZSMnY1oh5qZnyKOhgiGcJKHqYOSrVmWpHGmpauvl6CkvhaUD4qejaOqvH2+doV7tSqdsrexybvMsZrDrJaqwcvSz9i9qM/Vxs7Qs6/S18a+vNjUx9/v1TAAAh+QQJCgAAACwAAAAAgAAPAAAC0Zw/oIC33NKKUomLxct4c718oPV5nJmhGPWwU9TCYTmfdXp3+aXy+wgQuRRDSCN2/PWAoqVTCSVxilQZ0RqkSXFbXdf3ZWqztnA1eUUbEc9wm8yFe+VguniKPbNf6mbU/ubn9ieUZ6hWJAhIOKbo2Pih58C3l1a5OJiJuflYZidpgHSZCOnZGXc6l3oBWrE2aQnLWYpKq2pbV4h4OIq1eldrigt8i7d73Ns3HLjMKGycHC1L+hxsXXydO9wqOu3brPnLXL3C640sK+6cTaxNflEAACH5BAkKAAAALAAAAACAAA8AAALVnD+ggLfc0opS0SeyFnjn7oGbqJHf4mXXFD2r1bKNyaEpjduhPvLaC5nJEK4YTKhI1ZI334m5g/akJacAiDUGiUOHNUd9ApTgcTN81WaRW++Riy6Tv/S4dQ1vG4ps4NwOaBYlOEVYhYbnplexyJf3ZygGOXkWuWSZuNel+aboV0k5GFo4+qN22of6CMoq2kr6apo6m5fJWCoZm+vKu2Hr6KmqiHtJLKebRhuszNlYZ3ncewh9J9z8u3mLHA0rvetrzYjd2Wz8bB6oNO5MLq6FTp2+bVUAACH5BAkKAAAALAAAAACAAA8AAALanD+ggLfc0opS0XeX2Fy8zn2gp40ieHaZFWHt9LKNO5eo3aUhvisj6RutIDUZgnaEFYnJ4M2Z4210UykQ8BtqY0yHstk1UK+/sdk63i7VYLYX2sOa0HR41S5wi7/vcMWP1FdWJ/dUGIWXxqX3xxi4l0g4GEl5yOHIBwmY2cg1aXkHSjZXmbV4uoba5kkqelbaapo6u0rbN/SZG7trKFv7e6savKTby4voaoVpNAysiXscV4w8fSn8fN1pq1kd2j1qDLK8yYy9/ff9mgwrnv2o7QwvGO1ND049UgAAIfkECQoAAAAsAAAAAIAADwAAAticP6CAt9zSilLRd2d8onvBfV0okp/pZdamNRi7ui3yyoo4Ljio42h+w6kgNiJt5kAaasdYE7D78YKlXpX6GWphxqTT210qK1Cf9XT2SKXbYvv5Bg+jaWD5ekdjU9y4+PsXRuZHRrdnZ5inVidAyCTXF+nGlVhpdjil2OE49hjICVh4qZlpibcDKug5KAlHOWqqR8rWCjl564oLFruIucaYGlz7+XoKe2wsIqxLzMxaxIuILIs6/JyLbZsdGF063Uu6vH2tXc79LZ1MLWS96t4JH/rryzhPWgAAIfkECQoAAAAsAAAAAIAADwAAAtWcP6CAt9zSilLRd2fEe4kPCk8IjqTonZnVsQ33arGLwLV8Kyeqnyb5C60gM2LO6MAlaUukwdbcBUspYFXYcla00KfSywRzv1vpldqzprHFoTv7bsOz5jUaUMer5vL+Mf7Hd5RH6HP2AdiUKLa41Tj1Acmjp0bJFuinKKiZyUhnaBd5OLnzSNbluOnZWQZqeVdIYhqWyop6ezoquTs6O0aLC5wrHErqGnvJibms3LzKLIYMe7xnO/yL7TskLVosqa1aCy3u3FrJbSwbHpy9fr1NfR4fUgAAIfkECQoAAAAsAAAAAIAADwAAAsqcP6CAt9zSilLRd2fEW7cnhKIAjmFpZla3fh7CuS38OrUR04p5Ljzp46kgMqLOaJslkbhbhfkc/lAjqmiIZUFzy2zRe5wGTdYQuKs9N5XrrZPbFu94ZYE6ms5/9cd7/T824vdGyIa3h9inJQfA+DNoCHeomIhWGUcXKFIH6RZZ6Bna6Zg5l8JnSamayto2WtoI+4jqSjvZelt7+URKpmlmKykM2vnqa1r1axdMzPz5LLooO326Owxd7Bzam4x8pZ1t3Szu3VMOdF4AACH5BAkKAAAALAAAAACAAA8AAAK/nD+ggLfc0opS0XdnxFs3/i3CSApPSWZWt4YtAsKe/DqzXRsxDqDj6VNBXENakSdMso66WzNX6fmAKCXRasQil9onM+oziYLc8tWcRW/PbGOYWupG5Tsv3TlXe9/jqj7ftpYWaPdXBzbVF2eId+jYCAn1KKlIApfCSKn5NckZ6bnJpxB2t1kKinoqJCrlRwg4GCs4W/jayUqamaqryruES2b72StsqgvsKlurDEvbvOx8mzgazNxJbD18PN1aUgAAIfkECQoAAAAsAAAAAIAADwAAArKcP6CAt9zSilLRd2fEWzf+ecgjlKaQWZ0asqPowAb4urE9yxXUAqeZ4tWEN2IOtwsqV8YkM/grLXvTYbV4PTZpWGYU9QxTxVZyd4wu975ZZ/qsjsPn2jYpatdx62b+2y8HWMTW5xZoSIcouKjYePeTh7TnqFcpabmFSfhHeemZ+RkJOrp5OHmKKapa+Hiyyokaypo6q1CaGDv6akoLu3DLmLuL28v7CdypW6vsK9vsE1UAACH5BAkKAAAALAAAAACAAA8AAAKjnD+ggLfc0opS0XdnxFs3/nkISI2icxokanVt+JoxC8G1fNOlm6tp1QNmZj6ikDcMrorBpBMJtT2lUdzUusNSt9qurvrlhr275VHMvI7XaXAbXTLLf3NjXUnP23/qN/n8d9cHyEZYpoe3p5jIOCjoFofoKAn5CGeZZaiJWcjp10mZuRkaSAq6OGmU2lhp+vk6iioay3rpSrs6mNsqa9tb+ntQAAA7AAAAAAAAAAAA\">");
        document.body.appendChild(loading);
      });
    }
    callIos('startspinner');
}

function doneLoading() {
    var loading = document.getElementById('loading');
    if (loading) loading.parentNode.removeChild(loading);
    // TODO update header?
    callIos('stopspinner');
    if (window.doneLoadingCallback) {
      var callback = doneLoadingCallback;
      delete window.doneLoadingCallback;
      // long delay to ensure the spinner is fully stopped before continuing
      setTimeout(callback, 10);
    }
}

function setClass(element, classString) {
  element.setAttribute("class", classString);
  element.setAttribute("className", classString);
}

function printFooter() {
  // var footer = document.getElementById('footer');
  // We could put anything we want in the footer here, but perhaps we should avoid it.
  var statsButton = document.getElementById("statsButton");
  if (statsButton) {
    if (window.stats && stats.scene && stats.scene.secondaryMode == "stats") {
      statsButton.innerHTML = "Return to the Game";
    } else {
      statsButton.innerHTML = "Show Stats";
      if (window.isAndroidApp && window.statsMode.get()) {
        showStats();
      }
    }
  }
  curl();
}

// retrieve value of HTML form
function getFormValue(name) {
    var field = document.forms[0][name];
    if (!field) return "";
    // may return either one field or an array of fields
    if (field.checked) return field.value;
    for (var i = 0; i < field.length; i++) {
        var element = field[i];
        if (element.checked) return element.value;
    }
    return null;
}

function printOptions(groups, options, callback) {
  var form = document.createElement("form");
  main.appendChild(form);
  var self = this;
  form.action="#";
  form.onsubmit = function() {
      safeCall(self, function() {
        var currentOptions = options;
        var option, group;
        for (var i = 0; i < groups.length; i++) {
            if (i > 0) {
                currentOptions = option.suboptions;
            }
            group = groups[i];
            if (!group) group = "choice";
            var value = getFormValue(group);
            if (value === null || value === undefined) {
              if (groups.length == 1) {
                asyncAlert("Please choose one of the available options first.");
              } else {
                var article = "a";
                if (/^[aeiou].*/i.test(group)) article = "an";
                asyncAlert("Please choose " + article + " " + group + " first.");
              }
              return;
            }
            option = currentOptions[value];
        }

        if (groups.length > 1 && option.unselectable) {
          asyncAlert("Sorry, that combination of choices is not allowed. Please select a different " + groups[groups.length-1] + ".");
          return;
        }
        safeCall(null, function() {callback(option);});
      });
      return false;
  };

  if (!options) throw new Error("undefined options");
  if (!options.length) throw new Error("no options");
  // global num will be used to assign accessKeys to the options
  var globalNum = 1;
  var currentOptions = options;
  var div = document.createElement("div");
  form.appendChild(div);
  setClass(div, "choice");
  for (var groupNum = 0; groupNum < groups.length; groupNum++) {
      var group = groups[groupNum];
      if (group) {
          var textBuilder = ["Select "];
          textBuilder.push(/^[aeiou]/i.test(group)?"an ":"a ");
          textBuilder.push(group);
          textBuilder.push(":");

          var p = document.createElement("p");
          p.appendChild(document.createTextNode(textBuilder.join("")));
          div.appendChild(p);
      }
      var checked = null;
      for (var optionNum = 0; optionNum < currentOptions.length; optionNum++) {
          var option = currentOptions[optionNum];
          if (!checked && !option.unselectable) checked = option;
          var isLast = (optionNum == currentOptions.length - 1);
          printOptionRadioButton(div, group, option, optionNum, globalNum++, isLast, checked == option);
      }
      // for rendering, the first options' suboptions should be as good as any other
      currentOptions = currentOptions[0].suboptions;
  }

  var touchStartHandler = function (e) {
    if (e.touches.length > 1) return;
    var target = e.target;
    var rect = target.getBoundingClientRect();
    var shuttle;
    var shuttleWidth = rect.width * 0.2;
    //console.log(rect);
    var lastMouse = e.touches[0];
    var draw = function () {
      var transformX = rect.width + rect.left - lastMouse.clientX - (shuttleWidth/2);
      if (transformX < 0) transformX = 0;
      var maxX = rect.width - shuttleWidth - 2;
      if (transformX > maxX) transformX = maxX;
      if (transformX >= maxX * 0.8) {
        target.classList.add('selected');
      } else {
        target.classList.remove('selected');
      }
      shuttle.style.transform = "translateX(-"+transformX+"px)"
      shuttle.style.webkitTransform = "translateX(-"+transformX+"px)"
    };
    var outsideTimeout = null;
    var moveTracker = function(e) {
      e.preventDefault();
      lastMouse = e.touches[0];
      // on iPad app, touchend doesn't fire outside webview (touchmove does)
      // so, fire a fake touchend 300 ms after touchmove outside webview
      if (window.isIosApp && window.isIPad) {
        if (outsideTimeout) {
          clearTimeout(outsideTimeout);
          outsideTimeout = null;
        }
        if (lastMouse.pageY < 0 || lastMouse.pageX < 0) {
          outsideTimeout = setTimeout(function() {
            document.body.dispatchEvent(new Event('touchend'));
          }, 300);
        }
      }
      window.requestAnimationFrame(draw);
    }
    if ((e.touches[0].clientX - rect.left) > rect.width - shuttleWidth) {
      shuttle = document.createElement("div");
      shuttle.classList.add("shuttle");
      target.appendChild(shuttle);
      shuttle.style.width = shuttleWidth + "px";
      document.body.addEventListener('touchmove', moveTracker, {passive: false});
      var touchEnd = function(e) {
        document.body.removeEventListener('touchmove', moveTracker, {passive: false});
        document.body.removeEventListener('touchend', touchEnd);
        if (target.classList.contains('selected')) {
          if (target.click) {
            target.click();
          } else {
            var event = document.createEvent('Events');
            event.initEvent("click", true, true);
            target.dispatchEvent(event);
          }
          if (window.isIosApp) {
            window.freezeCallback = function() {
              window.freezeCallback = null;
              form.onsubmit();
            };
            callIos("freeze");
          } else {
            safeCall(null, function() {form.onsubmit();});
          }
        } else {
          if (shuttle.style.opacity !== "0") {
            shuttle.style.opacity = 0;
            var removeShuttle = function(e) {
              if (shuttle.parentElement) shuttle.parentElement.removeChild(shuttle);
            };
            shuttle.addEventListener('transitionend', removeShuttle);
            shuttle.addEventListener('webkitTransitionEnd', removeShuttle);
          } else {
            if (shuttle.parentElement) shuttle.parentElement.removeChild(shuttle);
          }
        }
      };
      document.body.addEventListener('touchend', touchEnd);
    }
    //console.log(e);
  };

  var slidingEnabled = true;
  if (window.slidingEnabled === false || groups.length > 1) slidingEnabled = false;

  if (slidingEnabled) [].forEach.call(document.querySelectorAll('.choice > div'), function(label) {
    label.addEventListener('touchstart', touchStartHandler);
    if (window.isMobile) label.addEventListener('click', function(e) {
      var target = e.currentTarget;
      if (document.body.querySelector(".shuttle.discovery")) return;
      var shuttle = document.createElement("div");
      shuttle.classList.add("shuttle");
      shuttle.classList.add("discovery");
      target.appendChild(shuttle);
      var animationEnd = function(e) {
        if (e.animationName === 'shuttlefadeout') {
          if (shuttle.parentElement) shuttle.parentElement.removeChild(shuttle);
        }
      };
      shuttle.addEventListener('animationend', animationEnd);
      shuttle.addEventListener('webkitAnimationEnd', animationEnd);
    })
  });

  var useRealForm = false;
  if (useRealForm) {
    printButton("Next", form, false);
  } else {
    printButton("Next", main, false, function() {
      form.onsubmit();
    });
  }
}

function printOptionRadioButton(div, name, option, localChoiceNumber, globalChoiceNumber, isLast, checked) {
    var line = option.name;
    var unselectable = false;
    if (!name) unselectable = option.unselectable;
    var disabledString = unselectable ? " disabled" : "";
    var id = name + localChoiceNumber + "-" + Math.random().toString(36).substring(2);
    if (!name) name = "choice";
    var radio;
    var div2 = document.createElement("div");
    var label = document.createElement("label");
    // IE doesn't allow you to dynamically specify the name of radio buttons
    if (!/^\w+$/.test(name)) throw new Error("invalid choice group name: " + name);
    label.innerHTML = "<input type='radio' name='"+name+
            "' value='"+localChoiceNumber+"' id='"+id+
            "' "+(checked?"checked":"")+disabledString+">";

    label.setAttribute("for", id);
    if (localChoiceNumber === 0) {
      if (isLast) {
        setClass(label, "onlyChild"+disabledString);
      } else {
        setClass(label, "firstChild"+disabledString);
      }
    } else if (isLast) {
      setClass(label, "lastChild"+disabledString);
    } else if (unselectable) {
      setClass(label, "disabled");
    }
    label.setAttribute("accesskey", globalChoiceNumber);
    if (!unselectable) {
      if (window.Touch) { // Make labels clickable on iPhone
          label.onclick = function labelClick(evt) {
              try {
                var target = evt.target;
                if (!/label/i.test(target.tagName)) return;
                var button = document.getElementById(target.getAttribute("for"));
                button.checked = true;
              } catch (e) {}
          };
      } else if (/MSIE 6/.test(navigator.userAgent)) {
        label.onclick = function labelClick() {
          try {
            var target = window.event.srcElement;
            if (!/label/i.test(target.tagName)) return;
            var button = document.getElementById(target.getAttribute("for"));
            button.checked = true;
          } catch (e) {}
        };
      }
    }
    printx(line, label);
    
    div2.appendChild(label);
    div.appendChild(div2);
}

function printImage(source, alignment, alt, invert) {
  var img = document.createElement("img");
  if (typeof hashes != 'undefined' && hashes[source]) {
    source += "?hash=" + hashes[source];
  }
  img.src = source;
  if (alt !== null && String(alt).length > 0) img.setAttribute("alt", alt);
  var zoomFactor = getZoomFactor();
  if (zoomFactor !== 1) {
    var size = (zoomFactor * 100) + '%';
    img.style.height = size;
    img.style.width = size;
  }
  if (invert) {
    setClass(img, "invert align"+alignment);
  } else {
    setClass(img, "align"+alignment);
  }
  document.getElementById("text").appendChild(img);
}

function playSound(source) {
  for (var existingAudios = document.getElementsByTagName("audio"); existingAudios.length;) {
    existingAudios[0].parentNode.removeChild(existingAudios[0]);
  }
  if (typeof hashes != 'undefined' && hashes[source]) {
    source += "?hash=" + hashes[source];
  }
  var audio = document.createElement("audio");
  if (audio.play) {
    audio.setAttribute("src", source);
    document.body.appendChild(audio);
    audio.play();
  }
}

function printYoutubeFrame(slug) {
  var wrapper = document.createElement("div");
  setClass(wrapper, "videoWrapper");
  var iframe = document.createElement("iframe");
  iframe.width="560";
  iframe.height="315";
  iframe.src="https://www.youtube.com/embed/"+slug;
  iframe.setAttribute("frameborder", 0);
  iframe.setAttribute("allowfullscreen", true);
  wrapper.appendChild(iframe);
  document.getElementById("text").appendChild(wrapper);
}

function moreGames() {
    if (window.isIosApp) {
      window.location.href = "https://choiceofgames.app.link/jBm199qZXL/";
    } else if (window.isAndroidApp) {
      if (window.isNookAndroidApp) {
        asyncAlert("Please search the Nook App Store for \"Choice of Games\" for more games like this!");
        return;
      }
      if (window.isAmazonAndroidApp) {
        window.location.href = "https://www.amazon.com/gp/mas/dl/android?p=com.choiceofgames.omnibus&t=choofgam-20&ref=moreGames";
      } else {
        window.location.href = "https://play.google.com/store/apps/details?id=com.choiceofgames.omnibus&referrer=utm_medium%3Dweb%26utm_source%3Dmoregames";
      }
    } else if (window.isSteamApp) {
      window.location.href = "https://store.steampowered.com/curator/7026798-Choice-of-Games/";
    } else {
      try {
        if (window.isChromeApp) {
          window.open("https://www.choiceofgames.com/category/our-games/");
        } else if (window.isHeartsChoice) {
          window.location.href = "https://www.heartschoice.com/shop/";
        } else {
          window.location.href = "https://www.choiceofgames.com/category/our-games/";
        }
      } catch (e) {
        // in xulrunner, this will be blocked, but it will trigger opening the external browser
      }
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
    target.appendChild(msgDiv);
    return;
  }

  var mobileMesg = "";
  if (window.isAndroidApp) {
    var androidLink = document.getElementById('androidLink');
    var androidUrl;
    if (window.isNookAndroidApp) {
      if (window.nookEan && nookEan != "UNKNOWN") {
        mobileMesg = "  <li><a href='choiceofgamesnook://"+window.nookEan+"'>Rate this app</a> in the Nook App Store</li>\n";
      }
    } else if (androidLink) {
      androidUrl = getAndroidReviewLink();
      if (androidUrl) {
        mobileMesg = "  <li><a href='"+androidUrl+"'>Rate this app</a> in the Google Play Store</li>\n";
      }
    }
  } else if (/webOS/.test(navigator.userAgent) && window.isFile) {
    var palmLink = document.getElementById('palmLink');
    var palmUrl;
    if (palmLink) {
      palmUrl = palmLink.href;
      if (palmUrl) {
        mobileMesg = "  <li><a href='"+palmUrl+"'>Rate this app</a> in the Palm App Catalog</li>\n";
      }
    }
  } else if (window.isChromeApp) {
    var chromeLink = document.getElementById('chromeLink');
    var chromeUrl;
    if (chromeLink) {
      chromeUrl = chromeLink.href;
      if (chromeUrl) {
        mobileMesg = "  <li><a href='"+chromeUrl+"/reviews'>Rate this app</a> in the Chrome Web Store</li>\n";
      }
    }
  }

  var url = window.location.href;
  var links = document.getElementsByTagName("link");
  for (var i = links.length - 1; i >= 0; i--) {
    if (links[i].getAttribute("rel") == "canonical") {
      url = links[i].getAttribute("href") || url;
      break;
    }
  }

  if (/^\//.test(url)) {
    if (window.isWeb) {
      url = window.location.protocol + "//" + window.location.hostname + url;
    } else {
      url = "https://www.choiceofgames.com" + url;
    }
  }

  url = encodeURIComponent(url);
  var title = encodeURIComponent(document.title);
  var dataUriSupported = !/MSIE [67]/.test(navigator.userAgent);

  var twitterHandle = window.isHeartsChoice ? "heartschoice" : "choiceofgames";

  var shareLinkText =
        '<li>'+(dataUriSupported?'<img height="16" width="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAsklEQVQ4EWNgoBAwgvQnVq75f+vBG5KMUlMQYZjfHsLIBNJFqmZkPSzEWKsqL8zQXebJICLIDVZuEzUTrg3sAjgPBwNZM7oSolyAzWaYQUS5AKYYG43XBUeWpaPogfGRwwCvAW/efwUbAPMCjI9sKl4DArKXgNXCbIbxkQ2gOAwoNgDsBS5ONgYNJTFkl2FlG2nLwMVv3HsFZlPHBTLifAznrj6Bm47OQI42mBwoM1EFAAAnVCliRFKHdQAAAABJRU5ErkJggg==">':"")+
        ' <a href="http://www.facebook.com/sharer.php?u='+url+'&amp;t='+title+'"'+
        'onclick="if (window.isFile || window.isXul) return true; '+
        'window.open(&quot;http://www.facebook.com/sharer.php?u='+url+'&amp;t='+title+
        '&quot;,&quot;sharer&quot;,&quot;toolbar=0,status=0,width=626,height=436&quot;);return false;" class="spacedLink">Facebook</a></li>'+

        '<li>'+(dataUriSupported?'<img height="16" width="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB/ElEQVQ4EYVTO24UQRB9/dmZkdfCIK0QBhMACQdwgDgMN4AEiYALcAFy7kNABkYkGzhAWMa2DHg9n+7iVfXMaAmAknp7tuvVq1dV3Q6j9SlJlzLEOXgIPPcmRjf5/7ZHdWQRaVPCOjucDYJlcHi8AFLOErz/J4kRQASXGfjYDmhIeDwAKx9xBzz8jxUCgjqSfE8CPWi5EpeTjOu+F36CVcGxrEBBMVDiaDOB5vqVBQu6WAU+dQmnwZuGwkACstxlRDckqWIhMQLPOtfXvfw0AmfA95thqwBNWGg04PktLbTYrEAlXxJTEciemtd+KdvZf7ESTjipEyaazAgyu/2lTTjP2ZpICZZQYSp7gg8kelh5PFj4Kd56ZvhE2IUSMOMVm/niZoPDOqJl0FSAYlYhoNoabSmBiI5pVNouv39w32G3l05wIwaqKRq00XErWGWYFvXz3uAbA4+51lyf+wy9h0JVRqAgfmehc8vmJt7n/CrKP6J81fzqfIPTVOOAo+S9soko+GkzhxgNocUkDfLmosPrsyvwtpTDP5KRWBz2Of4PB3vYr8o9mNuZncfLvRrPdmveJJVNDn0G8yKUMV/pO+p16MVmAn00yvnu9g7erpZ4xAbUrFtXMy42AE9YwmHNxo42lzAd6AtMQ48NgjVVOz+BVNQ9Zql4UI9P/TehBOJIi+EJIAAAAABJRU5ErkJggg==">':"")+
        ' <a href="https://twitter.com/intent/tweet?related='+twitterHandle+'&amp;text='+title+'&amp;url='+url+'&amp;via='+twitterHandle+'" class="spacedLink">Twitter</a></li>';

  var nowMsg = "";
  if (now) nowMsg = "<p>Please support our work by sharing this game with friends!  The more people play, the more resources we'll have to work on the next game.</p>";
  msgDiv.innerHTML = nowMsg + "<ul id='sharelist'>\n"+
    mobileMesg+
    shareLinkText+
    "</ul>\n";
  target.appendChild(msgDiv);
}

function isShareConfigured() {
  return !!document.getElementById("share");
}

function shareAction(e) {
  clearScreen(function() {
    var target = document.getElementById('text');
    printShareLinks(target, "now");
    printButton("Next", target, false, function () {
      clearScreen(loadAndRestoreGame);
    });
    curl();
  });
}

function isReviewSupported() {
  return !!(window.isIosApp || window.isAndroidApp);
}

function promptForReview() {
  var store;
  target = document.getElementById('text');
  function printMessage(store) {
    println("Please post a review of this game on "+store+". It really helps.[n/]", target);
  }
  var anchorText = "Review This Game";
  var href;
  if (window.isSteamApp) {
    printMessage("Steam");
    return printLink(target, "#", anchorText, function(e) {
      preventDefault(e);
      try {
        purchase("adfree", function() {});
      } catch (x) {}
      return false;
    });
  } else if (window.isIosApp) {
    println("Please post a review of this version of the game on the App Store. It really helps.[n/]", target);
    return printLink(target, "#", anchorText, function(e) {
      preventDefault(e);
      try {
        callIos("reviewapp");
      } catch (x) {}
      return false;
    });
  } else if (window.isAndroidApp) {
    href = getAndroidReviewLink();
    if (window.isAmazonAndroidApp) {
      printMessage("Amazon's Appstore");
    } else {
      printMessage("the Google Play Store");
    }
  } else if (window.isChromeApp) {
    href = document.getElementById('chromeLink').href;
  }
  
  printLink(target, href, anchorText);
}

function getAndroidReviewLink() {
  var href = document.getElementById('androidLink').href;
  var package = /id=([\.\w]+)/.exec(href)[1];
  // TODO legacy hosted
  if (window.isOmnibusApp) {
    var omnibus;
    if (/^org\.hostedgames/.test(package)) {
      omnibus = "org.hostedgames.omnibus";
    } else if (/^com\.heartschoice/.test(package)) {
      omnibus = "com.heartschoice.o";
    } else {
      omnibus = "com.choiceofgames.omnibus";
    }
    if (window.isAmazonAndroidApp) {
      return "http://www.amazon.com/gp/mas/dl/android?p="+omnibus+"&t=choofgam-20&ref=rate"
    } else {
      return "https://play.google.com/store/apps/details?id="+omnibus+"&referrer=utm_medium%3Dweb%26utm_source%3D"+window.storeName+"Game";
    }
  } else if (window.isAmazonAndroidApp) {
    return "http://www.amazon.com/gp/mas/dl/android?p="+package+"&t=choofgam-20&ref=rate";
  } else {
    return href;
  }
}

function isFollowEnabled() {
  return false;
  if (!window.isWeb) return false;
  // iOS add to homescreen seems not to like these iframes
  if (window.navigator.standalone) return false;
  if ("localhost" != window.location.hostname && !/\.?choiceofgames\.com$/.test(window.location.hostname)) return false;
  return true;
}

function printFollowButtons() {
  if (!isFollowEnabled()) return;
  // Just FB Like, for now
  var target = document.getElementById('text');
  var iframe = document.createElement('iframe');
  var width = 300;
  var height = 66;
  iframe.setAttribute("src", "//www.facebook.com/plugins/like.php?href=https%3A%2F%2Fwww.facebook.com%2Fchoiceofgames"+
    "&amp;send=false&amp;layout=standard&amp;width="+width+"&amp;show_faces=true&amp;font&amp;colorscheme=light&amp;"+
    "action=like&amp;height="+height+"&amp;appId=190439350983878");
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("style", "border:none; overflow:hidden; width:"+width+"px; height:"+height+"px;");
  iframe.setAttribute("allowTransparency", "true");
  target.appendChild(iframe);
}

function subscribeLink(e) {
  clearScreen(function() {
    subscribe(document.getElementById('text'), {now:1}, function() {
      clearScreen(loadAndRestoreGame);
    });
    curl();
  });
}

function subscribeByMail(target, options, callback, code) {
  if (options.now) {
    code();
    if (options.allowContinue) safeTimeout(function() {callback("now");}, 0);
  } else {
    println("Click here to subscribe to our mailing list; " + options.message);
    println("");
    printButton("Subscribe", target, false, function() {
        code();
      });
    if (options.allowContinue) {
      printButton("No, Thanks", target, false, function() {
        safeTimeout(function() {callback();}, 0);
      });
    }
    // why is this timeout necessary?
    safeTimeout(function() {printFooter();}, 0);
  }
}

function subscribe(target, options, callback) {
  if (!options.message) options.message = "we'll notify you when our next game is ready!";
  if (typeof options.allowContinue === "undefined") options.allowContinue = 1;
  if (!target) target = document.getElementById('text');
  if (window.isIosApp) {
    subscribeByMail(target, options, callback, function() {
      callIos("subscribe");
    });
    return;
  }
  var mailToSupported = isMobile && !window.isMacApp;
  if (window.isAndroidApp) mailToSupported = urlSupport.isSupported("mailto:support@choiceofgames.com");
  var domain = window.isHeartsChoice ? "heartschoice.com" : "choiceofgames.com";
  if (mailToSupported) {
    subscribeByMail(target, options, callback, function() {
      window.location.href = "mailto:subscribe-"+window.storeName+"-"+platformCode() + "@"+domain+"?subject=Sign me up&body=Please notify me when the next game is ready.";
    });
    return;
  }
  println("Type your email address below; " + options.message);
  println("");
  fetchEmail(function(defaultEmail) {
    promptEmailAddress(target, defaultEmail, options.allowContinue, function(cancel, email) {
      if (cancel) {
        return safeCall(null, callback);
      }
      var head= document.getElementsByTagName('head')[0];
      var script = document.createElement('script');
      script.type = 'text/javascript';
      var timestamp = new Date().getTime();
      var timeout = setTimeout(function() {
        window["jsonp"+timestamp]({
          result:"error", msg:"Couldn't connect. Please try again later."
        });
      }, 10000);
      window["jsonp"+timestamp] = function(response) {
        clearTimeout(timeout);
        if (response.result == "error") {
          var errElement = document.getElementById("errorMessage");
          if (errElement) errElement.innerHTML = response.msg;
        } else {
          clearScreen(function() {
            target = document.getElementById('text');
            println(response.msg, target);
            println("", target);
            if (options.allowContinue) {
              printButton("Next", target, false, function() {
                safeCall(null, callback);
              });
            }
            curl();
          });
        }
      };
      var listId = window.isHeartsChoice ? "fa4134344b" : "e9cdee1aaa";
      var mailParams = "u=eba910fddc9629b2810db6182&id="+listId+"&SIGNUP="+window.storeName+"-"+platformCode()+"&EMAIL="+encodeURIComponent(email);
      if (window.isChromeApp) {
        chrome.permissions.contains({origins: ["http://choiceofgames.us4.list-manage.com/"]},function(isXhrAllowed) {
          if (isXhrAllowed) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", 'http://choiceofgames.us4.list-manage.com/subscribe/post-json?'+mailParams, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState != 4) return;
              if (xhr.status == 200) {
                var response = JSON.parse(xhr.responseText);
                window["jsonp"+timestamp](response);
              } else if (xhr.status === 0) {
                window["jsonp"+timestamp]({result:"error", msg:"There was a network error submitting your registration. Please try again later, or email subscribe@choiceofgames.com instead."});
              } else {
                window["jsonp"+timestamp]({result:"error", msg:"Sorry, our mail server had an error. It's our fault. Please try again later, or email subscribe@choiceofgames.com instead."});
              }
            };
            xhr.send();
          } else {
            window.addEventListener('message', function(event) {
              if (window["jsonp"+timestamp]) {
                var jsonpt = window["jsonp"+timestamp];
                window["jsonp"+timestamp] = null;
                if (jsonpt) jsonpt(event.data);
              }
            });
            var iframe = document.createElement("IFRAME");
            iframe.setAttribute("src", "sandbox.html");
            iframe.setAttribute("name", "sandbox");
            iframe.onload = function() {
              iframe.contentWindow.postMessage({email:email, game:window.storeName, platform:platformCode()}, "*");
            };
            document.documentElement.appendChild(iframe);
            return;
          }
        });
      } else {
        if (isWinStoreApp || window.location.protocol == "https:") {
          var xhr = findXhr();
          xhr.open("GET", 'https://www.choiceofgames.com/mailchimp_proxy.php/subscribe/post-json?'+mailParams, true);
          var done = false;
          xhr.onreadystatechange = function() {
            if (done) return;
            if (xhr.readyState != 4) return;
            done = true;
            if (xhr.status == 200) {
              var response = JSON.parse(xhr.responseText);
              window["jsonp"+timestamp](response);
            } else if (xhr.status === 0) {
                window["jsonp"+timestamp]({result:"error", msg:"There was a network error submitting your registration. Please try again later, or email subscribe@choiceofgames.com instead."});
            } else {
              window["jsonp"+timestamp]({result:"error", msg:"Sorry, our mail server had an error. It's our fault. Please try again later, or email subscribe@choiceofgames.com instead."});
            }
          };
          xhr.send();
        } else {
          script.src = 'http://choiceofgames.us4.list-manage.com/subscribe/post-json?'+mailParams+'&c=jsonp' + timestamp;
          head.appendChild(script);
        }
      }
    });
  });
}

function downloadLink(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isPrerelease()) {
    return asyncAlert("You'll need to wait until after the game is released on " + window.releaseDate);
  }
  clearScreen(function() {
    var text = document.getElementById("text");
    if (window.knownPurchases && window.knownPurchases.adfree) {
      println("You can download the game using the links below.");
      println("");
      var files = {
        Windows: window.downloadName + " Setup " + window.downloadVersion + "-ia32.exe",
        Mac: window.downloadName + "-" + window.downloadVersion + ".dmg",
        Linux: window.downloadPackage + "-" + window.downloadVersion + "-ia32.deb"
      }
      var detectedOs;
      if (/Windows/.test(navigator.userAgent)) {
        detectedOs = "Windows";
      } else if (/Mac OS X/.test(navigator.userAgent)) {
        detectedOs = "Mac";
      } else if (/Linux/.test(navigator.userAgent)) {
        detectedOs = "Linux";
      }
      if (detectedOs) {
        printDownloadLink(detectedOs);
      }
      for (var os in files) {
        if (detectedOs != os) printDownloadLink(os);
      }
      function printDownloadLink(os) {
        var link = document.createElement("a");
        if (detectedOs == os) {
          setClass(link, "next linkButton");
        } else {
          link.style.display = "block";
        }
        link.innerHTML = "Download for " + os;
        link.href = "scenes/"+files[os];
        text.appendChild(link);
      }
      println("");
      printButton("Next", text, false, function() {
        safeCall(null, function() { clearScreen(loadAndRestoreGame); });
      });
    } else {
      println("To download this game for Windows, Mac, or Linux, you'll need to purchase it first.");
      println("");
      printOptions([""], [{name:"Purchase it now.", purchase:1}, {name:"No, thanks.", cancel:1}], function(option) {
        if (option.purchase) {
          purchase("adfree", downloadLink);
        } else {
          safeCall(null, function() { clearScreen(loadAndRestoreGame); });
        }
      });
    }
    curl();
  });
}

function cacheKnownPurchases(knownPurchases) {
  if (!knownPurchases) return;
  var output = {billingSupported:true};
  for (i = 0; i < knownPurchases.length; i++) {
    var parts = knownPurchases[i].split(/\./);
    if (parts[0] != window.storeName) continue;
    output[parts[1]] = true;
  }
  window.knownPurchases = output;
  fetchEmail(function(email) {
    if (email) window.store.set("knownPurchases"+email.replace(/[^A-z0-9]/g, "_"), JSON.stringify(window.knownPurchases));
  })
  if (window.isIosApp) {
    callIos("cachepurchases", knownPurchases);
  } else if (window.isAndroidApp) {
    if (window.isOmnibusApp) {
      androidBilling.cachePurchases(JSON.stringify(knownPurchases));
    }
    androidBilling.updateAdfree(!!output.adfree);
  }
}

// Callback expects a map from product ids to booleans
function checkPurchase(products, callback) {
  function publishPurchaseEvents(purchases) {
    if (purchases && window.purchaseSubscriptions) {
      for (var key in purchaseSubscriptions) {
        if (purchases[key]) purchaseSubscriptions[key].call();
      }
    }
  }

  function checkWebPurchases(callback) {
    isRegistered(function (registered) {
      if (!registered) return callback("ok", {billingSupported: true});
      if (window.knownPurchases) {
        safeTimeout(function() {
          callback("ok", window.knownPurchases);
          publishPurchaseEvents(knownPurchases);
        }, 0);
      } else {
        startLoading();
        xhrAuthRequest("GET", "get-purchases", function(ok, response) {
          doneLoading();
          if (ok) {
            cacheKnownPurchases(response);
            callback(ok, window.knownPurchases);
          } else {
            fetchEmail(function(email) {
              if (!email) return callback(ok, window.knownPurchases);
              window.store.get("knownPurchases"+email.replace(/[^A-z0-9]/g, "_"), function(ok, value) {
                if (ok) {
                  window.knownPurchases = JSON.parse(value);
                }
                callback(ok, window.knownPurchases);
                publishPurchaseEvents(window.knownPurchases);
              })
            });
          }
        });
      }
    });
  }

  function mergeKnownPurchases(purchases) {
    window.checkPurchaseCallback = null;
    checkWebPurchases(function(ok, knownPurchases) {
      if (knownPurchases) {
        var productList = products.split(/ /);
        for (i = 0; i < productList.length; i++) {
          if (knownPurchases[productList[i]]) purchases[productList[i]] = knownPurchases[productList[i]];
        }
      }
      callback("ok", purchases);
      publishPurchaseEvents(purchases);
    });
  }

  var i, oldCallback;
  if (window.isIosApp) {
    oldCallback = window.checkPurchaseCallback;
    window.checkPurchaseCallback = function (purchases) {
      if (oldCallback) oldCallback(purchases);
      mergeKnownPurchases(purchases);
    }
    if (!oldCallback) callIos("checkpurchase", products);
  } else if (window.isAndroidApp && !window.isNookAndroidApp) {
    oldCallback = window.checkPurchaseCallback;
    window.checkPurchaseCallback = function (purchases) {
      if (oldCallback) oldCallback(purchases);
      mergeKnownPurchases(purchases);
    }
    if (!oldCallback) androidBilling.checkPurchase(products);
  } else if (window.isWinOldApp) {
    safeTimeout(function() {
      var purchases = eval(window.external.CheckPurchase(products));
      callback("ok",purchases);
      publishPurchaseEvents(purchases);
    }, 0);
  } else if (window.isMacApp && window.macPurchase) {
    safeTimeout(function() {
      var purchases = JSON.parse(macPurchase.checkPurchases_(products));
      callback("ok",purchases);
      publishPurchaseEvents(purchases);
    }, 0);
  } else if (window.isCef) {
    cefQuery({
      request:"CheckPurchases " + products,
      onSuccess: function(response) {
        console.log("cp response " + response);
        var purchases = JSON.parse(response);
        callback("ok",purchases);
        publishPurchaseEvents(purchases);
      },
      onFailure: function(error_code, error_message) {
        console.error("CheckPurchases error: " + error_message);
        callback(!"ok");
      }
    });
  } else if (window.isGreenworks) {
    var greenworks = require('greenworks');
    var greenworksApps = require('../package.json').products;
    var purchases = {};
    var productList = products.split(/ /);
    for (i = 0; i < productList.length; i++) {
      var appId = greenworksApps[productList[i]];
      var purchased = false;
      try {
        purchased = greenworks.isSubscribedApp(appId);
      } catch (e) {
        return safeTimeout(function() {callback(!"ok");}, 0);
      }
      purchases[productList[i]] = purchased;
    }
    purchases.billingSupported = true;
    publishPurchaseEvents(purchases);
    safeTimeout(function() {callback("ok", purchases);}, 0);
  } else if (isWebPurchaseSupported()) {
    checkWebPurchases(function(ok, knownPurchases) {
      callback(ok, knownPurchases);
      publishPurchaseEvents(window.knownPurchases);
    });
  } else {
    var productList = products.split(/ /);
    var purchases = {};
    for (i = 0; i < productList.length; i++) {
      purchases[productList[i]] = !!window.isChromeApp;
    }
    purchases.billingSupported = false;
    publishPurchaseEvents(purchases);
    safeTimeout(function() {callback("ok", purchases);}, 0);
  }
}

function isWebPurchaseSupported() {
  return isWebSavePossible() && !!window.stripeKey;
}

function isRestorePurchasesSupported() {
  return !!window.isIosApp || !!window.isAndroidApp || isWebPurchaseSupported();
}

function restorePurchases(product, callback) {
  function webRestoreCallback() {
    var purchased = window.knownPurchases && window.knownPurchases[product];
    if (!purchased) {
      if (window.isAndroidApp) {
        return asyncAlert("Restore completed. This product is not yet purchased. "+
          "Sometimes purchases can fail to restore for reasons outside our control. "+
          "If you have already purchased this product, try uninstalling and reinstalling the app. "+
          "If that doesn't work, please email a copy of your receipt to " + getSupportEmail() + " "+
          "and we'll find a way to help you.", function() {
            callback(purchased);
          });
      } else {
        asyncAlert("Restore completed. This product is not yet purchased.");
      }
    } else {
      refreshIfAppUpdateReady();
      updateAllPaidSceneCaches();
    }
    callback(purchased);
  }
  function secondaryRestore(error) {
    window.restoreCallback = null;
    if (product) {
      checkPurchase(product, function(ok, purchases) {
        if (purchases[product]) {
          return callback("purchased");
        }

        if (window.isOmnibusApp && (window.purchaseTransfer || window.omnibusSupportsTransfer)) {
          var appId = getAppId();
          if (window.isAndroidApp || (window.isIosApp && (appId !== "1363309257" && appId !== "1302297731"))) {
            return omnibusRestore(appId);
          }
        }

        clearScreen(function() {
          isRegistered(function (registered) {
            if (registered) {
              startLoading();
              xhrAuthRequest("GET", "get-purchases", function(ok, response) {
                doneLoading();
                if (ok) {
                  cacheKnownPurchases(response);
                  webRestoreCallback();
                } else {
                  if (response.error === "not registered") {
                    logout();
                    secondaryRestore("error");
                  } else {
                    asyncAlert("There was an error restoring purchases. (Your network connection may be down.) Please try again later.");
                    callback();
                  }
                }
              });
            } else {
              var target = document.getElementById('text');
              if (error) {
                target.innerHTML="<p>Restore failed. Please try again later, or sign in to Choiceofgames.com to restore purchases.</p>";
              } else {
                target.innerHTML="<p>Restore completed. This product is not yet purchased. You may also sign in to Choiceofgames.com to restore purchases.</p>";
              }
              loginForm(document.getElementById('text'), /*optionality*/1, /*err*/null, webRestoreCallback);
              curl();
            }
          })
        });
      });
    } else {
      callback();
    }
  }
  function omnibusRestore(appId) {
    var omnibus = "Choice of Games";
    var canonical = document.querySelector("link[rel=canonical]");
    var canonicalHref = canonical && canonical.getAttribute("href");
    if (/\/user-contributed\//.test(canonicalHref)) {
      omnibus = "Hosted Games";
    }
    var appStore = window.isIosApp ? "App Store"
      : window.isAmazonAndroidApp ? "Amazon Appstore"
      : "Google Play Store";
    var gameTitle = document.querySelector(".gameTitle").textContent;

    clearScreen(function() {
      printParagraph("Restore completed. "+appStore+" records indicate that "+
        "you have not purchased this product using the \""+omnibus+"\" app, "+
        "but you may have purchased the product in the \""+gameTitle+"\" app, "+
        "or on our website at Choiceofgames.com.");

      options = [
        {name:"Restore purchases from Choiceofgames.com.", group:"choice", webRestore:true},
        {name:"Restore purchases using the \""+gameTitle+"\" app.", group:"choice", transfer:true},
      ];

      printOptions([""], options, function(option) {
        if (option.webRestore) {
          clearScreen(function() {
            isRegistered(function (registered) {
              if (registered) {
                startLoading();
                xhrAuthRequest("GET", "get-purchases", function(ok, response) {
                  doneLoading();
                  if (ok) {
                    cacheKnownPurchases(response);
                    webRestoreCallback();
                  } else {
                    if (response.error === "not registered") {
                      logout();
                      printParagraph("Sign in to Choiceofgames.com to restore purchases.");
                      loginForm(document.getElementById('text'), /*optionality*/1, /*err*/null, webRestoreCallback);
                    } else {
                      asyncAlert("There was an error restoring purchases. (Your network connection may be down.) Please try again later.");
                      callback();
                    }
                  }
                });
              } else {
                printParagraph("Sign in to Choiceofgames.com to restore purchases.");
                loginForm(document.getElementById('text'), /*optionality*/1, /*err*/null, webRestoreCallback);
              }
            });
          });
        } else {
          var transferAttempted = false;
          var transferPurchaseCallback = function(result) {
            window.transferPurchaseCallback = null;
            clearScreen(function() {
              var transferPlatform = window.isIosApp ? "ios" : "android";

              if (result === "launch_failed") {
                if (!transferAttempted) {
                  transferAttempted = true;
                  printParagraph(
                    "The \""+gameTitle+"\" app is not installed on your current device. To transfer "+
                    "purchases from another app, you'll need to install the \""+gameTitle+"\" app and "+
                    "this \""+omnibus+"\" app at the same time."
                  );
                } else {
                  printParagraph(
                    "The \""+gameTitle+"\" app is not responding. Try uninstalling and reinstalling "+
                    "the \""+gameTitle+"\" app and trying again.");
                  printParagraph("Sometimes purchases can fail to "+
                    "restore for reasons outside our control. If you have already purchased "+
                    "this product, please email a copy of your receipt to "+
                    "[url=mailto:"+transferPlatform+"-transfer-"+storeName+"-missing@choiceofgames.com]"+transferPlatform+"-transfer-"+storeName+"-missing@choiceofgames.com[/url] and we'll find a way to help "+
                    "you."
                  );
                }

                var appLink = window.isIosApp ? "https://itunes.apple.com/app/id"+appId
                  : window.isAmazonAndroidApp ? "https://www.amazon.com/gp/mas/dl/android?p="+appId
                  : "https://play.google.com/store/apps/details?id="+appId;
                printParagraph("[url="+appLink+"]Download "+gameTitle+" from the "+appStore+"[/url]");

                printOptions([""], [
                  {name:"I've installed the \""+gameTitle+
                    "\" app. Try restoring purchases again.", group:"choice", retry:true},
                  {name:"Cancel.", group:"choice"},
                ], function (option) {
                  if (option.retry) {
                    window.transferPurchaseCallback = transferPurchaseCallback;
                    startLoading();
                    window.isIosApp ? callIos("transferpurchase") : purchaseTransfer.requestTransfer(appId);
                  } else {
                    callback(!"purchased");
                  }
                });
                curl();
              } else if (result === "done") {
                checkPurchase(product, function(ok, purchases) {
                  if (purchases[product]) {
                    callback("purchased");
                  } else {
                    printParagraph("Restore completed. "+appStore+" records indicate that you have not purchased "+
                    "this product in the \""+gameTitle+"\" app.");
                    printParagraph("Sometimes purchases can fail to restore for reasons outside our control. If you "+
                    "have already purchased this product, please email a copy of your receipt "+
                    "to [url=mailto:"+transferPlatform+"-transfer-"+storeName+"-failed@choiceofgames.com]"+transferPlatform+"-transfer-"+storeName+"-failed@choiceofgames.com[/url] and we'll find a "+
                    "way to help you.");
                    var target = document.getElementById('text');
                    printButton("Next", target, false, function() {
                      callback(!"purchased");
                    });
                    curl();
                  }
                });
              } else { // result === "error"
                printParagraph("Restore failed. Please try again later. If this error "+
                  "persists, please contact [url=mailto:"+transferPlatform+"-transfer-"+storeName+"-error@choiceofgames.com]"+transferPlatform+"-transfer-"+storeName+"-error@choiceofgames.com[/url] "+
                  "and we'll find a way to help you.")
                printOptions([""], [
                  {name:"Try again now.", group:"choice", retry:true},
                  {name:"Cancel.", group:"choice"},
                ], function(option) {
                  if (option.retry) {
                    window.transferPurchaseCallback = transferPurchaseCallback;
                    clearScreen(function() {
                      startLoading();
                      window.isIosApp ? callIos("transferpurchase") : purchaseTransfer.requestTransfer(appId);
                    });
                  } else {
                    callback(!"purchased");
                  }
                });
                curl();
              }
            });
          }
          if (window.isIosApp) {
            startLoading();
            window.transferPurchaseCallback = transferPurchaseCallback;
            callIos("transferpurchase");
          } else {
            isRegistered(function(registered) {
              if (registered) {
                window.transferPurchaseCallback = transferPurchaseCallback;
                clearScreen(function() {
                  startLoading();
                  purchaseTransfer.requestTransfer(appId);
                });
              } else {
                clearScreen(function() {
                  printParagraph("To restore purchases in the "+omnibus+" app using the "+gameTitle+" app, you'll first need to sign in using a Choiceofgames.com account.");
                  loginForm(document.getElementById('text'), /*optionality*/1, /*err*/null, function(ok) {
                    if (ok) {
                      window.transferPurchaseCallback = transferPurchaseCallback;
                      clearScreen(function() {
                        startLoading();
                        purchaseTransfer.requestTransfer(appId);
                      });
                    } else {
                      webRestoreCallback();
                    }
                  });
                });
              }
            });
          }
        }
      });
      curl();
    });
  }

  if (window.isIosApp) {
    window.restoreCallback = secondaryRestore;
    callIos("restorepurchases");
  } else if (window.isAndroidApp) {
    window.restoreCallback = secondaryRestore;
    androidBilling.forceRestoreTransactions();
  } else if (isWebPurchaseSupported()) {
    isRegistered(function(registered) {
      if (registered) {
        startLoading();
        xhrAuthRequest("GET", "get-purchases", function(ok, response) {
          doneLoading();
          if (ok) {
            cacheKnownPurchases(response);
          } else {
            if (response.error != "not registered") {
              alertify.error("There was an error downloading your purchases from Choiceofgames.com. "+
                "Please refresh this page to try again, or contact " + getSupportEmail() + " for assistance.", 15000);
            }
          }
          logout();
          restorePurchases(product, callback);
        });
      } else {
        clearScreen(function() {
          var target = document.getElementById('text');
          target.innerHTML="<p>Please sign in to Choiceofgames.com to restore purchases.</p>";
          var steamRestore = false;
          var steamLink = document.getElementById('steamLink');
          if (steamLink && steamLink.href && !/INSERTINSERTINSERT/.test(steamLink.href)) {
            steamRestore = true;
          }
          if (steamRestore) {
            window.steamRestoreCallback = function(response) {
              window.steamRestoreCallback = null;
              if (response) cacheKnownPurchases(response);
              webRestoreCallback();
            }
          }
          loginForm(document.getElementById('text'), /*optional*/1, /*err*/null, webRestoreCallback);
          curl();
        });
      }
    });
  } else {
    safeTimeout(callback, 0);
  }
}
// Callback expects a localized string, or "", or "free", or "guess"
function getPrice(product, callback) {
  if (window.isIosApp) {
    checkForAppUpdates();
    window.priceCallback = callback;
    callIos("price", product);
  } else if (window.isAndroidApp) {
    window.priceCallback = callback;
    androidBilling.getPrice(product);
  } else if (window.isWeb) {
    checkForAppUpdates();
    if (window.productData && window.productData[product] && window.productData[product].amount) {
      safeTimeout(function () {
        callback.call(this, "$"+(productData[product].amount/100));
      }, 0);
    } else {
      safeTimeout(function() {
        if (window.productData && window.productData[product] && window.productData[product].amount) {
          callback.call(this, "$"+(productData[product].amount/100));
        } else {
          callback.call(this, "guess");
        }
      }, 500);
    }
  } else if (window.isGreenworks) {
    if (window.productData && window.productData[product]) {
      safeTimeout(function () {
        callback.call(this, productData[product]);
      }, 0);
    } else {
      window.awaitSteamProductData = function() {
        doneLoading();
        window.awaitSteamProductData = null;
        if (window.productData && window.productData[product]) {
          callback.call(this, productData[product]);
        } else {
          callback.call(this, "hide");
        }
      };
      startLoading();
      safeTimeout(function() {if (window.awaitSteamProductData) awaitSteamProductData();}, 5000);
    }
  } else {
    safeTimeout(function () {
      callback.call(this, "hide");
    }, 0);
  }
}
// Callback expects no args, but should only be called on success
function purchase(product, callback) {
  var purchaseCallback = function() {
    window.purchaseCallback = null;
    refreshIfAppUpdateReady();
    updateAllPaidSceneCaches();
    safeCall(null, callback);
    if (window.purchaseSubscriptions && purchaseSubscriptions[product]) {
      purchaseSubscriptions[product].call();
    }
  };
  if (window.isIosApp) {
    if (!window.purchaseRequiresLogin || window.registered) {
      window.purchaseCallback = purchaseCallback;
      return callIos("purchase", product);
    } else {
      clearScreen(function() {
        var target = document.getElementById('text');
        target.innerHTML="<p>Please sign in to Choiceofgames.com to purchase.</p>";
        loginForm(target, /*optional*/1, /*err*/null, function(registered){
          if (registered) {
            if (window.knownPurchases && window.knownPurchases[product]) {
              purchaseCallback();
            } else {
              clearScreen(function() {loadAndRestoreGame("", window.forcedScene);});
              window.doneLoadingCallback = function() {
                window.purchaseCallback = purchaseCallback;
                callIos("purchase", product);
              }
            }
          } else {
            clearScreen(function() {loadAndRestoreGame("", window.forcedScene);});
          }
        });
        curl();
      });
    }
  } else if (window.isAndroidApp) {
    window.purchaseCallback = purchaseCallback;
    var androidStackTrace = androidBilling.purchase(product);
    if (androidStackTrace) throw new Error(androidStackTrace);
  } else if (window.isWinOldApp) {
    window.external.Purchase(product);
  } else if (window.isMacApp && window.macPurchase) {
    macPurchase.purchase_(product);
  } else if (window.isGreenworks) {
    var greenworksApps = require('../package.json').products;
    if (greenworksApps[product]) require("electron").shell.openExternal("steam://advertise/"+greenworksApps[product]);
  } else if (window.isCef) {
    cefQuerySimple("Purchase " + product);
    // no callback; we'll refresh on purchase
  } else if (window.isWeb && !isPrerelease() && product == window.appPurchase) {
    var webStoreFallback = function() {
      window.appPurchase = null;
      purchase(product, callback);
    };
    var clickLink = function(id) {
      var link = document.getElementById(id);
      if (!link) return webStoreFallback();
      var href = link.getAttribute("href");
      if (!href) return webStoreFallback();
      window.location.href = href;
    };
    
    // instead of IAP, send the user to a store
    if (/(iPhone OS|iPad)/.test(navigator.userAgent)) {
      if (/iPhone OS [456]_/.test(navigator.userAgent)) {
        // ancient versions of iOS can't use our app
        webStoreFallback();
      } else {
        clickLink("iphoneLink");
      }
    } else if (/Silk/.test(navigator.userAgent)) {
      clickLink("kindleLink");
    } else if (/Android/.test(navigator.userAgent)) {
      clickLink("androidLink");
    } else if (window.steamClobber && document.getElementById("steamLink")) {
      clickLink("steamLink");
    } else {
      webStoreFallback();
    }
  } else if (isWebPurchaseSupported()) {
    if (!window.StripeCheckout) return asyncAlert("Sorry, we weren't able to initiate payment. (Your "+
      "network connection may be down.) Please refresh the page and try again, or contact "+
      "support@choiceofgames.com for assistance.");
    var fullProductName = window.storeName + "." + product;
    function stripe() {
      if (window.productData && window.productData[product]) {
        var data = productData[product];
        return StripeCheckout.open({
          key:         window.stripeKey,
          address:     false,
          amount:      data.amount,
          name:        data.display_name,
          email:       window.recordedEmail,
          panelLabel:  'Buy',
          token:       function(response) {
            clearScreen(function() {
              startLoading();
              xhrAuthRequest("POST", "purchase", function(ok, response) {
                doneLoading();
                if (ok) {
                  cacheKnownPurchases(response);
                  return purchaseCallback();
                } else if (/^card error: /.test(response.error)) {
                  var cardError = response.error.substring("card error: ".length);
                  asyncAlert(cardError);
                  clearScreen(function() {loadAndRestoreGame("", window.forcedScene);});
                } else if ("purchase already in flight" == response.error) {
                  asyncAlert("Sorry, there was an error handling your purchase. Please wait five minutes and try again, or contact support@choiceofgames.com for assistance.");
                  clearScreen(function() {loadAndRestoreGame("", window.forcedScene);});
                } else {
                  asyncAlert("Sorry, there was an error processing your card. (Your "+
                    "network connection may be down.) Please refresh the page and try again, or contact "+
                    "support@choiceofgames.com for assistance.");
                  clearScreen(function() {loadAndRestoreGame("", window.forcedScene);});
                }
                curl();
              }, "stripeToken", response.id, "product", fullProductName, "key", window.stripeKey);
            });
          }
        });
      } else {
        return asyncAlert("Sorry, we weren't able to initiate payment. (Your "+
          "network connection may be down.) Please refresh the page and try again, or contact "+
          "support@choiceofgames.com for assistance.");
      }
    }
    if (window.registered && window.recordedEmail) {
      stripe();
    }
    clearScreen(function() {
      var target = document.getElementById('text');
      target.innerHTML="<p>Please sign in to Choiceofgames.com to purchase.</p>";
      loginForm(document.getElementById('text'), /*optional*/1, /*err*/null, function(registered){
        if (registered) {
          if (window.knownPurchases && window.knownPurchases[product]) {
            purchaseCallback();
          } else {
            clearScreen(function() {loadAndRestoreGame("", window.forcedScene);});
            return stripe();
          }
        } else {
          clearScreen(function() {loadAndRestoreGame("", window.forcedScene);});
        }
      });
      curl();
    });
  } else {
    safeTimeout(purchaseCallback, 0);
  }
}

function printDiscount(product, fullYear, oneBasedMonthNumber, dayOfMonth, line, options) {
  if (window.updatedDiscountDates && updatedDiscountDates[product]) {
    var udd = updatedDiscountDates[product];
    fullYear = udd.fullYear;
    oneBasedMonthNumber = udd.oneBasedMonthNumber;
    dayOfMonth = udd.dayOfMonth;
  }
  var shortMonthString = shortMonthStrings[oneBasedMonthNumber];
  var discountTimestamp = new Date(shortMonthString + " " + dayOfMonth + ", " + fullYear).getTime();
  var discountEligible = new Date().getTime() < discountTimestamp;
  var span;
  span = document.createElement("span");
  span.setAttribute("id", "discount_" + product);
  printx(line, span);
  span.innerHTML = span.innerHTML.replace("${choice_discount_ends}", "<span id=discountdate_"+product+">"+shortMonthString + " " + parseInt(dayOfMonth, 10) + "</span>") + " ";

  if (!discountEligible) {
    span.style.display = "none";
  }

  document.getElementById('text').appendChild(span);
}

function rewriteDiscount(product, fullYear, oneBasedMonthNumber, dayOfMonth) {
  if (!window.updatedDiscountDates) window.updatedDiscountDates = {};
  window.updatedDiscountDates[product] = {fullYear:fullYear, oneBasedMonthNumber:oneBasedMonthNumber, dayOfMonth:dayOfMonth};
  var span = document.getElementById("discount_"+product);
  if (!span) return;
  var shortMonthString = shortMonthStrings[oneBasedMonthNumber];
  var discountTimestamp = new Date(shortMonthString + " " + dayOfMonth + ", " + fullYear).getTime();
  var discountEligible = new Date().getTime() < discountTimestamp;
  if (discountEligible) {
    var dateSpan = document.getElementById("discountdate_"+product);
    if (!dateSpan) return;
    span.style.display = "";
    dateSpan.innerHTML = shortMonthString + " " + parseInt(dayOfMonth, 10);
  } else {
    span.style.display = "none";
  }
}

function handleDiscountResponse(ok, response) {
  if (!ok || !response || !window.storeName || !response[storeName]) return;
  if (!window.updatedDiscountDates) window.updatedDiscountDates = {};
  var udds = response[storeName];
  for (var product in udds) {
    if (!udds.hasOwnProperty(product)) continue;
    var udd = udds[product];
    var result = udd.split("-");
    rewriteDiscount(product, result[0], parseInt(result[1],10), parseInt(result[2], 10));
  }
}

function isPrerelease() {
  if (typeof window != "undefined" && !!window.isWeb && window.releaseDate) {
    if (new Date() > window.releaseDate.getTime()) return false;
    if (/(fullaccess|preview)@choiceofgames.com/.test(getCookieByName("login"))) return false;
    var identity = document.getElementById("identity");
    return !(identity && /(fullaccess|preview)@choiceofgames.com/.test(identity.innerHTML));
  } else {
    return false;
  }
}

function registerNativeAchievement(name) {
  if (window.blockNativeAchievements) return;
  if (window.isIosApp) {
    callIos("achieve", name+"/");
  } else if (window.isMacApp && window.macAchievements) {
    macAchievements.achieve_(name);
  } else if (window.isWinOldApp) {
    window.external.Achieve(name);
  } else if (window.isCef) {
    cefQuerySimple("Achieve " + name);
  } else if (window.isGreenworks) {
    require('greenworks').activateAchievement(name, function() {
      console.log("registered achievement " + name);
    })
  }
}

function achieve(name, title, description) {
  if (initStore()) {
    checkAchievements(function() {
      window.store.set("achieved", toJson(nav.achieved));
    })
  }
  registerNativeAchievement(name);
  // Game Center shows a prominent banner; no need to show our own
  if (window.isIosApp && !window.isOmnibusApp) return;
  var escapedTitle = title+"".replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  var escapedDescription = description+"".replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\[b\]/g, '<b>')
    .replace(/\[\/b\]/g, '</b>')
    .replace(/\[i\]/g, '<i>')
    .replace(/\[\/i\]/g, '</i>');
  var html = "<b>Achievement: "+escapedTitle+"</b><br>" + escapedDescription;
  alertify.log(html);
}

function checkAchievements(callback) {
  safeTimeout(function() {
    if (!initStore()) return callback();
    window.store.get("achieved", function(ok, value){
      function mergeNativeAchievements(achieved) {
        window.checkAchievementCallback = null;
        var nativeRegistered = {};
        for (var i = 0; i < achieved.length; i++) {
          nav.achieved[achieved[i]] = true;
          nativeRegistered[achieved[i]] = true;
        }
        for (var achievement in nav.achieved) {
          if (nav.achieved[achievement] && !nativeRegistered[achievement]) {
            registerNativeAchievement(achievement);
          }
        }
        callback();
      }
      var alreadyLoadingAchievements = false;
      if (ok && value) {
        var achievementRecord = jsonParse(value);
        for (var achieved in achievementRecord) {
          if (achievementRecord[achieved]) nav.achieved[achieved] = true;
        }
      }
      if (window.isIosApp) {
        alreadyLoadingAchievements = !!window.checkAchievementCallback;
        window.checkAchievementCallback = mergeNativeAchievements;
        if (!alreadyLoadingAchievements) callIos("checkachievements");
      } else if (window.isGreenworks) {
        if (!window.greenworksAchivementCallbackCount) {
          var greenworks = require('greenworks');
          var nativeAchievementNames = greenworks.getAchievementNames();
          window.greenworksAchivementCallbackCount = nativeAchievementNames.length;
          if (!window.greenworksAchivementCallbackCount) {
            return callback();
          }
          var nativeAchievements = [];
          for (var i = 0; i < nativeAchievementNames.length; i++) {
            (function(i) {
              greenworks.getAchievement(nativeAchievementNames[i], function(bAchieved) {
                greenworksAchivementCallbackCount--;
                if (bAchieved) {
                  nativeAchievements.push(nativeAchievementNames[i]);
                }
                if (!greenworksAchivementCallbackCount) {
                  mergeNativeAchievements(nativeAchievements);
                }
              }, function(err) {
                greenworksAchivementCallbackCount--;
              });
            })(i);
          }
        }
      } else if (window.isMacApp && window.macAchievements) {
        alreadyLoadingAchievements = !!window.checkAchievementCallback;
        window.checkAchievementCallback = mergeNativeAchievements;
        if (!alreadyLoadingAchievements) macAchievements.checkAchievements();
      } else if (window.isWinOldApp) {
        var checkWinAchievements = function () {
          var achieved = eval(window.external.GetAchieved());
          if (achieved) {
            mergeNativeAchievements(achieved);
          } else {
            safeTimeout(checkWinAchievements, 100);
          }
        };
        checkWinAchievements();
      } else if (window.isCef) {
        var checkCefAchievements = function() {
          cefQuery({
            request:"GetAchieved ",
            onSuccess: function(response) {
              //console.log("GetAchieved " + response);
              var achieved = eval(response);
              mergeNativeAchievements(achieved);
            },
            onFailure: function(error_code, error_message) {
              //console.error("GetAchieved error " + error_message);
              if (error_code == 1) {
                safeTimeout(checkCefAchievements, 100);
              } else {
                callback();
              }
            }
          });
        };
        checkCefAchievements();
      } else {
        callback();
      }
    });
  },0);
}

function isAdvertisingSupported() {
  if (typeof window === "undefined") return false;
  return (window.isIosApp || window.isAndroidApp);
}

function isFullScreenAdvertisingSupported() {
  return isAdvertisingSupported();
}

function showFullScreenAdvertisement(callback) {
  if (window.isIosApp) {
    callIos("advertisement");
    safeTimeout(callback, 0);
  } else if (window.isAndroidApp && window.adBridge) {
    adBridge.displayFullScreenAdvertisement();
    safeTimeout(callback, 0);
  } else {
    safeTimeout(callback, 0);
  }
}

function showTicker(target, endTimeInSeconds, finishedCallback) {
  if (!target) target = document.getElementById('text');
  var div = document.createElement("span");
  div.setAttribute("id", "delayTicker");
  target.appendChild(div);
  var timerDisplay = document.createElement("span");
  div.appendChild(timerDisplay);
  var timer;

  var statsButton = document.getElementById("statsButton");
  if (statsButton) {
    var defaultStatsButtonDisplay = statsButton.style.display;
    statsButton.style.display = "none";
  }

  if (endTimeInSeconds > Math.floor(new Date().getTime() / 1000)) {
    if (window.isAndroidApp) {
      notificationBridge.scheduleNotification(endTimeInSeconds);
    } else if (window.isIosApp) {
      callIos("schedulenotification", endTimeInSeconds);
    }
  }

  function cleanUpTicker() {
    window.blockRestart = false;
    if (window.isAndroidApp) {
      notificationBridge.cancelNotification();
    } else if (window.isIosApp) {
      callIos("cancelnotifications");
    }
    clearInterval(timer);
    if (statsButton) statsButton.style.display = defaultStatsButtonDisplay;
  }

  function formatSecondsRemaining(secondsRemaining, forceMinutes) {
    if (!forceMinutes && secondsRemaining < 60) {
      return ""+secondsRemaining+"s";
    } else {
      var minutesRemaining = Math.floor(secondsRemaining / 60);
      var remainderSeconds;
      if (minutesRemaining < 60) {
        remainderSeconds = secondsRemaining - minutesRemaining * 60;
        return ""+minutesRemaining+"m " + formatSecondsRemaining(remainderSeconds);
      } else if (minutesRemaining < 6000) {
        var hoursRemaining = Math.floor(secondsRemaining / 3600);
        remainderSeconds = secondsRemaining - hoursRemaining * 3600;
        return ""+hoursRemaining+"h " + formatSecondsRemaining(remainderSeconds, true);
      } else {
        var daysRemaining = Math.floor(secondsRemaining / 86400);
        remainderSeconds = secondsRemaining - daysRemaining * 86400;
        return ""+daysRemaining+" days " + formatSecondsRemaining(remainderSeconds, true);
      }
    }
  }

  function tick() {
    var tickerElement = document.getElementById("delayTicker");
    var tickerStillVisible = tickerElement && tickerElement.parentNode && tickerElement.parentNode.parentNode;
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
      tickerElement.innerHTML = "0s remaining";
      if (finishedCallback) safeCall(null, finishedCallback);
    }
  }

  timer = setInterval(tick, 1000);
  tick();
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
    button.setAttribute("type", "button");
    printx(name, button);
  }
  setClass(button, "next");
  button.setAttribute("accesskey", "n");
  if (code) button.onclick = function(event) {
    if (window.isIosApp) {
      window.freezeCallback = function() {
        window.freezeCallback = null;
        code(event);
      };
      callIos("freeze");
    } else {
      safeCall(null, function() {code(event);});
    }
  };
  if (!isMobile) try { button.focus(); } catch (e) {}
  parent.appendChild(button);
  return button;
}

function printLink(target, href, anchorText, onclick) {
  if (!target) target = document.getElementById('text');
  var link = document.createElement("a");
  link.setAttribute("href", href);
  link.appendChild(document.createTextNode(anchorText));
  if (onclick) {
    if (link.addEventListener) {
      link.addEventListener("click", onclick, true);
    } else {
      link.onclick = onclick;
    }
  }
  target.appendChild(link);
  target.appendChild(document.createTextNode(" "));
}

function kindleButton(target, query, buttonName) {
  printButton(buttonName, main, false,
    function() {
      try {
        window.location.href="http://www.amazon.com/s?rh=n%3A133140011%2Ck%3A" + encodeURIComponent(query);
      } catch (e) {} // xulrunner will intercept this link and throw an exception, opening it in the external browser
    }
  );
}

function printInput(target, inputOptions, callback, minimum, maximum, step) {
    if (!target) target = document.getElementById('text');
    var form = document.createElement("form");
    target.appendChild(form);
    var self = this;
    form.action="#";


    if (inputOptions.long) {
      var input = document.createElement("textarea");
      input.setAttribute("rows", 4);
    } else {
      var input = document.createElement("input");
      if (inputOptions.numeric) {
        input.setAttribute("type", "number");
        input.setAttribute("min", minimum);
        input.setAttribute("max", maximum);
        step = step || "any";
        input.setAttribute("step", step);
      }
    }

    input.setAttribute("autocomplete", "off");

    input.name="text";
    input.setAttribute("style", "font-size: 25px; width: 90%;");
    form.appendChild(input);

    form.onsubmit = function(e) {
        preventDefault(e);
        if (!input.value && !inputOptions.allow_blank) {
            asyncAlert("Don't just leave it blank!  Type something!");
            return;
        }
        if (window.isIosApp) {
          window.freezeCallback = function() {
            window.freezeCallback = null;
            safeCall(null, function() {callback(input.value);});
          };
          callIos("freeze");
        } else {
          safeCall(null, function() {callback(input.value);});
        }
        return false;
    };

    printButton("Next", form, true);

}

function promptEmailAddress(target, defaultEmail, allowContinue, callback) {
  if (!target) target = document.getElementById('text');
  var form = document.createElement("form");
  var self = this;
  form.action="#";

  var message = document.createElement("div");
  message.style.color = "red";
  message.style.fontWeight = "bold";
  message.setAttribute("id", "errorMessage");
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

  if (allowContinue) {
    printButton("No, Thanks", target, false, function() {
      callback(true);
    });
  }

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

  curl();
}

function loginForm(target, optional, errorMessage, callback) {
  if (!isRegisterAllowed() || !initStore()) return safeTimeout(function() {
    callback(!"ok");
  }, 0);
  var optional_start = 1;
  var optional_returning_subscribe = 2;
  var optional_returning_no_subscribe = 3;
  var optional_new_subscribe = 4;
  var optional_new_no_subscribe = 5;
  startLoading();
  fetchEmail(function(defaultEmail) {
    isRegistered(function(registered) {
      if (registered) {
        if (defaultEmail) {
          doneLoading();
          loginDiv(registered, defaultEmail);
          return safeTimeout(callback, 0);
        }
        // Cookie says I'm logged in, but we have no local record of the email address
        return getRemoteEmail(function(ok, response) {
          doneLoading();
          if (ok) {
            if (response.email) {
              loginDiv(registered, response.email);
              return recordEmail(response.email, callback);
            } else {
              // not really logged in after all
              logout();
              loginDiv();
              return loginForm(target, optional, errorMessage, callback);
            }
          } else {
            // missed an opportunity to record email locally. meh.
            return safeCall(null, callback);
          }
        });
      }
      doneLoading();
      var form = document.createElement("form");

    if (!errorMessage) errorMessage = "";

      var escapedEmail = defaultEmail.replace(/'/g, "&apos;");
      var passwordButton;
      if (optional == optional_start) {
        form.innerHTML = "<div id=message style='color:red; font-weight:bold'>"+errorMessage+
          "</div><div class='choice'>"+
          "<label for=yes class=firstChild><input type=radio name=choice value=yes id=yes checked> My email address is: "+
          "<input type=email name=email id=email value='"+escapedEmail+"' style='font-size: 25px; width: 11em'></label>"+
          ((isWeb && window.facebookAppId)?"<label for=facebook><input type=radio name=choice value=facebook id=facebook > Sign in with Facebook.</label>":"")+
          ((isWeb && window.googleAppId)?"<label for=google><input type=radio name=choice value=google id=google > Sign in with Google.</label>":"")+
          ((window.steamRestoreCallback)?"<label for=steam><input type=radio name=choice value=steam id=steam > Restore purchases from Steam.</label>":"")+
          "<label for=no class=lastChild><input type=radio name=choice value=no id=no > No, thanks.</label>"+
          "<p><label class=noBorder for=subscribe><input type=checkbox name=subscribe id=subscribe checked> "+
          "Email me when new games are available.</label></p>";

        form.email.onclick = function() {
          setTimeout(function() {form.email.focus();}, 0);
        };
        setTimeout(function() {form.email.focus();}, 0);
      } else {
        form.innerHTML = "<div id=message style='color:red; font-weight:bold'>"+errorMessage+
          "</div><span><span>My email address is: </span><input type=email name=email id=email value='"+
          escapedEmail+"' style='font-size: 25px; width: 12em'></span><p><label class=noBorder id=subscribeLabel for=subscribe>"+
          "<input type=checkbox name=subscribe id=subscribe checked> "+
          "Email me when new games are available.</label></p><p>Do you have a Choiceofgames.com password?</p>"+
          "<div class='choice'>"+
          "<label for=new class=firstChild><input type=radio name=choice value=new id=new checked> No, I'm new.</label>"+
          "<label for=passwordButton><input type=radio name=choice value=passwordButton id=passwordButton> "+
          "Yes, I have a password: <input id=password type=password name=password disabled class=needsclick style='font-size: 25px; width: 11em'></label>"+
          "<label for=forgot><input type=radio name=choice value=forgot id=forgot> I forgot my password.</label>"+
          ((isWeb && window.facebookAppId)?"<label for=facebook><input type=radio name=choice value=facebook id=facebook> Sign in with Facebook.</label>":"")+
          ((isWeb && window.googleAppId)?"<label for=google><input type=radio name=choice value=google id=google> Sign in with Google.</label>":"")+
          (optional ? "<label for=no><input type=radio name=choice value=no id=no> Cancel.</label>" : "") +
          "</div>";

        var labels = form.getElementsByTagName("label");
        setClass(labels[labels.length-1], "lastChild");

        var password = form.password;
        passwordButton = form.passwordButton;

        passwordButton.parentNode.onclick = function() {
          passwordButton.checked = true;
          passwordButton.onchange();
        };

        var radioButtons = form.choice;
        var onchange = function() {
          var enabled = passwordButton.checked;
          password.disabled = !enabled;
          if (enabled) {
            password.focus();
            setTimeout(function() {password.parentNode.scrollIntoView();}, 0);
          }
        };
        for (var i = radioButtons.length - 1; i >= 0; i--) {
          radioButtons[i].onchange = onchange;
        }
        if (optional) {
          form.subscribe.checked = (optional == optional_returning_subscribe || optional == optional_new_subscribe);
          passwordButton.checked = (optional == optional_returning_subscribe || optional == optional_returning_no_subscribe);
        }
      }

      function showMessage(msg) {
        var message = document.getElementById('message');
        var messageText = document.createTextNode(msg);
        message.innerHTML = "";
        message.appendChild(messageText);
      }

      form.onsubmit = function(event) {
        preventDefault(event);
        var email = trim(form.email.value);
        var subscribe = form.subscribe.checked;
        var choice = getFormValue("choice");
        if ("steam" == choice) {
          window.open('https://www.choiceofgames.com/api/Steam/');
        }
        if ("facebook" == choice) {
          if (!window.FB) return asyncAlert("Sorry, we weren't able to sign you in with Facebook. (Your network connection may be down.) Please try again later, or contact support@choiceofgames.com for assistance.");
          var loginParams = {scope:'email',return_scopes:true};
          if (window.facebookReRequest) loginParams.auth_type = "rerequest";
          return FB.login(function(response){
            if ("connected" == response.status) {
              var grantedScopes = [];
              try { grantedScopes = response.authResponse.grantedScopes.split(","); } catch (e) {}
              var grantedEmail = false;
              for (var i = 0; i < grantedScopes.length; i++) {
                if ("email" == grantedScopes[i]) {
                  grantedEmail = true;
                  break;
                }
              }
              if (grantedEmail) {
                xhrAuthRequest("POST", "facebook-login", function(ok, response){
                  if (ok) {
                    loginDiv(ok, response.email);
                    recordLogin(ok, response.id, response.email);
                    cacheKnownPurchases(response.purchases);
                    safeCall(null, function() {callback("ok");});
                  } else {
                    asyncAlert("Sorry, we weren't able to sign you in with Facebook. (Your network connection may be down.) Please try again later, or contact support@choiceofgames.com for assistance.");
                  }
                }, "app_id", facebookAppId);
              } else {
                showMessage("Sorry, we require an email address to sign you in. Please grant access to your email address, or type your email address below.");
                window.facebookReRequest = true;
              }
            }
          },loginParams);
        }
        if ("google" == choice) {
          if (!window.gapi) return asyncAlert("Sorry, we weren't able to sign you in with Google. (Your network connection may be down.) Please try again later, or contact support@choiceofgames.com for assistance.");
          var done = false;
          return gapi.auth.signIn({callback: function (authResult) {
            if (done) return;
            done = true;
            if (authResult['status']['signed_in']) {
              isRegistered(function(registered) {
                if (!registered) xhrAuthRequest("POST", "google-login", function(ok, response){
                  loginDiv(ok, response.email);
                  recordLogin(ok, response.id, response.email);
                  cacheKnownPurchases(response.purchases);
                  if (ok) {
                    callback("ok");
                  } else {
                    asyncAlert("Sorry, we weren't able to sign you in with Google. Please try again later, or contact support@choiceofgames.com for assistance.");
                  }
                }, "code", authResult['code'], "client_id", googleAppId);
              });
            } else {
              asyncAlert("Sorry, we weren't able to sign you in with Google. Please try again later, or contact support@choiceofgames.com for assistance.");
            }
          }});
        }
        if (!/^\S+@\S+\.\S+$/.test(email) && "no" != choice) {
          showMessage('Sorry, "'+email+'" is not an email address.  Please type your email address again.');
        } else {
          recordEmail(email, function() {
            if ("yes" == choice) {
              clearScreen(function() {
                if (defaultEmail) {
                  optional = subscribe ? optional_returning_subscribe : optional_returning_no_subscribe;
                } else {
                  optional = subscribe ? optional_new_subscribe : optional_new_no_subscribe;
                }
                loginForm(document.getElementById("text"), optional, null, callback);
                curl();
              });
            } else if ("no" == choice) {
              safeCall(null, function() {callback(false);});
            } else if ("new" == choice) {
              target.innerHTML = "";
              window.scrollTo(0,1);
              form = document.createElement("form");
              var escapedEmail = email.replace(/'/g, "&apos;");
              form.innerHTML = "<div id=message style='color:red; font-weight:bold'></div>"+
                "<div>My email address is: </div><div><input type=email name=email id=email value='"+
                escapedEmail+"' style='font-size: 25px; width: 12em'></div>"+
                "<div>Type it again: </div><div><input type=email name=email2 id=email2 autocomplete='off' style='font-size: 25px; width: 12em'></div>"+
                "<div>Enter a new password:&nbsp;</div><div>"+
                "<input type=password name=password id=password style='font-size: 25px; width: 12em'></div>";
              form.onsubmit = function(event) {
                preventDefault(event);
                var email = trim(form.email.value);
                var email2 = trim(form.email2.value);
                if (!/^\S+@\S+\.\S+$/.test(email)) {
                  showMessage('Sorry, "'+email+'" is not an email address.  Please type your email address again.');
                  return;
                } else if (email != email2) {
                  showMessage('Those email addresses don\'t match.  Please type your email address again.');
                  return;
                }
                startLoading();
                form.style.display = "none";
                window.scrollTo(0,1);
                login(email, form.password.value, /*register*/true, subscribe, function(ok, response) {
                  doneLoading();
                  if (ok) {
                    target.innerHTML = "";
                    loginDiv(ok, email);
                    recordLogin(ok, response.id, email);
                    cacheKnownPurchases(response.purchases);
                    // we need another click event so we can launch Stripe in a pop-up
                    if (window.isWeb) {
                      asyncAlert("You have registered successfully.", function() {
                        safeCall(null, function() {callback("ok");});
                      });
                    } else {
                      return safeCall(null, function() {callback("ok");});
                    }
                  } else if ("incorrect password" == response.error) {
                    target.innerHTML = "";
                    loginForm(target, optional, 'Sorry, the email address "'+email+'" is already in use. Please type your password below, or use a different email address.', callback);
                  } else {
                    form.style.display = "";
                    showMessage("Sorry, we weren't able to sign you in. (Your network connection may be down.) Please try again later, or contact support@choiceofgames.com for assistance.");
                  }
                });
              };
              target.appendChild(form);
              println("", form);
              printButton("Next", form, true);
              if (optional) {
                printButton("Cancel", form, false, function() {
                  safeCall(null, function() {callback(false);});
                });
              }
            } else if ("passwordButton" == choice) {
              startLoading();
              form.style.display = "none";
              window.scrollTo(0,1);
              login(email, form.password.value, /*register*/false, form.subscribe.checked, function(ok, response) {
                doneLoading();
                form.style.display = "";
                if (ok) {
                  target.innerHTML = "";
                  loginDiv(ok, email);
                  recordLogin(ok, response.id, email);
                  cacheKnownPurchases(response.purchases);
                  // we need another click event so we can launch Stripe in a pop-up
                  if (window.isWeb) {
                    asyncAlert("You have registered successfully.", function() {
                      safeCall(null, function() {callback("ok");});
                    });
                  } else {
                    return safeCall(null, function() {callback("ok");});
                  }
                } else if ("unknown email" == response.error) {
                  showMessage('Sorry, we can\'t find a record for the email address "'+email+'". Please try a different email address, or create a new account.');
                } else if ("incorrect password" == response.error) {
                  showMessage('Sorry, that password is incorrect. Please try again, or select "I forgot my password" to reset your password.');
                } else {
                  showMessage("Sorry, we weren't able to sign you in. (Your network connection may be down.) Please try again later, or contact support@choiceofgames.com for assistance.");
                }
              });
            } else if ("forgot" == choice) {
              startLoading();
              form.style.display = "none";
              window.scrollTo(0,1);
              forgotPassword(email, function(ok, response) {
                doneLoading();
                form.style.display = "";
                if (ok) {
                  showMessage("We've emailed you a link to reset your password. Please check your email and click on the link, then return here to sign in.");
                  document.getElementById('passwordButton').checked = true;
                  document.getElementById('passwordButton').onchange();
                } else if ("unknown email" == response.error) {
                  showMessage('Sorry, we can\'t find a record for the email address "'+email+'". Please try a different email address, or create a new account.');
                } else {
                  showMessage("Sorry, we weren't able to sign you in. (Your network connection may be down.) Please try again later, or contact support@choiceofgames.com for assistance.");
                }
              });
            }
          });
        }
      };

      target.appendChild(form);
      if (passwordButton && passwordButton.checked) passwordButton.onchange();
      if (optional && optional > 1) document.getElementById("subscribeLabel").style.display = "none";
      printButton("Next", form, true);
      printFooter();
    });
  });
}

function loginDiv(registered, email) {
  var domain = "https://www.choiceofgames.com/";
  var identity = document.getElementById("identity");
  if (!identity) return;
  if (registered) {
    var emailLink = document.getElementById("email");
    emailLink.setAttribute("href", domain + "profile" + "/");
    emailLink.innerHTML = "";
    emailLink.appendChild(document.createTextNode(email));
    identity.style.display = "block";
    var logoutLink = document.getElementById("logout");
    logoutLink.onclick = function(event) {
      preventDefault(event);
      logout();
      loginDiv();
    };
  } else {
    identity.style.display = "none";
  }
}

function isRegistered(callback) {
  if (window.isWeb) {
    return safeTimeout(function() {
      if (!window.registered) window.registered = !!getCookieByName("login");
      callback(window.registered);
    }, 0);
  } else if (initStore()) {
    return window.store.get("login", function(ok, value) {
      safeTimeout(function() {
        window.registered = ok && value && "false" != value && "0" != value;
        callback(window.registered);
      }, 0);
    });
  } else {
    safeCall(null, function() {
      window.registered = false;
      callback(false);
    });
  }
}

function isRegisterAllowed() {
  return window.isWeb || window.isIosApp || window.isAndroidApp;
}

function preventDefault(event) {
  if (!event) event = window.event;
  if (!event) return;
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
    if ((i + 1) % colWidth === 0) {
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
    textArea.onclick = function() {textArea.select();};
    textArea.value = (password);
    target.appendChild(textArea);
  }
}

function changeTitle(title) {
  document.title = title;
  var h1 = document.getElementsByTagName("h1");
  if (h1) h1 = h1[0];
  h1.innerHTML = "";
  h1.appendChild(document.createTextNode(title));
  if (window.isWinOldApp) {
    window.external.SetTitle(title);
  }
}

function changeAuthor(author) {
  var authorTag = document.getElementById("author");
  authorTag.innerHTML = "";
  authorTag.appendChild(document.createTextNode("by " + author));
}


function reportBug() {
  var prompt = "Please explain the problem. Be sure to describe what you expect, as well as what actually happened.";
  alertify.prompt(prompt, function(ok, body) {
    var statMsg = "(unknown)";
    try {
        var scene = window.stats.scene;
        statMsg = computeCookie(scene.stats, scene.temps, scene.lineNum, scene.indent);
    } catch (ex) {}
    body += "\n\nGame: " + window.storeName;
    if (window.stats && window.stats.scene) {
      body += "\nScene: " + window.stats.scene.name;
      body += "\nLine: " + (window.stats.scene.lineNum+1);
    }
    body += "\nUser Agent: " + navigator.userAgent;
    body += "\nLoad time: " + window.loadTime;
    if (window.Persist) body += "\nPersist: " + window.Persist.type;
    body += "\nversion=" + window.version;
    body += "\n\n" + statMsg;
    if (window.nav && window.nav.bugLog) body += "\n\n" + window.nav.bugLog.join("\n");
    console.log(body);
    if (ok) alertify.prompt("Please type your email address.", function(ok, email) {
      if (ok) xhrAuthRequest("POST", "support-mail", function(ok, response) {
        if (ok) {
          alertify.log("Thank you for reporting a bug!");
        } else {
          alertify.alert("Bug reporting failed. Please email your bug report to support@choiceofgames.com (and be sure to mention that the bug reporter failed!)");
        }
      }, "email", encodeURIComponent(email),
        "subject", encodeURIComponent("bug report " + window.storeName),
        "text", encodeURIComponent(body));
    });
  });
}

window.registered = false;

function getSupportEmail() {
  if (window.storeName) {
    return "support-" + storeName + "-" + platformCode() + "@choiceofgames.com";
  }
  try {
    return document.getElementById("supportEmail").getAttribute("href").substring(7);
  } catch (e) {
    return "support-external@choiceofgames.com";
  }
}

function absolutizeAboutLink() {
  var aboutAnchor = document.getElementById("aboutLink");
  if (aboutLink) {
    var aboutHref = aboutLink.getAttribute("href");
    if (/^https?:/.test(aboutHref)) return;

    var linkTags = document.getElementsByTagName("link");
    var canonical;
    for (var i = 0; i < linkTags.length; i++) {
      if (linkTags[i].getAttribute("rel") == "canonical") {
        canonical = linkTags[i].getAttribute("href");
        break;
      }
    }

    if (!canonical) return;

    var absoluteCanonical;
    if (/^https?:/.test(canonical)) {
      absoluteCanonical = canonical;
    } else if (/^\//.test(canonical)) {
      absoluteCanonical = "https://www.choiceofgames.com" + canonical;
    } else {
      absoluteCanonical = "https://www.choiceofgames.com/" + canonical;
    }
    if (!/\/$/.test(canonical)) {
      absoluteCanonical += "/";
    }

    aboutLink.setAttribute("href", absoluteCanonical + aboutHref);
  }
}

function aboutClick() {
    window.location.href = document.getElementById("aboutLink").href;
}

function loadPreferences() {
  if (initStore()) {
    store.get("preferredZoom", function(ok, preferredZoom) {
      if (ok && !isNaN(parseFloat(preferredZoom))) {
        setZoomFactor(parseFloat(preferredZoom));
      }
    });
    store.get("preferredBackground", function(ok, preferredBackground) {
      if (!/^(sepia|black|white)$/.test(preferredBackground)) {
        preferredBackground = "sepia";
      }
      if (preferredBackground === "black") {
        document.body.classList.add("nightmode");
      } else if (preferredBackground === "white") {
        document.body.classList.add("whitemode");
      }
    });
    store.get("preferredAnimation", function(ok, preferredAnimation) {
      window.animateEnabled = parseFloat(preferredAnimation) !== 2;
    });
  } else {
    window.animateEnabled = true;
  }
  if (typeof document.body.style.animationName === "undefined") {
    if (typeof document.body.style.webkitAnimationName === "undefined") {
      window.animateEnabled = false;
    } else {
      window.animationProperty = "webkitAnimationName";
    }
  } else {
    window.animationProperty = "animationName";
  }
  if (window.isCef || document.getElementsByTagName("audio").length) {
    delete window.animationProperty;
  }
}

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
    if (!window.storeName) return;
    var ok = confirm("Sorry, an error occured.  Click OK to email error data to support.");
    if (ok) {
        var statMsg = "(unknown)";
        try {
          var scene = window.stats.scene;
          statMsg = computeCookie(scene.stats, scene.temps, scene.lineNum, scene.indent);
        } catch (ex) {}
        var body = "What were you doing when the error occured?\n\nError: " + msg;
        body += "\n\nGame: " + window.storeName;
        if (window.stats && window.stats.scene) {
          body += "\nScene: " + window.stats.scene.name;
          body += "\nLine: " + (window.stats.scene.lineNum + 1);
        }
        if (file) body += "\nJS File: " + file;
        if (line) body += "\nJS Line: " + line;
        if (stack) body += "\nJS Stack: " + stack;
        body += "\nUser Agent: " + navigator.userAgent;
        body += "\nLoad time: " + window.loadTime;
        if (window.Persist) body += "\nPersist: " + window.Persist.type;
        body += "\n\n" + statMsg + "\n\nversion=" + window.version;
        if (window.currentVersion) {
          body += "\ncurrentVersion=" + window.currentVersion;
        }
        if (window.nav && window.nav.bugLog) body += "\n\n" + window.nav.bugLog.join("\n");
        var supportEmailHref = "mailto:support-external@choiceofgames.com";
        try {
          supportEmailHref="mailto:"+getSupportEmail();
          supportEmailHref=supportEmailHref.replace(/\+/g,"%2B");
        } catch (e) {}
        window.location.href=(supportEmailHref + "?subject=Error Report&body=" + encodeURIComponent(body));
    }
};

window.onload=function() {
    if (window.alreadyLoaded) return;
    window.alreadyLoaded = true;
    setTimeout(updateAllPaidSceneCaches, 0);
    window.main = document.getElementById("main");
    var head = document.getElementsByTagName("head")[0];
    window.nav.setStartingStatsClone(window.stats);
    loadPreferences();
    if (window.achievements && window.achievements.length) {
      nav.loadAchievements(window.achievements);
      checkAchievements(function() {});
      setButtonTitles();
    }
    nav.loadProducts(window.knownProducts, window.purchases);
    stats.sceneName = window.nav.getStartupScene();
    var map = parseQueryString(window.location.search);
    if (!map) {
      var hashMap = parseQueryString(window.location.hash);
      var realHash = false;
      for (var key in hashMap) {
        if (/^utm_/.test(key)) continue;
        realHash = true;
        break;
      }
      if (realHash) map = hashMap;
    }

    if (!map) {
      if (window.androidQueryString) {
        map = parseQueryString(window.androidQueryString.get());
      } else if (window.forcedScreenshots) {
        map = {forcedScene:"screenshots"};
      }
    }

    if (map) {
      window.forcedScene = map.forcedScene;
      window.slot = map.slot;
      window.debug = map.debug;
      if (map.restart) {
        restartGame();
      } else if (map.achievements) {
        doneLoading();
        showAchievements("hideNextButton");
      } else if (map.omnibusRestore) {
        restorePurchases('adfree', function(purchased) {
          if (window.isIosApp) {
            callIos('close');
          } else {
            setTimeout(function() {window.closer.close()}, 0);
          }
        });
      } else if (map.forcedScene) {
        safeCall(null, function() {loadAndRestoreGame(window.slot, window.forcedScene);});
      } else if (map.persistence) {
        var persistenceParts = map.persistence.split("|");
        if (persistenceParts.length == 2) {
          window.storeName = persistenceParts[0];
          window.remoteStoreName = persistenceParts[1];
        } else {
          window.storeName = map.persistence;
        }
        var startupScene = new Scene("startup", window.stats, window.nav, {secondaryMode:"startup", saveSlot:"startup"});
        startupScene.startupCallback = function() {
          safeCall(null, loadAndRestoreGame);
        }
        startupScene.execute();
      } else if (map.textOptionsMenu) {
        textOptionsMenu({size:1, color:1, animation:1});
      } else {
        safeCall(null, loadAndRestoreGame);
      }
    } else {
      safeCall(null, loadAndRestoreGame);
    }
    if (window.Touch && window.isWeb) {
      // INSERT ADMOB AD
    }
    isRegistered(function(registered){
      if (registered) {
        fetchEmail(function(email) {
          loginDiv(registered, email);
        });
      } else {
        loginDiv();
      }
    });
    if (window.isWinStoreApp || window.isWinOldApp) {
        var subscribeAnchor = document.getElementById("subscribeLink");
        if (subscribeAnchor) {
            subscribeAnchor.onclick = function() {
              safeCall(null, subscribeLink);
              return false;
            };
        }
    }
    if (window.isCef || window.isNode || window.isMacApp) {
      var menuButton = document.getElementById("menuButton");
      if (menuButton) {
        menuButton.innerHTML = "Menu";
      }
    }
    if (window.isWinOldApp) {
        absolutizeAboutLink();
        var h1s = document.getElementsByTagName("h1");
        if (h1s.length) window.external.SetTitle(document.getElementsByTagName("h1")[0].innerText);
    }
    if (isFollowEnabled()) {
      var shareElement = document.getElementById("share");
      if (shareElement) shareElement.innerHTML = '<iframe src="//www.facebook.com/plugins/like.php?href=https%3A%2F%2Fwww.facebook.com%2Fchoiceofgames&amp;send=false'+
      '&amp;layout=button_count&amp;width=90&amp;show_faces=true&amp;font&amp;colorscheme=light&amp;action=like&amp;height=20&amp;appId=190439350983878"'+
      ' scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:90px; height:20px;" allowTransparency="true"></iframe>'+
      '<iframe allowtransparency="true" frameborder="0" scrolling="no" '+
      'src="//platform.twitter.com/widgets/follow_button.html?screen_name=choiceofgames&amp;show_screen_name=false"'+
      ' style="width:160px; height:20px;"></iframe>';
    }
    var supportEmailLink = document.getElementById("supportEmail");
    if (window.storeName && supportEmailLink) {
      supportEmailLink.href = "mailto:" + getSupportEmail();
    }

    submitAnyDirtySaves();

    if (window.purchaseSubscriptions) {
      var productList = "";
      for (var key in purchaseSubscriptions) {
        productList += (productList ? " " : "") + key;
      }
      if (productList) checkPurchase(productList, function() {});
    }
    if (window.isWeb) {
      (function() {
        if (isPrerelease()) {
          var appLinks = document.getElementById('mobileLinks');
          if (appLinks) appLinks.style.display = 'none';
        }
        var productMap = {};
        if (typeof purchases === "object") {
          for (var scene in purchases) {
            productMap[purchases[scene]] = 1;
          }
        }
        if (!window.knownProducts) window.knownProducts = [];
        for (var product in productMap) {
          window.knownProducts.push(product);
        }

        var fullProducts = [];
        for (var i = 0; i < window.knownProducts.length; i++) {
          fullProducts[i] = window.storeName + "." + window.knownProducts[i];
        }
        xhrAuthRequest("GET", "product-data", function(ok, data) {
          if (!window.productData) window.productData = {};
          for (var i = 0; i < window.knownProducts.length; i++) {
            window.productData[window.knownProducts[i]] = data[window.storeName + "." + window.knownProducts[i]];
          }
        }, "products", fullProducts.join(","));
      })();
    }

};

if ( document.addEventListener ) {
  document.addEventListener( "DOMContentLoaded", window.onload, false );
}

try {
  var style = document.createElement('style');
  style.type = 'text/css';
  try {style.innerHTML = 'noscript {display: none;}'; } catch (e) {}
  document.getElementsByTagName('head')[0].appendChild(style);
} catch (e) {}

if (window.isWeb) {
  document.getElementById("dynamic").innerHTML = ".webOnly { display: block; }";
  var checkoutScript = document.createElement("script");
  checkoutScript.async = 1;
  checkoutScript.src="https://checkout.stripe.com/v2/checkout.js";
  document.getElementsByTagName("head")[0].appendChild(checkoutScript);

  var metas = document.getElementsByTagName("meta");
  var facebookAppId, googleAppId;
  var googleLoginCallbackCallback;
  for (var i = 0; i < metas.length; i++) {
    var meta = metas[i];
    if ("fb:app_id" == meta.getAttribute("property")) {
      facebookAppId = meta.getAttribute("content");
    } else if ("google-signin-clientid" == meta.getAttribute("name")) {
      googleAppId = meta.getAttribute("content");
    }
  }

  if (facebookAppId) {
    window.fbAsyncInit = function() {
      FB.init({
        appId      : facebookAppId,
        cookie     : true,  // enable cookies to allow the server to access 
                            // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.0' // use version 2.0
      });
    };

    (function(d, s, id){
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src ="//connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document,'script','facebook-jssdk'));
  }

  if (googleAppId) (function() {
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/client:plusone.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
  })();
  
} else if (window.isIosApp) {
  document.getElementById("dynamic").innerHTML =
  "#header { display: none; }"+
  ""+
  "body { transition-duration: 0; }"+
  ""+
  "#emailUs { display: none; }"+
  ""+
  "#main { padding-top: 1em; }";
  // Use UIWebView width, not screen width, on iPad
  document.querySelector("meta[name=viewport]").setAttribute("content", "width="+window.innerWidth);
  window.addEventListener("resize", function() {
      document.querySelector("meta[name=viewport]").setAttribute("content", "width="+window.innerWidth);
      // this dummy element seems to be required to get the viewport to stick
      var dummy = document.createElement("p");
      dummy.innerHTML = "&nbsp;";
      document.body.appendChild(dummy);
      window.setTimeout(function() {document.body.removeChild(dummy);}, 10);
    }, false);
  callIos("checkdiscounts");
  // in a timeout because iOS may try to add to the head before mygame.js has run
  (function(){
    var requester = function() {
      if (window.stats) {
        callIos("requestscenes");
      } else {
        safeTimeout(requester, 1);
      }
    }
    if (window.isFile) safeTimeout(requester, 0);
  })();
} else if (window.isAndroidApp) {
  document.getElementById("dynamic").innerHTML =
  "#header { display: none; }"+
  ""+
  "#emailUs { display: none; }"+
  ""+
  "#main { padding-top: 1em; }";
} else if (window.isMacApp || window.isWinOldApp || window.isCef || window.isNode) {
  document.getElementById("dynamic").innerHTML =
    "#headerLinks { display: none; }"+
    ""+
    "#emailUs { display: none; }";
}
// on touch devices, this hover state never goes away
if (!('ontouchstart' in window)) {
  document.getElementById("dynamic").innerHTML += ".choice > div:hover {background-color: #E4DED8;}\n" +
    "body.nightmode .choice > div:hover {background-color: #555;}\n"+
    "body.whitemode .choice > div:hover {background-color: #ddd;}\n";
}
function fixChromeLinks() {
  var aboutLink = document.getElementById("aboutLink");
  aboutLink.addEventListener("click", function() {
    if (chrome.app.window) {
      event.preventDefault();
      chrome.app.window.create("credits.html", {}, function(w) {
        w.contentWindow.addEventListener( "DOMContentLoaded", function() {
          var win = this;
          var back = win.document.getElementById("back");
          back.addEventListener("click", function(event) {
            event.preventDefault();
            win.close();
          }, false);
          var base = win.document.createElement('base');
          base.setAttribute("target", "_blank");
          win.document.head.appendChild(base);
          win.document.documentElement.style.overflowY = "scroll";
        }, false);
      });
    }
  }, false);

  var statsButton = document.getElementById("statsButton");
  if (statsButton) {
    statsButton.onclick = undefined;
    statsButton.addEventListener("click", function() {
      showStats();
    }, false);
  }

  var achievementsButton = document.getElementById("achievementsButton");
  if (achievementsButton) {
    achievementsButton.onclick = undefined;
    achievementsButton.addEventListener("click", function() {
      showAchievements();
    }, false);
  }

  var restartButton = document.getElementById("restartButton");
  restartButton.onclick = undefined;
  restartButton.addEventListener("click", function() {
    restartGame("prompt");
  }, false);

  var subscribeAnchor = document.getElementById("subscribeLink");
  subscribeAnchor.onclick = undefined;
  subscribeAnchor.addEventListener("click", function() {
    subscribeLink();
  }, false);

  var supportAnchor = document.getElementById("supportEmail");
  supportAnchor.addEventListener("click", function(event) {
    event.preventDefault();
  }, false);

  var menuButton = document.getElementById("menuButton");
  menuButton.onclick = undefined;
  menuButton.addEventListener("click", function() {
    textOptionsMenu();
  }, false);
}
if (window.isChromeApp) {
  var base = document.createElement('base');
  base.setAttribute("target", "_blank");
  document.head.appendChild(base);

  document.addEventListener("DOMContentLoaded", fixChromeLinks);
  setInterval(function() {
    document.body.style.height = document.querySelector(".container").offsetHeight + "px";
  }, 100);
}
if (window.isCef) {
  var pollPurchases = function() {
    cefQuery({
      request:"PollPurchases",
      onSuccess:function(response){
        //console.log("PollPurchases: '"+response+"'");
        if (response) {
          clearScreen(loadAndRestoreGame);
        }
        safeTimeout(pollPurchases, 100);
      },
      onFailure:function(error_code, error_message) {
        console.error("PollPurchases error: " + error_message);
      }
    });
  };
  pollPurchases();
} else if (window.isGreenworks) {
	(function() {
		var greenworksApps = require('../package.json').products;
		if (typeof greenworksApps === "undefined") throw new Error("package.json missing products");
		var greenworksAppId = window.isTrial ? greenworksApps.steam_demo : greenworksApps.adfree;
		if (greenworks.restartAppIfNecessary(greenworksAppId)) return require('electron').remote.app.quit();
		if (!greenworks.initAPI()) {
			var errorCode = greenworks.isSteamRunning() ? 77778 : 77777;
			alert("There was an error connecting to Steam. Steam must be running" +
				" to play this game. If you launched this game using Steam, try restarting Steam" +
				" or rebooting your computer. If that doesn't work, try completely uninstalling" +
				" Steam and downloading a fresh copy from steampowered.com.\n\nIf none of that works, please contact" +
				" support@choiceofgames.com and we'll try to help. (Mention error code "+errorCode+".)")
			require('electron').remote.app.quit();
    }
		if (window.isTrial && greenworks.isSubscribedApp(greenworksApps.adfree)) {
			alert("This is the demo version of the game, " +
				"but you now own the full version. The demo will now exit. Your progress has been saved." +
				" Please launch the full version of the game using Steam.");
			require('electron').remote.app.quit();
		}
		var pollPurchases = function(oldCount) {
			var count = 0;
			for (var product in greenworksApps) {
				if (greenworks.isSubscribedApp(greenworksApps[product])) {
					count++;
				}
			}
			if (count != oldCount && typeof oldCount !== "undefined") clearScreen(loadAndRestoreGame);
			safeTimeout(function() {pollPurchases(count)}, 100);
		};
		pollPurchases();

    var appIds = [];
    for (var product in greenworksApps) {
      appIds.push(greenworksApps[product]);
    }

    xhrAuthRequest("GET", "steam-price", function(ok, data) {
      if (!window.productData) window.productData = {};
      for (var product in greenworksApps) {
        window.productData[product] = data[greenworksApps[product]];
      }
      if (window.awaitSteamProductData) window.awaitSteamProductData();
    }, "user_id", greenworks.getSteamId().steamId, "app_ids", appIds.join(","));
	})();
}

function winStoreShareLinkHandler(e) {
    var request = e.request;
    var canonical = document.querySelector("link[rel=canonical]");
    var canonicalHref = canonical && canonical.getAttribute("href");
    if (!/^https?:/.test(canonicalHref)) {
        canonicalHref = "https://www.choiceofgames.com" + canonicalHref;
    }
    if (!/\/$/.test(canonicalHref)) {
        canonicalHref += "/";
    }
    canonicalHref += "redirect.php?src=winshare";
    request.data.properties.title = document.title;
    request.data.properties.description = document.querySelector("meta[name=description]").getAttribute("content");
    request.data.setUri(new Windows.Foundation.Uri(canonicalHref));
}

if (window.isWinStoreApp) {
    var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
    dataTransferManager.addEventListener("datarequested", winStoreShareLinkHandler);

    baseScript = document.createElement("script");
    baseScript.src = "//Microsoft.WinJS.1.0/js/base.js";
    baseScript.onload = function () {
        WinJS.Application.onsettings = function (e) {
            var privacyCmd = new Windows.UI.ApplicationSettings.SettingsCommand("privacy", "Privacy Policy", function () {
                window.open("https://www.choiceofgames.com/privacy-policy");
            });
            e.detail.e.request.applicationCommands.append(privacyCmd);
        };
        WinJS.Application.start();
    };
    document.head.appendChild(baseScript);

    uiScript = document.createElement("script");
    uiScript.src = "//Microsoft.WinJS.1.0/js/ui.js";
    document.head.appendChild(uiScript);
} else if (window.isWinOldApp) {
    console = {
        log: function (message) { window.external.ConsoleLog(message); },
        error: function (message) { window.external.ConsoleError(message); }
    };
    document.oncontextmenu = function() {return false;};
}

function platformCode() {
  var platform = "unknown";
  if (window.isIosApp) platform = "ios";
  else if (window.isAndroidApp) platform = "android";
  else if (window.isMacApp) platform = "mac";
  else if (window.isWinStoreApp) platform = "windows";
  else if (window.isWinOldApp) platform = "csharp";
  else if (window.isChromeApp) platform = "chrome";
  else if (window.isWebOS) platform = "palm";
  else if (window.isSteamApp) platform = "steam";
  else if (window.isCef) platform = "cef";
  else if (window.isNode) platform = "dl";
  else if (window.isWeb) platform = "web";
  if (window.isOmnibusApp) platform = "omnibus-" + platform;
  return platform;
}

function reinjectNavigator() {
  if (window.stats && window.stats.scene && window.stats.scene.nav) {
    var scene = window.stats.scene;
    scene.nav = window.nav;
    nav.repairStats(scene.stats);
  }
}
