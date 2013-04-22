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
    if (msg === null || msg === undefined || msg === "") return;
    if (!parent) parent = document.getElementById('text');
    if (msg == " ") {
      // IE7 doesn't like innerHTML that's nothing but " "
      parent.appendChild(document.createTextNode(" "));
      return;
    }
    msg = (msg+"").replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\[b\]/g, '<b>')
      .replace(/\[\/b\]/g, '</b>')
      .replace(/\[i\]/g, '<i>')
      .replace(/\[\/i\]/g, '</i>');
    var frag = document.createDocumentFragment();
    temp = document.createElement('div');
    temp.innerHTML = msg;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    parent.appendChild(frag);
}

function println(msg, parent) {
    if (!parent) parent = document.getElementById('text');
    printx(msg, parent);
    var br = window.document.createElement("br");
    parent.appendChild(br);
}


function showStats() {
    if (window.stats.sceneName == "choicescript_stats") {
      window.stats.scene = window.stats.scene.originalScene;
      clearScreen(loadAndRestoreGame);
      return;
    }
    var currentScene = window.stats.scene;
    var scene = new Scene("choicescript_stats", window.stats, this.nav);
    scene.originalScene = currentScene;
    main.innerHTML = "<div id='text'></div>";
    scene.execute();
}

function callIos(scheme, path) {
  if (!window.isIosApp) return;
  if (!path) path = "";
  setTimeout(function() {
    var iframe = document.createElement("IFRAME");
    iframe.setAttribute("src", scheme + "://" + path);
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;
  }, 0);
}

function asyncAlert(message, callback) {
  if (window.isIosApp) {
    window.alertCallback = callback;
    callIos("alert", message);
  } else if (window.isAndroidApp) {
    setTimeout(function() {
      alert(message);
      if (callback) callback();
    }, 0);
  } else {
    alertify.alert(message, callback);
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
  } else {
    alertify.confirm(message, callback);
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
      setTimeout(function() {
        if (window.isChromeApp) {
          document.body.firstElementChild.scrollIntoView();
        } else {
          window.scrollTo(0,0);
        }
      }, 0);
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
    };
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
  var statsButton = document.getElementById("statsButton");
  if (statsButton) {
    if (window.stats.sceneName == "choicescript_stats") {
      statsButton.innerHTML = "Return to the Game";
    } else {
      statsButton.innerHTML = "Show Stats";
    }
  }
  setTimeout(function() {callIos("curl");}, 0);
}

