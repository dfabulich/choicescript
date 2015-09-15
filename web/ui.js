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
      .replace(/\[n\/\]/g, '<br>')
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
    if (document.getElementById('loading')) return;
    setButtonTitles();
    if (window.stats.scene.secondaryMode == "stats") {
      clearScreen(loadAndRestoreGame);
      return;
    }
    var currentScene = window.stats.scene;
    var scene = new Scene("choicescript_stats", window.stats, this.nav, {secondaryMode:"stats", saveSlot:"temp"});
    main.innerHTML = "<div id='text'></div>";
    scene.execute();
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
    setButtonTitles();
    return clearScreen(loadAndRestoreGame);
  }
  setButtonTitles();
  button.innerHTML = "Return to the Game";
  clearScreen(function() {
    checkAchievements(function() {
      printAchievements(document.getElementById("text"));
      if (!hideNextButton) printButton("Next", main, false, function() {
        setButtonTitles();
        clearScreen(loadAndRestoreGame);
      });
    });
  });
}

function showMenu() {
  if (document.getElementById('loading')) return;
  var button = document.getElementById("menuButton");
  if (!button) return;
  if (button.innerHTML == "Return to the Game") {
    button.innerHTML = "Menu";
    return clearScreen(loadAndRestoreGame);
  }
  setButtonTitles();
  button.innerHTML = "Return to the Game";
  function menu() {
    options = [
      {name:"Return to the game.", group:"choice", resume:true},
      {name:"View the credits.", group:"choice", credits:true},
      {name:"Play more games like this.", group:"choice", moreGames:true},
      {name:"Email us at " + getSupportEmail() + ".", group:"choice", contactUs:true},
      {name:"Share this game with friends.", group:"choice", share:true},
      {name:"Email me when new games are available.", group:"choice", subscribe:true},
    ];
    printOptions([""], options, function(option) {
      if (option.resume) {
        setButtonTitles();
        return clearScreen(loadAndRestoreGame);
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
      }
    });
  }
  clearScreen(menu);
}

