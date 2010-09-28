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
    var debug = false || window.debug;
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
            if (window.console) window.console.error(e);
            // Rethrow here so the debugger can handle it
            // On Firefox this causes a second prompt.  Meh!
            if (debug) throw e;
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
      if (/^[a-zA-Z][a-zA-Z_0-9]\w+$/.test(prop) && !/\b(abstract|boolean|break|byte|case|catch|char|class|comment|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|label|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throws|transient|true|try|typeof|var|void|volatile|while|with)\b/.test(prop)) {
        list.push(prop + ':' + toJson(obj[prop]));
      } else {
        list.push('"' + prop + '":' + toJson(obj[prop]));
      }
     }
     return '{' + list.join(',') + '}';
    }
   } else {
    return 'null';
   }
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
   return new String(obj);
  case 'function':
   return 'badfunction';
  case 'undefined':
    return 'undefined';
  default:
   throw new Error("invalid type: " + typeof obj);
 }
}

function saveCookie(callback, slot, stats, temps, lineNum, indent) {
    var value = computeCookie(stats, temps, lineNum, indent);
    return writeCookie(value, slot, callback);
}

function computeCookie(stats, temps, lineNum, indent) {
  var scene = stats.scene;
  delete stats.scene;
  stats.sceneName = scene.name;
  var version = "UNKNOWN";
  if (typeof(window) != "undefined" && window && window.version) version = window.version;
  var value = toJson({version:version, stats:stats, temps:temps, lineNum: lineNum, indent: indent});
  stats.scene = scene;
  return value;
}

function writeCookie(value, slot, callback) {
  if (!slot) {
    window.cachedValue = value;
    slot = "";
  }
  if (!initStore()) return callback();
  window.store.set("state"+slot, value, callback);
}

function clearCookie(callback, slot) {
    writeCookie('', slot, callback);
}

function initStore() {
  if (!window.storeName) return false;
  if (window.store) return window.store;
  try {
    window.store = new Persist.Store(window.storeName);
  } catch (e) {}
  return window.store;
}
function loadAndRestoreGame() {
  if (window.cachedValue) return valueLoaded(true, window.cachedValue);
  if (!initStore()) return restoreGame();
  window.store.get("state", valueLoaded);
}
function valueLoaded(ok, value) {
  safeCall(null, function() {
    var state = null;
    if (ok && value && ""+value) {
      state = eval("state="+value);
    }
    restoreGame(state);
  });
};

function isStateValid(state) {
  if (!state) return false;
  if (!state.stats) return false;
  if (!state.stats.sceneName) return false;
  return true;
}

function restoreGame(state) {
    if (!isStateValid(state)) {
        var scene = new Scene(window.nav.getStartupScene(), window.stats, window.nav, false);
        safeCall(scene, scene.execute);
    } else {
      window.stats = state.stats;
      // Someday, inflate the navigator using the state object
      var scene = new Scene(state.stats.sceneName, state.stats, window.nav, state.debug);
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

function num(x, line) {
    if (!line) line = "UNKNOWN";
    var x_num = x * 1; 
    if (isNaN(x_num)) throw new Error("line "+line+": Not a number: " + x);
    return x_num;
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
    };