function fastRefresh() {
  function fastRestore(state) {
    window.stats = state.stats;
    var scene = new Scene(state.stats.sceneName, state.stats, window.nav, state.debug || window.debug);
    scene.loadSceneFast();
    clearScreen(function() {scene.execute();});
  }
  function valueLoaded(ok, value) {
    safeCall(null, function() {
      var state = null;
      if (ok && value && ""+value) {
        state = jsonParse(value);
        state.stats.sceneName = forcedScene;
        fastRestore(state);
      }
    });
  }
  if (window.forcedScene && window.stats && window.stats.scene && window.stats.scene.name == window.forcedScene) {
    var scene = window.stats.scene;
    window.cachedResult = {crc:scene.temps.choice_crc, lines:scene.lines, labels:scene.labels};
    if (!slot) slot = "";
    if (initStore()) {
      window.store.get("state"+slot, valueLoaded);
    } else {
      fastRestore({stats:{sceneName:forcedScene}});
    }
    return;
  }
  clearScreen(function() {loadAndRestoreGame(window.slot, window.forcedScene);});
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
        callback(option);
      });
      return false;
  };

  if (!options) throw new Error(this.lineMsg()+"undefined options");
  if (!options.length) throw new Error(this.lineMsg()+"no options");
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

  form.appendChild(document.createElement("br"));

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
    var id = name + localChoiceNumber;
    if (!name) name = "choice";
    var radio;
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
    if (window.Touch && !unselectable) { // Make labels clickable on iPhone
        label.onclick = function labelClick(evt) {
            var target = evt.target;
            if (!target) return;
            var isLabel = /label/i.test(target.tagName);
            if (!isLabel) return;
            var id = target.getAttribute("for");
            if (!id) return;
            var button = document.getElementById(id);
            if (!button) return;
            button.checked = true;
        };
    }
    printx(line, label);

    div.appendChild(label);
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
      if (window.isAmazonAndroidApp) {
        var androidLink = document.getElementById('androidLink');
        if (androidLink && androidLink.href) {
          androidUrl = androidLink.href;
          var package = /id=([\.\w]+)/.exec(androidUrl)[1];
          window.location.href = "http://www.amazon.com/gp/mas/dl/android?p="+package+"&showAll=1&t=choofgam-20&ref=moreGames";
        } else {
          window.location.href = "http://www.amazon.com/gp/mas/dl/android?p=com.choiceofgames.dragon&showAll=1&t=choofgam-20&ref=moreGames";
        }
      } else {
        window.location.href = "market://search?q=pub:%22Choice+of+Games+LLC";
      }
    } else {
      try {
        if (window.isChromeApp) {
          window.open("http://www.choiceofgames.com/category/our-games/");
        } else {
          window.location.href = "http://www.choiceofgames.com/category/our-games/";
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
    msgDiv.appendChild(document.createElement("br")); // insert our own paragraph break, to match <ul>
    msgDiv.appendChild(document.createElement("br"));
    target.appendChild(msgDiv);
    return;
  }

  var mobileMesg = "";
  if (isMobile && isFile) {
    if (window.isAndroidApp) {
      var androidLink = document.getElementById('androidLink');
      var androidUrl;
      if (androidLink) {
        androidUrl = androidLink.href;
        if (androidUrl) {
          if (window.isAmazonAndroidApp) {
            var package = /id=([\.\w]+)/.exec(androidUrl)[1];
            androidUrl = "http://www.amazon.com/gp/mas/dl/android?p="+package+"&t=choofgam-20&ref=rate";
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
    shareLinkText = "<li>TODO Share Link 1, e.g. \"Rate this App in the App Store\"<li>TODO Share Link 2, e.g. StumbleUpon<li>TODO Share Link 3, e.g. Facebook<li>TODO Share Link 4, e.g. Twitter";
  }

  var nowMsg = "";
  if (now) nowMsg = "<p>Please support our work by sharing this game with friends!  The more people play, the more resources we'll have to work on the next game.</p>";
  msgDiv.innerHTML = nowMsg + "<ul id='sharelist'>\n"+
    mobileMesg+
    shareLinkText+
    "</ul><br>\n"; // just one line break; <ul> provides its own
  target.appendChild(msgDiv);
}

function shareAction(e) {
  clearScreen(function() {
    var target = document.getElementById('text');
    printShareLinks(target, "now");
    printButton("Next", target, false, function () {
      clearScreen(loadAndRestoreGame);
    });
  });
}

function subscribeLink(e) {
  clearScreen(function() {
    subscribe(document.getElementById('text'), "now", function() {
      clearScreen(loadAndRestoreGame);
    });
  });
}

function subscribeByMail(target, now, callback, code) {
  if (now) {
    code();
    setTimeout(function() {callback(now);}, 0);
  } else {
    printButton("Subscribe", target, false, function() {
        code();
        setTimeout(function() {callback(now);}, 0);
      });
    printButton("Next", target, false, function() {
      setTimeout(function() {callback(now);}, 0);
    });
  }
}

function subscribe(target, now, callback) {
  if (!target) target = document.getElementById('text');
  if (window.isIosApp) {
    subscribeByMail(target, now, callback, function() {
      callIos("subscribe");
    });
    return;
  }
  var mailToSupported = isFile && !window.isMacApp;
  if (window.isAndroidApp) mailToSupported = urlSupport.isSupported("mailto:support@choiceofgames.com");
  if (mailToSupported) {
    subscribeByMail(target, now, callback, function() {
      window.location.href = "mailto:subscribe-"+window.storeName+"@choiceofgames.com?subject=Sign me up&body=Please notify me when the next game is ready.";
    });
    return;
  }
  if (now) println("Type your email address below; we'll notify you when our next game is ready!");
  fetchEmail(function(defaultEmail) {
    promptEmailAddress(target, defaultEmail, function(cancel, email) {
      if (cancel) {
        return callback();
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
          document.getElementById("errorMessage").innerHTML = response.msg;
        } else {
          clearScreen(function() {
            target = document.getElementById('text');
            println(response.msg, target);
            println("", target);
            printButton("Next", target, false, function() {
              callback();
            });
          });
        }
      };
      if (window.isChromeApp) {
        chrome.permissions.contains({origins: ["http://choiceofgames.us4.list-manage.com/"]},function(isXhrAllowed) {
          if (isXhrAllowed) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", 'http://choiceofgames.us4.list-manage.com/subscribe/post-json?u=eba910fddc9629b2810db6182&id=e9cdee1aaa&EMAIL='+email, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState != 4) return;
              if (xhr.status == 200) {
                var response = JSON.parse(xhr.responseText);
                window["jsonp"+timestamp](response);
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
              iframe.contentWindow.postMessage({email:email}, "*");
            };
            document.documentElement.appendChild(iframe);
            return;
          }
        });
      } else {
        if (window.location.protocol == "https:") {
          var xhr = findXhr();
          xhr.open("GET", 'https://www.choiceofgames.com/mailchimp_proxy.php/subscribe/post-json?u=eba910fddc9629b2810db6182&id=e9cdee1aaa&EMAIL='+email, true);
          var done = false;
          xhr.onreadystatechange = function() {
            if (done) return;
            if (xhr.readyState != 4) return;
            done = true;
            if (xhr.status == 200) {
              var response = JSON.parse(xhr.responseText);
              window["jsonp"+timestamp](response);
            } else {
              window["jsonp"+timestamp]({result:"error", msg:"Sorry, our mail server had an error. It's our fault. Please try again later, or email subscribe@choiceofgames.com instead."});
            }
          };
          xhr.send();
        } else {
          script.src = 'http://choiceofgames.us4.list-manage.com/subscribe/post-json?u=eba910fddc9629b2810db6182&id=e9cdee1aaa&c=jsonp' + timestamp+"&EMAIL="+email;
          head.appendChild(script);
        }
      }
    });
  });
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
    setTimeout(function() {callback(purchases);}, 0);
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
  };
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

function achieve(name, description) {
  if (window.isIosApp) {
    callIos("achieve", name+"/"+description);
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

function showTicker(target, endTimeInSeconds, finishedCallback) {
  if (!target) target = document.getElementById('text');
  var div = document.createElement("span");
  div.setAttribute("id", "delayTicker");
  target.appendChild(div);
  var timerDisplay = document.createElement("span");
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
      var remainderSeconds;
      if (minutesRemaining < 60) {
        remainderSeconds = secondsRemaining - minutesRemaining * 60;
        return ""+minutesRemaining+"m " + formatSecondsRemaining(remainderSeconds);
      } else {
        var hoursRemaining = Math.floor(secondsRemaining / 3600);
        remainderSeconds = secondsRemaining - hoursRemaining * 3600;
        return ""+hoursRemaining+"h " + formatSecondsRemaining(remainderSeconds, true);
      }
    }
  }

  function tick() {
    window.tickerRunning = true;
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
      if (finishedCallback) finishedCallback();
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

function printInput(target, inputType, callback, minimum, maximum, step) {
    if (!target) target = document.getElementById('text');
    var form = document.createElement("form");
    target.appendChild(form);
    var self = this;
    form.action="#";


    var input = document.createElement("input");
    input.setAttribute("type", inputType);
    if (inputType == "number") {
      input.setAttribute("min", minimum);
      input.setAttribute("max", maximum);
      step = step || "any";
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
            asyncAlert("Don't just leave it blank!  Type something!");
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

function loginForm(target, optional, errorMessage, callback) {
  if (!isRegisterAllowed()) return setTimeout(function() {
    callback(!"ok");
  }, 0);
  startLoading();
  fetchEmail(function(defaultEmail) {
    isRegistered(function(registered) {
      if (registered) {
        if (defaultEmail) {
          doneLoading();
          loginDiv(registered, defaultEmail);
          return setTimeout(callback, 0);
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
            return callback();
          }
        });
      }
      doneLoading();
      var form = document.createElement("form");

      if (!errorMessage) errorMessage = "";

      var escapedEmail = defaultEmail.replace(/'/g, "&apos;");
      var newChecked = defaultEmail ? "" : "checked";
      var passwordChecked = defaultEmail ? "checked" : "";
      var passwordButton;
      if (optional == 1) {
        form.innerHTML = "<div id=message style='color:red; font-weight:bold'>"+errorMessage+
          "</div><div class='choice'>"+
          "<label for=yes class=firstChild><input type=radio name=choice value=yes id=yes checked> My email address is: "+
          "<input type=email name=email id=email value='"+escapedEmail+"' style='font-size: 25px; width: 11em'></label>"+
          "<label for=no class=lastChild><input type=radio name=choice value=no id=no > No, thanks.</label>"+
          "<p><label for=subscribe><input type=checkbox name=subscribe id=subscribe checked> "+
          "Email me when new games are available.</label></p>";
      } else {
        form.innerHTML = "<div id=message style='color:red; font-weight:bold'>"+errorMessage+
          "</div><span><span>My email address is: </span><input type=email name=email id=email value='"+
          escapedEmail+"' style='font-size: 25px; width: 12em'></span><p><label id=subscribeLabel for=subscribe>"+
          "<input type=checkbox name=subscribe id=subscribe checked> "+
          "Email me when new games are available.</label></p><p>Do you have a Choiceofgames.com password?</p>"+
          "<div class='choice'>"+
          "<label for=new class=firstChild><input type=radio name=choice value=new id=new "+newChecked+"> No, I'm new.</label>"+
          "<label for=passwordButton><input type=radio name=choice value=passwordButton id=passwordButton "+passwordChecked+"> "+
          "Yes, I have a password: <input id=password type=password name=password disabled style='width:8em'></label>"+
          "<label for=forgot class=lastChild><input type=radio name=choice value=forgot id=forgot> I forgot my password.</label>"+
          "</div><br>";

        var password = form.password;
        passwordButton = form.passwordButton;
        var radioButtons = form.choice;
        var onchange = function() {
          var enabled = passwordButton.checked;
          password.disabled = !enabled;
          if (enabled) password.focus();
        };
        for (var i = radioButtons.length - 1; i >= 0; i--) {
          radioButtons[i].onchange = onchange;
        }
        if (optional) {
          form.subscribe.checked = (optional == 2);
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
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          showMessage('Sorry, "'+email+'" is not an email address.  Please type your email address again.');
        } else {
          recordEmail(email, function() {
            var choice = getFormValue("choice");
            if ("yes" == choice) {
              clearScreen(function() {
                loginForm(document.getElementById("text"), subscribe ? 2 : 3, null, callback);
              });
            } else if ("no" == choice) {
              callback(false);
            } else if ("new" == choice) {
              target.innerHTML = "";
              window.scrollTo(0,0);
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
                target.innerHTML = "";
                window.scrollTo(0,0);
                login(email, form.password.value, /*register*/true, subscribe, function(ok, response) {
                  doneLoading();
                  if (ok) {
                    loginDiv(ok, email);
                    recordLogin(ok);
                    callback("ok");
                  } else if ("incorrect password" == response.error) {
                    loginForm(target, optional, 'Sorry, the email address "'+email+'" is already in use. Please type your password below, or use a different email address.', callback);
                  } else {
                    target.appendChild(form);
                    showMessage("Sorry, we weren't able to sign you in. (Your network connection may be down.) Please try again later, or contact support@choiceofgames.com for assistance.");
                  }
                });
              };
              target.appendChild(form);
              println("", form);
              printButton("Next", form, true);
            } else if ("passwordButton" == choice) {
              startLoading();
              target.innerHTML = "";
              window.scrollTo(0,0);
              login(email, form.password.value, /*register*/false, form.subscribe.checked, function(ok, response) {
                doneLoading();
                target.appendChild(form);
                if (ok) {
                  loginDiv(ok, email);
                  recordLogin(ok);
                  callback("ok");
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
              target.innerHTML = "";
              window.scrollTo(0,0);
              forgotPassword(email, function(ok, response) {
                doneLoading();
                target.appendChild(form);
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
      if (defaultEmail && passwordButton) passwordButton.onchange();
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
    return setTimeout(function() {
      callback(!!getCookieByName("login"));
    }, 0);
  } else if (initStore()) {
    return window.store.get("login", function(ok, value) {
      callback(ok && value && "false" != value);
    });
  } else {
    callback(false);
  }
}

function isRegisterAllowed() {
  return window.isWeb || window.isIosApp;
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

window.isWebOS = /webOS/.test(navigator.userAgent);
window.isMobile = isWebOS || /Mobile/.test(navigator.userAgent);
window.isFile = /^file:/.test(window.location.href);
window.isXul = /^chrome:/.test(window.location.href);
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
    if (!window.storeName) return;
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
};

window.onload=function() {
    if (window.alreadyLoaded) return;
    window.alreadyLoaded = true;
    window.main = document.getElementById("main");
    var head = document.getElementsByTagName("head")[0];
    window.nav.setStartingStatsClone(window.stats);
    stats.sceneName = window.nav.getStartupScene();
    var map = parseQueryString(window.location.search);

    if (map) {
      window.forcedScene = map.forcedScene;
      window.slot = map.slot;
      window.debug = map.debug;
      if (map.restart) {
        restoreGame(null, forcedScene);
      } else {
        safeCall(null, function() {loadAndRestoreGame(window.slot, window.forcedScene);});
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
};

_global = this;

if ( document.addEventListener ) {
  document.addEventListener( "DOMContentLoaded", window.onload, false );
}

var style = document.createElement('style');
style.type = 'text/css';
try {style.innerHTML = 'noscript {display: none;}'; } catch (e) {}
document.getElementsByTagName('head')[0].appendChild(style);

if (window.isWeb) {
  document.write("<style>.webOnly { display: block !important; }</style>");
}
if (!isWeb && window.isIosApp) {
  document.write("<style>"+
  "#header { display: none; }"+
  ""+
  "#emailUs { display: none; }"+
  ""+
  "#main { padding-top: 1em; }"+
  "</style>"+
  // Use UIWebView width, not screen width, on iPad
  "<meta name = 'viewport' content = 'width = "+window.innerWidth+"'>"
  );
  window.addEventListener("resize", function() {
      document.querySelector("meta[name=viewport]").setAttribute("content", "width="+window.innerWidth);
      // this dummy element seems to be required to get the viewport to stick
      var dummy = document.createElement("p");
      dummy.innerHTML = "&nbsp;";
      document.body.appendChild(dummy);
      window.setTimeout(function() {document.body.removeChild(dummy);}, 10);
    }, false);
}
if (window.isWebOS) document.write("<style>body {font-family: Prelude; font-size: 14pt}\n#header {font-size: 13pt}</style>");
if (window.isMacApp) {
  document.write("<style>"+
    "#headerLinks { display: none; }"+
    ""+
    "#emailUs { display: none; }"+
    ""+
    "</style>");
}
if (isWeb && !window.Touch) {
  document.write("<style>label:hover {background-color: #E4DED8;}</style>");
}
if (window.isChromeApp) {
  var base = document.createElement('base');
  base.setAttribute("target", "_blank");
  document.head.appendChild(base);
}