function setButtonTitles() {
  var button;
  button = document.getElementById("menuButton");
  if (button) {
    button.innerHTML = "Menu";
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

// in the iOS app, display a page curl animation
function curl() {
  // TODO force a reflow before curling the page
  callIos("curl");
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
          if (window.isIosApp || (window.isSafari && window.isMobile && !window.isAndroid)) {
            // focus on text for iOS Voiceover
            main.setAttribute("tabindex", "-1");
            main.focus();
          }
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
      safeCall(null, function() {
        loading = document.createElement('div');
        loading.setAttribute("id", "loading");
        loading.innerHTML = "<p>Loading...</p><p>"+
          (/MSIE [67]/.test(navigator.userAgent)?"":"<img src=\"data:image/gif;base64,R0lGODlhgAAPAPEAAPf08WJhYMvJx2JhYCH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAgAAPAAACo5QvoIC33NKKUtF3Z8RbN/55CEiNonMaJGp1bfiaMQvBtXzTpZuradUDZmY+opA3DK6KwaQTCbU9pVHc1LrDUrfarq765Ya9u+VRzLyO12lwG10yy39zY11Jz9t/6jf5/HfXB8hGWKaHt6eYyDgo6BaH6CgJ+QhnmWWoiVnI6ddJmbkZGkgKujhplNpYafr5OooqGst66Uq7OpjbKmvbW/p7UAAAIfkECQoAAAAsAAAAAIAADwAAArCcP6Ag7bLYa3HSZSG2le/Zgd8TkqODHKWzXkrWaq83i7V5s6cr2f2TMsSGO9lPl+PBisSkcekMJphUZ/OopGGfWug2Jr16x92yj3w247bh6teNXseRbyvc0rbr6/x5Ng0op4YSJDb4JxhI58eliEiYYujYmFi5eEh5OZnXhylp+RiaKQpWeDf5qQk6yprawMno2nq6KlsaSauqS5rLu8cI69k7+ytcvGl6XDtsyzxcAAAh+QQJCgAAACwAAAAAgAAPAAACvpw/oIC3IKIUb8pq6cpacWyBk3htGRk1xqMmZviOcemdc4R2kF3DvfyTtFiqnPGm+yCPQdzy2RQMF9Moc+fDArU0rtMK9SYzVUYxrASrxdc0G00+K8ruOu+9tmf1W06ZfsfXJfiFZ0g4ZvEndxjouPfYFzk4mcIICJkpqUnJWYiYs9jQVpm4edqJ+lkqikDqaZoquwr7OtHqAFerqxpL2xt6yQjKO+t7bGuMu1L8a5zsHI2MtOySVwo9fb0bVQAAIfkECQoAAAAsAAAAAIAADwAAAsucP6CAt9zSErSKZyvOd/KdgZaoeaFpRZKiPi1aKlwnfzBF4jcNzDk/e7EiLuLuhzwqayfmaNnjCCGNYhXqw9qcsWjT++TqxIKp2UhOprXf7PoNrpyvQ3p8fAdu82o+O5w3h2A1+Nfl5geHuLgXhEZVWBeZSMnY1oh5qZnyKOhgiGcJKHqYOSrVmWpHGmpauvl6CkvhaUD4qejaOqvH2+doV7tSqdsrexybvMsZrDrJaqwcvSz9i9qM/Vxs7Qs6/S18a+vNjUx9/v1TAAAh+QQJCgAAACwAAAAAgAAPAAAC0Zw/oIC33NKKUomLxct4c718oPV5nJmhGPWwU9TCYTmfdXp3+aXy+wgQuRRDSCN2/PWAoqVTCSVxilQZ0RqkSXFbXdf3ZWqztnA1eUUbEc9wm8yFe+VguniKPbNf6mbU/ubn9ieUZ6hWJAhIOKbo2Pih58C3l1a5OJiJuflYZidpgHSZCOnZGXc6l3oBWrE2aQnLWYpKq2pbV4h4OIq1eldrigt8i7d73Ns3HLjMKGycHC1L+hxsXXydO9wqOu3brPnLXL3C640sK+6cTaxNflEAACH5BAkKAAAALAAAAACAAA8AAALVnD+ggLfc0opS0SeyFnjn7oGbqJHf4mXXFD2r1bKNyaEpjduhPvLaC5nJEK4YTKhI1ZI334m5g/akJacAiDUGiUOHNUd9ApTgcTN81WaRW++Riy6Tv/S4dQ1vG4ps4NwOaBYlOEVYhYbnplexyJf3ZygGOXkWuWSZuNel+aboV0k5GFo4+qN22of6CMoq2kr6apo6m5fJWCoZm+vKu2Hr6KmqiHtJLKebRhuszNlYZ3ncewh9J9z8u3mLHA0rvetrzYjd2Wz8bB6oNO5MLq6FTp2+bVUAACH5BAkKAAAALAAAAACAAA8AAALanD+ggLfc0opS0XeX2Fy8zn2gp40ieHaZFWHt9LKNO5eo3aUhvisj6RutIDUZgnaEFYnJ4M2Z4210UykQ8BtqY0yHstk1UK+/sdk63i7VYLYX2sOa0HR41S5wi7/vcMWP1FdWJ/dUGIWXxqX3xxi4l0g4GEl5yOHIBwmY2cg1aXkHSjZXmbV4uoba5kkqelbaapo6u0rbN/SZG7trKFv7e6savKTby4voaoVpNAysiXscV4w8fSn8fN1pq1kd2j1qDLK8yYy9/ff9mgwrnv2o7QwvGO1ND049UgAAIfkECQoAAAAsAAAAAIAADwAAAticP6CAt9zSilLRd2d8onvBfV0okp/pZdamNRi7ui3yyoo4Ljio42h+w6kgNiJt5kAaasdYE7D78YKlXpX6GWphxqTT210qK1Cf9XT2SKXbYvv5Bg+jaWD5ekdjU9y4+PsXRuZHRrdnZ5inVidAyCTXF+nGlVhpdjil2OE49hjICVh4qZlpibcDKug5KAlHOWqqR8rWCjl564oLFruIucaYGlz7+XoKe2wsIqxLzMxaxIuILIs6/JyLbZsdGF063Uu6vH2tXc79LZ1MLWS96t4JH/rryzhPWgAAIfkECQoAAAAsAAAAAIAADwAAAtWcP6CAt9zSilLRd2fEe4kPCk8IjqTonZnVsQ33arGLwLV8Kyeqnyb5C60gM2LO6MAlaUukwdbcBUspYFXYcla00KfSywRzv1vpldqzprHFoTv7bsOz5jUaUMer5vL+Mf7Hd5RH6HP2AdiUKLa41Tj1Acmjp0bJFuinKKiZyUhnaBd5OLnzSNbluOnZWQZqeVdIYhqWyop6ezoquTs6O0aLC5wrHErqGnvJibms3LzKLIYMe7xnO/yL7TskLVosqa1aCy3u3FrJbSwbHpy9fr1NfR4fUgAAIfkECQoAAAAsAAAAAIAADwAAAsqcP6CAt9zSilLRd2fEW7cnhKIAjmFpZla3fh7CuS38OrUR04p5Ljzp46kgMqLOaJslkbhbhfkc/lAjqmiIZUFzy2zRe5wGTdYQuKs9N5XrrZPbFu94ZYE6ms5/9cd7/T824vdGyIa3h9inJQfA+DNoCHeomIhWGUcXKFIH6RZZ6Bna6Zg5l8JnSamayto2WtoI+4jqSjvZelt7+URKpmlmKykM2vnqa1r1axdMzPz5LLooO326Owxd7Bzam4x8pZ1t3Szu3VMOdF4AACH5BAkKAAAALAAAAACAAA8AAAK/nD+ggLfc0opS0XdnxFs3/i3CSApPSWZWt4YtAsKe/DqzXRsxDqDj6VNBXENakSdMso66WzNX6fmAKCXRasQil9onM+oziYLc8tWcRW/PbGOYWupG5Tsv3TlXe9/jqj7ftpYWaPdXBzbVF2eId+jYCAn1KKlIApfCSKn5NckZ6bnJpxB2t1kKinoqJCrlRwg4GCs4W/jayUqamaqryruES2b72StsqgvsKlurDEvbvOx8mzgazNxJbD18PN1aUgAAIfkECQoAAAAsAAAAAIAADwAAArKcP6CAt9zSilLRd2fEWzf+ecgjlKaQWZ0asqPowAb4urE9yxXUAqeZ4tWEN2IOtwsqV8YkM/grLXvTYbV4PTZpWGYU9QxTxVZyd4wu975ZZ/qsjsPn2jYpatdx62b+2y8HWMTW5xZoSIcouKjYePeTh7TnqFcpabmFSfhHeemZ+RkJOrp5OHmKKapa+Hiyyokaypo6q1CaGDv6akoLu3DLmLuL28v7CdypW6vsK9vsE1UAACH5BAkKAAAALAAAAACAAA8AAAKjnD+ggLfc0opS0XdnxFs3/nkISI2icxokanVt+JoxC8G1fNOlm6tp1QNmZj6ikDcMrorBpBMJtT2lUdzUusNSt9qurvrlhr275VHMvI7XaXAbXTLLf3NjXUnP23/qN/n8d9cHyEZYpoe3p5jIOCjoFofoKAn5CGeZZaiJWcjp10mZuRkaSAq6OGmU2lhp+vk6iioay3rpSrs6mNsqa9tb+ntQAAA7AAAAAAAAAAAA\">")+
          "</p>";
        main.appendChild(loading);
      });
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
    if (window.stats.scene.secondaryMode == "stats") {
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

function printImage(source, alignment) {
  var img = document.createElement("img");
  img.src = source;
  setClass(img, "align"+alignment);
  document.getElementById("text").appendChild(img);
}

function playSound(source) {
  for (var existingAudios = document.getElementsByTagName("audio"); existingAudios.length;) {
    existingAudios[0].parentNode.removeChild(existingAudios[0]);
  }
  var audio = document.createElement("audio");
  if (audio.play) {
    audio.setAttribute("src", source);
    document.body.appendChild(audio);
    audio.play();
  }
}

function moreGames() {
    if (window.isIosApp) {
      window.location.href = "itms-apps://itunes.com/apps/choiceofgames";
    } else if (window.isAndroidApp) {
      if (window.isNookAndroidApp) {
        asyncAlert("Please search the Nook App Store for \"Choice of Games\" for more games like this!");
        return;
      }
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
    } else if (window.isSteamApp) {
      window.location.href = "https://www.choiceofgames.com/steam-curation.php";
    } else {
      try {
        if (window.isChromeApp) {
          window.open("https://www.choiceofgames.com/category/our-games/");
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
    msgDiv.appendChild(document.createElement("br")); // insert our own paragraph break, to match <ul>
    msgDiv.appendChild(document.createElement("br"));
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
  } else if (window.isSteamApp) {
    mobileMesg = "  <li><a href='#' onclick='try { purchase(\"adfree\", function() {}); } catch (e) {}; return false;'>Review this game</a> on Steam</li>\n";
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

  var shareLinkText = '<li>'+(dataUriSupported?'<img height="16" width="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACNFBMVEUAAAD///8ASZIASpIKTI0KSIcWSX5lgZ1YcIhYbYIAUpsHTpAhVIEAWaUAWaIAVp4AU5wAVJsAVJgAUpYAUpUBWaQWU4cAYqoAXqUAW6MAXKMAWqIAXKAFXZ8IWZZihZ8AbrgAbrcAaK0AZaoDbLIFZakGZqoKbrMAb7gAbrYBc7tsm7mizecge62izuiizeYBbqgId7INh8QQdqgXg7kVeK0fgLROm8Kh0uyducgRf7QXi8MvlcRTrNdZsdlvt9qDs8l/0O2v4/aY2u7j9/2/6fP4/f7s+/32/f71/f7t/P34/v76/v77/v76/f38/v7q7Oz9/v75/vvf8eX1/vjq/fDP+9zr/fDq/e+/9Mrq/e7E+Mxm3HN24YSC3YwTwSMUtSIXuycavikfxi4izDIhyTAhyTE8ykoauiclxjEowDUsxDYPthgsxTUDyQgg2iQ08jk43z3Q9tHP9dAA0gAA0QAA0AAAzwAAwQAAvAAAuwEAtAEAswAArAAB0AEBxQIBrAEC1AICtwMDvQUF1AUJ2QkL3wwL2gsKygwKwgsMxQwO3w4T6BMZ6xko7ChH3kdDyUN623qE64R8znx1wnX+/v79/f38/Pz7+/v6+vr5+fn4+Pj39/f29vby8vLx8fHq6urp6eno6Ojl5eXj4+Pg4ODf39/W1tbMzMzGxsbFxcXDw8PCwsKvr6+urq6srKypqamoqKiUlJSSkpKQkJCKioqIiIiHh4eGhoZ+fn5xcXFwcHBUP7YxAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH1wgUDigoTpImZAAAARtJREFUGNMBEAHv/gABAQEBlZeanJ2dm5iVAQEBAAGYAZVyknGMho+RpJ+YlQEAAQGVc3CNi4WBdXSIqKGalQABlXOOh4R+dnV3d3pTrKKZAJVyb39fY2ZlZG54eVc5q6AAlpODWUtHR0pPVoJ7WC8HqACZkG2VPSclJjeVaH1VLAyvAJuJbFREQj4TLZVqfVouFLIAnIqAaV1bTDU2lWt8WDgStgCclGJhYFxRMzFJXmdSPxa3AJpQTU9PRkMVDUFITkUkCLMAmKM8NDowESMYIjI7HAW7sACVn0AqISkgKCEoFwoLCLWpAAGapSsdDxsaGQ4QBAi5rqYAAZWep64fHgIDBgm6ta2nngABAZeepqqxtLi4s7Cppp6XR0lhOIfKM38AAAAASUVORK5CYII=">':"")+
        ' <a href="http://www.stumbleupon.com/submit?url='+url+'&amp;title='+title+'" class="spacedLink">StumbleUpon</a></li>'+

        '<li>'+(dataUriSupported?'<img height="16" width="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAsklEQVQ4EWNgoBAwgvQnVq75f+vBG5KMUlMQYZjfHsLIBNJFqmZkPSzEWKsqL8zQXebJICLIDVZuEzUTrg3sAjgPBwNZM7oSolyAzWaYQUS5AKYYG43XBUeWpaPogfGRwwCvAW/efwUbAPMCjI9sKl4DArKXgNXCbIbxkQ2gOAwoNgDsBS5ONgYNJTFkl2FlG2nLwMVv3HsFZlPHBTLifAznrj6Bm47OQI42mBwoM1EFAAAnVCliRFKHdQAAAABJRU5ErkJggg==">':"")+
        ' <a href="http://www.facebook.com/sharer.php?u='+url+'&amp;t='+title+'"'+
        'onclick="if (window.isFile || window.isXul) return true; '+
        'window.open(&quot;http://www.facebook.com/sharer.php?u='+url+'&amp;t='+title+
        '&quot;,&quot;sharer&quot;,&quot;toolbar=0,status=0,width=626,height=436&quot;);return false;" class="spacedLink">Facebook</a></li>'+

        '<li>'+(dataUriSupported?'<img height="16" width="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB/ElEQVQ4EYVTO24UQRB9/dmZkdfCIK0QBhMACQdwgDgMN4AEiYALcAFy7kNABkYkGzhAWMa2DHg9n+7iVfXMaAmAknp7tuvVq1dV3Q6j9SlJlzLEOXgIPPcmRjf5/7ZHdWQRaVPCOjucDYJlcHi8AFLOErz/J4kRQASXGfjYDmhIeDwAKx9xBzz8jxUCgjqSfE8CPWi5EpeTjOu+F36CVcGxrEBBMVDiaDOB5vqVBQu6WAU+dQmnwZuGwkACstxlRDckqWIhMQLPOtfXvfw0AmfA95thqwBNWGg04PktLbTYrEAlXxJTEciemtd+KdvZf7ESTjipEyaazAgyu/2lTTjP2ZpICZZQYSp7gg8kelh5PFj4Kd56ZvhE2IUSMOMVm/niZoPDOqJl0FSAYlYhoNoabSmBiI5pVNouv39w32G3l05wIwaqKRq00XErWGWYFvXz3uAbA4+51lyf+wy9h0JVRqAgfmehc8vmJt7n/CrKP6J81fzqfIPTVOOAo+S9soko+GkzhxgNocUkDfLmosPrsyvwtpTDP5KRWBz2Of4PB3vYr8o9mNuZncfLvRrPdmveJJVNDn0G8yKUMV/pO+p16MVmAn00yvnu9g7erpZ4xAbUrFtXMy42AE9YwmHNxo42lzAd6AtMQ48NgjVVOz+BVNQ9Zql4UI9P/TehBOJIi+EJIAAAAABJRU5ErkJggg==">':"")+
        ' <a href="https://twitter.com/intent/tweet?related=choiceofgames&amp;text=Awesome+game%3A+'+title+'&amp;url='+url+'&amp;via=choiceofgames" class="spacedLink">Twitter</a></li>';

  var nowMsg = "";
  if (now) nowMsg = "<p>Please support our work by sharing this game with friends!  The more people play, the more resources we'll have to work on the next game.</p>";
  msgDiv.innerHTML = nowMsg + "<ul id='sharelist'>\n"+
    mobileMesg+
    shareLinkText+
    "</ul><br>\n"; // just one line break; <ul> provides its own
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
  });
}

function isFollowEnabled() {
  if (!window.isWeb) return false;
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
    subscribe(document.getElementById('text'), "now", function() {
      clearScreen(loadAndRestoreGame);
    });
  });
}

function subscribeByMail(target, now, callback, code) {
  if (now) {
    code();
    safeTimeout(function() {callback(now);}, 0);
  } else {
    println("Click here to subscribe to our mailing list; we'll notify you when our next game is ready!");
    println("");
    printButton("Subscribe", target, false, function() {
        code();
      });
    printButton("Next", target, false, function() {
      safeTimeout(function() {callback(now);}, 0);
    });
    printFooter();
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
  var mailToSupported = isMobile && !window.isMacApp;
  if (window.isAndroidApp) mailToSupported = urlSupport.isSupported("mailto:support@choiceofgames.com");
  if (mailToSupported) {
    subscribeByMail(target, now, callback, function() {
      window.location.href = "mailto:subscribe-"+window.storeName+"-"+platformCode() + "@choiceofgames.com?subject=Sign me up&body=Please notify me when the next game is ready.";
    });
    return;
  }
  println("Type your email address below; we'll notify you when our next game is ready!");
  println("");
  fetchEmail(function(defaultEmail) {
    promptEmailAddress(target, defaultEmail, function(cancel, email) {
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
          document.getElementById("errorMessage").innerHTML = response.msg;
        } else {
          clearScreen(function() {
            target = document.getElementById('text');
            println(response.msg, target);
            println("", target);
            printButton("Next", target, false, function() {
              safeCall(null, callback);
            });
          });
        }
      };
      var mailParams = "u=eba910fddc9629b2810db6182&id=e9cdee1aaa&SIGNUP="+window.storeName+"-"+platformCode()+"&EMAIL="+encodeURIComponent(email);
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

function cacheKnownPurchases(knownPurchases) {
  if (!knownPurchases) return;
  var output = {billingSupported:true};
  for (i = 0; i < knownPurchases.length; i++) {
    var parts = knownPurchases[i].split(/\./);
    if (parts[0] != window.storeName) continue;
    output[parts[1]] = true;
  }
  window.knownPurchases = output;
}

function getKnownPurchases(callback) {
  isRegistered(function(registered){
    if (registered) {
      startLoading();
      xhrAuthRequest("GET", "get-purchases", function(ok, response) {
        doneLoading();
        if (ok) {
          cacheKnownPurchases(response);
        } else {
          if (response.error != "not registered") {
            alertify.error("There was an error downloading your purchases from Choiceofgames.com. "+
              "Please refresh this page to try again, or contact support@choiceofgames.com for assistance.", 15000);
          }
        }
        callback(ok, window.knownPurchases);
      });
    } else {
      callback("ok", {billingSupported: true});
    }
  });
}

// Callback expects a map from product ids to booleans
function checkPurchase(products, callback) {
  function publishPurchaseEvents(purchases) {
    if (window.purchaseSubscriptions) {
      for (var key in purchaseSubscriptions) {
        if (purchases[key]) purchaseSubscriptions[key].call();
      }
    }
  }

  var i;
  if (window.isIosApp) {
    window.checkPurchaseCallback = function(purchases) {
      callback("ok",purchases);
      publishPurchaseEvents(purchases);
    };
    callIos("checkpurchase", products);
  } else if (window.isAndroidApp && !window.isNookAndroidApp) {
    window.checkPurchaseCallback = function(purchases) {
      callback("ok",purchases);
      publishPurchaseEvents(purchases);
    };
    androidBilling.checkPurchase(products);
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
  } else if (isWebPurchaseSupported()) {
    isRegistered(function (registered) {
      if (!registered) return callback("ok", {billingSupported: true});
      if (window.knownPurchases) {
        safeTimeout(function() {
          callback("ok", knownPurchases);
          publishPurchaseEvents(knownPurchases);
        }, 0);
      } else {
        getKnownPurchases(function(ok, purchases){
          callback(ok, purchases);
          publishPurchaseEvents(purchases);
        });
      }
    });
  } else {
    var productList = products.split(/ /);
    var purchases = {};
    for (i = 0; i < productList.length; i++) {
      purchases[productList[i]] = true;
    }
    purchases.billingSupported = false;
    publishPurchaseEvents(purchases);
    safeTimeout(function() {callback("ok", purchases);}, 0);
  }
}

function isWebPurchaseSupported() {
  return window.isSecureWeb && isWebSavePossible() && window.stripeKey;
}

function isRestorePurchasesSupported() {
  return !!window.isIosApp || !!window.isAndroidApp || isWebPurchaseSupported();
}

function restorePurchases(callback) {
  if (window.isIosApp) {
    window.restoreCallback = callback;
    callIos("restorepurchases");
  } else if (window.isAndroidApp) {
    window.restoreCallback = function(error) {
      window.restoreCallback = null;
      callback(error);
    };
    androidBilling.forceRestoreTransactions();
  } else if (isWebPurchaseSupported()) {
    isRegistered(function(registered) {
      var restoreCallback = function() {callback();};
      if (registered) {
        getKnownPurchases(restoreCallback);
      } else {
        clearScreen(function() {
          var target = document.getElementById('text');
          target.innerHTML="<p>Please sign in to Choiceofgames.com to restore purchases.</p>";
          loginForm(document.getElementById('text'), /*optional*/1, /*err*/null, restoreCallback);
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
    window.priceCallback = callback;
    callIos("price", product);
  } else if (window.isAndroidApp) {
    window.priceCallback = callback;
    androidBilling.getPrice(product);
  } else {
    safeTimeout(function () {
      callback.call(this, "guess");
    }, 0);
  }
}
// Callback expects no args, but should only be called on success
function purchase(product, callback) {
  var purchaseCallback = function() {
    window.purchaseCallback = null;
    safeCall(null, callback);
    if (window.purchaseSubscriptions && purchaseSubscriptions[product]) {
      purchaseSubscriptions[product].call();
    }
  };
  if (window.isIosApp) {
    window.purchaseCallback = purchaseCallback;
    callIos("purchase", product);
  } else if (window.isAndroidApp) {
    window.purchaseCallback = purchaseCallback;
    var androidStackTrace = androidBilling.purchase(product);
    if (androidStackTrace) throw new Error(androidStackTrace);
  } else if (window.isWinOldApp) {
    window.external.Purchase(product);
  } else if (window.isMacApp && window.macPurchase) {
    macPurchase.purchase_(product);
  } else if (window.isCef) {
    cefQuerySimple("Purchase " + product);
    // no callback; we'll refresh on purchase
  } else if (window.isWeb && product == window.appPurchase) {
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
      clickLink("iphoneLink");
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
    startLoading();
    isRegistered(function(registered) {
      doneLoading();
      var fullProductName = window.storeName + "." + product;
      function stripe(email) {
        startLoading();
        xhrAuthRequest("GET", "product-data", function(ok, data) {
          doneLoading();
          if (!ok) return asyncAlert("Sorry, we weren't able to initiate payment. (Your "+
            "network connection may be down.) Please refresh the page and try again, or contact "+
            "support@choiceofgames.com for assistance.");
          data = data[fullProductName];
          StripeCheckout.open({
            key:         window.stripeKey,
            address:     false,
            amount:      data.amount,
            name:        data.display_name,
            email:       email,
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
                    clearScreen(loadAndRestoreGame);
                  } else if ("purchase already in flight" == response.error) {
                    asyncAlert("Sorry, there was an error handling your purchase. Please wait five minutes and try again, or contact support@choiceofgames.com for assistance.");
                    clearScreen(loadAndRestoreGame);
                  } else {
                    asyncAlert("Sorry, there was an error processing your card. (Your "+
                      "network connection may be down.) Please refresh the page and try again, or contact "+
                      "support@choiceofgames.com for assistance.");
                    clearScreen(loadAndRestoreGame);
                  }
                }, "stripeToken", response.id, "product", fullProductName, "key", window.stripeKey);
              });
            }
          });
        }, "products", fullProductName);
      }
      if (registered) return fetchEmail(stripe);
      clearScreen(function() {
        var target = document.getElementById('text');
        target.innerHTML="<p>Please sign in to Choiceofgames.com to purchase.</p>";
        loginForm(document.getElementById('text'), /*optional*/1, /*err*/null, function(registered){
          if (registered) {
            checkPurchase(product, function(ok, response) {
              if (ok && response[product]) {
                purchaseCallback();
              } else {
                clearScreen(loadAndRestoreGame);
                return fetchEmail(stripe);
              }
            });
          } else {
            clearScreen(loadAndRestoreGame);
          }
        });
      });
    });
  } else {
    safeTimeout(purchaseCallback, 0);
  }
}

shortMonthStrings = [null, "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  text.appendChild(span);
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
  }
}

function achieve(name, title, description) {
  if (initStore()) window.store.set("achieved", toJson(nav.achieved));
  registerNativeAchievement(name);
  // iOS shows a prominent banner; no need to show our own
  if (window.isIosApp) return;
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
  return typeof window != "undefined" && (window.isIosApp || window.isAndroidApp);
}

function isFullScreenAdvertisingSupported() {
  return window.isIosApp || window.isAndroidApp;
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
    window.tickerRunning = false;
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

function printInput(target, inputType, callback, minimum, maximum, step) {
    if (!target) target = document.getElementById('text');
    var form = document.createElement("form");
    target.appendChild(form);
    var self = this;
    form.action="#";


    if (inputType == "textarea") {
      var input = document.createElement("textarea");
      input.setAttribute("rows", 4);
    } else {
      var input = document.createElement("input");
      input.setAttribute("type", inputType);
      if (inputType == "number") {
        input.setAttribute("min", minimum);
        input.setAttribute("max", maximum);
        step = step || "any";
        input.setAttribute("step", step);
      }
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

  printButton("No, Thanks", target, false, function() {
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
          "</div><br>";

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
                    recordLogin(ok, response.email);
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
                  recordLogin(ok, response.email);
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
              });
            } else if ("no" == choice) {
              safeCall(null, function() {callback(false);});
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
                form.style.display = "none";
                window.scrollTo(0,0);
                login(email, form.password.value, /*register*/true, subscribe, function(ok, response) {
                  doneLoading();
                  if (ok) {
                    target.innerHTML = "";
                    loginDiv(ok, email);
                    recordLogin(ok, email);
                    cacheKnownPurchases(response.purchases);
                    safeCall(null, function() {callback("ok");});
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
              window.scrollTo(0,0);
              login(email, form.password.value, /*register*/false, form.subscribe.checked, function(ok, response) {
                doneLoading();
                form.style.display = "";
                if (ok) {
                  target.innerHTML = "";
                  loginDiv(ok, email);
                  recordLogin(ok, email);
                  cacheKnownPurchases(response.purchases);
                  safeCall(null, function() {callback("ok");});
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
              window.scrollTo(0,0);
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
        window.registered = ok && value && "false" != value;
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
        statMsg = toJson(window.stats, '\n');
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
    window.main = document.getElementById("main");
    var head = document.getElementsByTagName("head")[0];
    window.nav.setStartingStatsClone(window.stats);
    if (window.achievements && window.achievements.length) {
      nav.loadAchievements(window.achievements);
      checkAchievements(function() {});
      setButtonTitles();
    }
    stats.sceneName = window.nav.getStartupScene();
    var map = parseQueryString(window.location.search);
    if (!map) {
      if (window.androidQueryString) {
        map = parseQueryString(window.androidQueryString);
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
    if (window.isWinStoreApp || window.isWinOldApp) {
        var subscribeAnchor = document.getElementById("subscribeLink");
        if (subscribeAnchor) {
            subscribeAnchor.onclick = function() {
              safeCall(null, subscribeLink);
              return false;
            };
        }
    }
    if (window.isCef) {
      var buttons = document.getElementById("buttons");
      buttons.appendChild(document.createTextNode(" "));
      var menuButton = document.createElement("button");
      menuButton.id = "menuButton";
      setClass(menuButton, "spacedLink");
      menuButton.onclick = showMenu;
      menuButton.innerHTML = "Menu";
      buttons.appendChild(menuButton);
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
      ' style="width:150px; height:20px;"></iframe>';
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
  document.write("<style>.webOnly { display: block !important; }</style>\n"+
    "<scr"+"ipt src='https://checkout.stripe.com/v2/checkout.js'></scr"+"ipt>");

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
  
}
if (!window.isWeb && window.isIosApp) {
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
  callIos("checkdiscounts");
} else if (window.isAndroidApp) {
  document.write("<style>"+
  "#header { display: none; }"+
  ""+
  "#emailUs { display: none; }"+
  ""+
  "#main { padding-top: 1em; }"+
  "</style>");
}
if (window.isWebOS) document.write("<style>body {font-family: Prelude; font-size: 14pt}\n#header {font-size: 13pt}</style>");
if (window.isMacApp || window.isWinOldApp || window.isCef || window.isAndroidApp) {
  document.write("<style>"+
    "#headerLinks { display: none; }"+
    ""+
    "#emailUs { display: none; }"+
    ""+
    "</style>");
}
if (window.isWeb && !window.Touch) {
  document.write("<style>label:hover {background-color: #E4DED8;}</style>");
}
if (window.isChromeApp) {
  var base = document.createElement('base');
  base.setAttribute("target", "_blank");
  document.head.appendChild(base);

  document.addEventListener( "DOMContentLoaded", function() {
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

  }, false );
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
  if (window.isIosApp) return "ios";
  if (window.isAndroidApp) return "android";
  if (window.isMacApp) return "mac";
  if (window.isWinStoreApp) return "windows";
  if (window.isWinOldApp) return "csharp";
  if (window.isChromeApp) return "chrome";
  if (window.isWebOS) return "palm";
  if (window.isCef) return "cef";
  if (window.isWeb) return "web";
  return "unknown";
}

