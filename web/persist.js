//
// Copyright (c) 2008, 2009 Paul Duncan (paul@pablotron.org)
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//


/* 
 * The contents of gears_init.js; we need this because Chrome supports
 * Gears out of the box, but still requires this constructor.  Note that
 * if you include gears_init.js then this function does nothing.
 */
(function() {
  // We are already defined. Hooray!
  if (window.google && google.gears)
    return;

  // factory 
  var F = null;

  // Firefox
  if (typeof GearsFactory != 'undefined') {
    F = new GearsFactory();
  } else {
    // IE
    try {
      F = new ActiveXObject('Gears.Factory');
      // privateSetGlobalObject is only required and supported on WinCE.
      if (F.getBuildInfo().indexOf('ie_mobile') != -1)
        F.privateSetGlobalObject(this);
    } catch (e) {
      // Safari
      if ((typeof navigator.mimeTypes != 'undefined')
           && navigator.mimeTypes["application/x-googlegears"]) {
        F = document.createElement("object");
        F.style.display = "none";
        F.width = 0;
        F.height = 0;
        F.type = "application/x-googlegears";
        document.documentElement.appendChild(F);
      }
    }
  }

  // *Do not* define any objects if Gears is not installed. This mimics the
  // behavior of Gears defining the objects in the future.
  if (!F)
    return;

  // Now set up the objects, being careful not to overwrite anything.
  //
  // Note: In Internet Explorer for Windows Mobile, you can't add properties to
  // the window object. However, global objects are automatically added as
  // properties of the window object in all browsers.
  if (!window.google)
    google = {};

  if (!google.gears)
    google.gears = {factory: F};
})();

/**
 * Persist - top-level namespace for Persist library.
 * @namespace
 */
Persist = (function() {
  var VERSION = '0.2.0', P, B, esc, init, empty, ec;

  // easycookie 0.2.1 (pre-minified)
  // (see http://pablotron.org/software/easy_cookie/)
  ec = (function(){var EPOCH='Thu, 01-Jan-1970 00:00:01 GMT',RATIO=1000*60*60*24,KEYS=['expires','path','domain'],esc=escape,un=unescape,doc=document,me;var get_now=function(){var r=new Date();r.setTime(r.getTime());return r;}
var cookify=function(c_key,c_val){var i,key,val,r=[],opt=(arguments.length>2)?arguments[2]:{};r.push(esc(c_key)+'='+esc(c_val));for(i=0;i<KEYS.length;i++){key=KEYS[i];if(val=opt[key])
r.push(key+'='+val);}
if(opt.secure)
r.push('secure');return r.join('; ');}
var alive=function(){var k='__EC_TEST__',v=new Date();v=v.toGMTString();this.set(k,v);this.enabled=(this.remove(k)==v);return this.enabled;}
me={set:function(key,val){var opt=(arguments.length>2)?arguments[2]:{},now=get_now(),expire_at,cfg={};if(opt.expires){cfg.expires=new Date(now.getTime()+opt.expires*RATIO);cfg.expires=cfg.expires.toGMTString();}
var keys=['path','domain','secure'];for(i=0;i<keys.length;i++)
if(opt[keys[i]])
cfg[keys[i]]=opt[keys[i]];var r=cookify(key,val,cfg);doc.cookie=r;return val;},has:function(key){key=esc(key);var c=doc.cookie,ofs=c.indexOf(key+'='),len=ofs+key.length+1,sub=c.substring(0,key.length);return((!ofs&&key!=sub)||ofs<0)?false:true;},get:function(key){key=esc(key);var c=doc.cookie,ofs=c.indexOf(key+'='),len=ofs+key.length+1,sub=c.substring(0,key.length),end;if((!ofs&&key!=sub)||ofs<0)
return null;end=c.indexOf(';',len);if(end<0)
end=c.length;return un(c.substring(len,end));},remove:function(k){var r=me.get(k),opt={expires:EPOCH};doc.cookie=cookify(k,'',opt);return r;},keys:function(){var c=doc.cookie,ps=c.split('; '),i,p,r=[];for(i=0;i<ps.length;i++){p=ps[i].split('=');r.push(un(p[0]));}
return r;},all:function(){var c=doc.cookie,ps=c.split('; '),i,p,r=[];for(i=0;i<ps.length;i++){p=ps[i].split('=');r.push([un(p[0]),un(p[1])]);}
return r;},version:'0.2.1',enabled:false};me.enabled=alive.call(me);return me;}());

  // wrapper for Array.prototype.indexOf, since IE doesn't have it
  var index_of = (function() {
    if (Array.prototype.indexOf)
      return function(ary, val) { 
        return Array.prototype.indexOf.call(ary, val);
      };
    else
      return function(ary, val) {
        var i, l;

        for (i = 0, l = ary.length; i < l; i++)
          if (ary[i] == val)
            return i;

        return -1;
      };
  })();


  // empty function
  empty = function() { };

  /**
   * Escape spaces and underscores in name.  Used to generate a "safe"
   * key from a name.
   *
   * @private
   */
  esc = function(str) {
    return 'PS' + str.replace(/_/g, '__').replace(/ /g, '_s');
  };

  C = {
    /* 
     * Backend search order.
     * 
     * Note that the search order is significant; the backends are
     * listed in order of capacity, and many browsers
     * support multiple backends, so changing the search order could
     * result in a browser choosing a less capable backend.
     */ 
    search_order: [
      // TODO: air
      'cefStorage',
      'winOldStorage',
      'winStoreStorage',
      'macStorage',
      'iosStorage',
      'localChromeStorage',
      'androidStorage',
      'whatwg_db', 
      'localstorage',
      'globalstorage', 
      'cookie',
      'gears',
      'ie', 
      'flash'
    ],

    // valid name regular expression
    name_re: /^[a-z][a-z0-9_ -]+$/i,

    // list of backend methods
    methods: [
      'init', 
      'get', 
      'set', 
      'remove', 
      'load', 
      'save'
      // TODO: clear method?
    ],

    // sql for db backends (gears and db)
    sql: {
      version:  '1', // db schema version

      // XXX: the "IF NOT EXISTS" is a sqlite-ism; fortunately all the 
      // known DB implementations (safari and gears) use sqlite
      create:   "CREATE TABLE IF NOT EXISTS persist_data (k TEXT UNIQUE NOT NULL PRIMARY KEY, v TEXT NOT NULL)",
      get:      "SELECT v FROM persist_data WHERE k = ?",
      set:      "INSERT INTO persist_data(k, v) VALUES (?, ?)",
      remove:   "DELETE FROM persist_data WHERE k = ?" 
    },

    // default flash configuration
    flash: {
      // ID of wrapper element
      div_id:   '_persist_flash_wrap',

      // id of flash object/embed
      id:       '_persist_flash',

      // default path to flash object
      path: 'persist.swf',
      size: { w:1, h:1 },

      // arguments passed to flash object
      args: {
        autostart: true
      }
    } 
  };

  // built-in backends
  B = {
    // gears db backend
    // (src: http://code.google.com/apis/gears/api_database.html)
    gears: {
      // no known limit
      size:   -1,

      test: function() {
        // test for gears
        return (window.google && window.google.gears) ? true : false;
      },

      methods: {
        transaction: function(fn) {
          var db = this.db;

          // begin transaction
          db.execute('BEGIN').close();

          // call callback fn
          fn.call(this, db);

          // commit changes
          db.execute('COMMIT').close();
        },

        init: function() {
          var db;

          // create database handle (TODO: add schema version?)
          db = this.db = google.gears.factory.create('beta.database');

          // open database
          // from gears ref:
          //
          // Currently the name, if supplied and of length greater than
          // zero, must consist only of visible ASCII characters
          // excluding the following characters:
          //
          //   / \ : * ? " < > | ; ,
          //
          // (this constraint is enforced in the Store constructor)
          db.open(esc(this.name));

          // create table
          db.execute(C.sql.create).close();
        },

        get: function(key, fn, scope) {
          var r, sql = C.sql.get;

          // if callback isn't defined, then return
          if (!fn)
            return;

          // begin transaction
          this.transaction(function (t) {
            var is_valid, val;
            // exec query
            r = t.execute(sql, [key]);

            // check result and get value
            is_valid = r.isValidRow();
            val = is_valid ? r.field(0) : null;

            // close result set
            r.close();

            // call callback
            fn.call(scope || this, is_valid, val);
          });
        },

        set: function(key, val, fn, scope) {
          var rm_sql = C.sql.remove,
              sql    = C.sql.set, r;

          // begin set transaction
          this.transaction(function(t) {
            // exec remove query
            t.execute(rm_sql, [key]).close();

            // exec set query
            t.execute(sql, [key, val]).close();
            
            // run callback (TODO: get old value)
            if (fn)
              fn.call(scope || this, true, val);
          });
        },

        remove: function(key, fn, scope) {
          var get_sql = C.sql.get;
              sql = C.sql.remove,
              r, val = null, is_valid = false;

          // begin remove transaction
          this.transaction(function(t) {
            // if a callback was defined, then get the old
            // value before removing it
            if (fn) {
              // exec get query
              r = t.execute(get_sql, [key]);

              // check validity and get value
              is_valid = r.isValidRow();
              val = is_valid ? r.field(0) : null;

              // close result set
              r.close();
            }

            // exec remove query if no callback was defined, or if a
            // callback was defined and there was an existing value
            if (!fn || is_valid) {
              // exec remove query
              t.execute(sql, [key]).close();
            }

            // exec callback
            if (fn)
              fn.call(scope || this, is_valid, val);
          });
        } 
      }
    }, 

    cefStorage: {
      size:   -1,

      test: function() {
        return !!window.cefQuery;
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {

        },

        query: function(method, paramString, callback) {
          cefQuery({request:method+" "+paramString,
            onSuccess: function(response) {
              callback(true, response);
            },
            onFailure: function(error_code, error_message) {
              console.error(method + " error: " + error_message);
              callback(false);
            }
          });
        },

        get: function(key, fn, scope) {
          key = this.key(key);

          // if callback isn't defined, then return
          if (!fn)
            return;

          // get callback scope
          scope = scope || this;

          this.query("StorageGet", key, function(ok, results) {
            fn.call(scope, ok, results);
          });
        },

        set: function(key, val, fn, scope) {
          key = this.key(key);
          scope = scope || this;
          this.query("StorageSet", key + " " + val, function(ok){
            if (fn) fn.call(scope, ok, val);
          });
          return val;
        },

        // begin remove transaction
        remove: function(key, fn, scope) {
          key = this.key(key);
          scope = scope || this;
          this.query("StorageRemove", key, function(ok) {
            // return original value? meh
            if (fn) fn.call(scope, ok);
          });
        }
      }
    },

    // whatwg db backend (webkit, Safari 3.1+)
    // (src: whatwg and http://webkit.org/misc/DatabaseExample.html)
    whatwg_db: {
      // size based on DatabaseExample from above (should I increase
      // this?)
      size:   200 * 1024,

      test: function() {
        var name = 'PersistJS Test', 
            desc = 'Persistent database test.';

        // test for openDatabase
        if (!window.openDatabase)
          return false;

        // make sure openDatabase works
        // XXX: will this leak a db handle and/or waste space?
        if (!window.openDatabase(name, C.sql.version, desc, B.whatwg_db.size))
          return false;

        // return true
        return true;
      },

      methods: {
        transaction: function(fn) {
          // lazy create database table;
          // this is done here because there is no way to
          // prevent a race condition if the table is created in init()
          if (!this.db_created) {
            this.db.transaction(function(t) {
              // create table
              t.executeSql(C.sql.create, [], function() {
                this.db_created = true;
              });
            }, empty); // trap exception
          } 

          // execute transaction
          this.db.transaction(fn);
        },

        init: function() {
          // create database handle
          this.db = openDatabase(
            this.name, 
            C.sql.version, 
            this.o.about || ("Persistent storage for " + this.name),
            this.o.size || B.whatwg_db.size 
          );
        },

        get: function(key, fn, scope) {
          var sql = C.sql.get;

          // if callback isn't defined, then return
          if (!fn)
            return;

          // get callback scope
          scope = scope || this;

          // begin transaction
          this.transaction(function (t) {
            t.executeSql(sql, [key], function(t, r) {
              if (r.rows.length > 0)
                fn.call(scope, true, r.rows.item(0)['v']);
              else
                fn.call(scope, false, null);
            });
          });
        },

        set: function(key, val, fn, scope) {
          var rm_sql = C.sql.remove,
              sql    = C.sql.set;

          // begin set transaction
          this.transaction(function(t) {
            // exec remove query
            t.executeSql(rm_sql, [key], function() {
              // exec set query
              t.executeSql(sql, [key, val], function(t, r) {
                // run callback
                if (fn)
                  fn.call(scope || this, true, val);
              });
            });
          });

          return val;
        },

        // begin remove transaction
        remove: function(key, fn, scope) {
          var get_sql = C.sql.get;
              sql = C.sql.remove;

          this.transaction(function(t) {
            // if a callback was defined, then get the old
            // value before removing it
            if (fn) {
              // exec get query
              t.executeSql(get_sql, [key], function(t, r) {
                if (r.rows.length > 0) {
                  // key exists, get value 
                  var val = r.rows.item(0)['v'];

                  // exec remove query
                  t.executeSql(sql, [key], function(t, r) {
                    // exec callback
                    fn.call(scope || this, true, val);
                  });
                } else {
                  // key does not exist, exec callback
                  fn.call(scope || this, false, null);
                }
              });
            } else {
              // no callback was defined, so just remove the
              // data without checking the old value

              // exec remove query
              t.executeSql(sql, [key]);
            }
          });
        } 
      }
    }, 
    
    // globalstorage backend (globalStorage, FF2+, IE8+)
    // (src: http://developer.mozilla.org/en/docs/DOM:Storage#globalStorage)
    // https://developer.mozilla.org/En/DOM/Storage
    //
    // TODO: test to see if IE8 uses object literal semantics or
    // getItem/setItem/removeItem semantics
    globalstorage: {
      // (5 meg limit, src: http://ejohn.org/blog/dom-storage-answers/)
      size: 5 * 1024 * 1024,

      test: function() {
        try {
          if (window.globalStorage && window.globalStorage[this.o.domain]) return true;
        } catch (e) {}
        return false;
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = globalStorage[this.o.domain];
        },

        get: function(key, fn, scope) {
          // expand key
          key = this.key(key);

          if (fn)
            fn.call(scope || this, true, this.store.getItem(key));
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = this.key(key);

          // set value
          this.store.setItem(key, val);

          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key
          key = this.key(key);

          // get value
          val = this.store[key];

          // delete value
          this.store.removeItem(key);

          if (fn)
            fn.call(scope || this, (val !== null), val);
        } 
      }
    }, 
    
    // localstorage backend (globalStorage, FF2+, IE8+)
    // (src: http://www.whatwg.org/specs/web-apps/current-work/#the-localstorage)
    // also http://msdn.microsoft.com/en-us/library/cc197062(VS.85).aspx#_global
    localstorage: {
      // (unknown?)
      // ie has the remainingSpace property, see:
      // http://msdn.microsoft.com/en-us/library/cc197016(VS.85).aspx
      size: -1,

      test: function() {
        try {
          return window.localStorage ? true : false;
        } catch (e) {
          return false;
        }
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = localStorage;
        },

        get: function(key, fn, scope) {
          // expand key
          key = this.key(key);

          if (fn)
            fn.call(scope || this, true, this.store.getItem(key));
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = this.key(key);

          // set value
          this.store.setItem(key, val);

          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key
          key = this.key(key);

          // get value
          val = this.store.getItem(key);

          // delete value
          this.store.removeItem(key);

          if (fn)
            fn.call(scope || this, (val !== null), val);
        } 
      }
    }, 

    // chrome packaged app storage
    // http://developer.chrome.com/stable/apps/storage.html
    localChromeStorage: {
      // (unknown?)
      // ie has the remainingSpace property, see:
      // http://msdn.microsoft.com/en-us/library/cc197016(VS.85).aspx
      size: -1,

      test: function() {
        try {
          return window.chrome && window.chrome.storage && window.chrome.storage.local;
        } catch (e) {
          return false;
        }
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = chrome.storage.local;
        },

        get: function(key, fn, scope) {
          // expand key
          key = this.key(key);

          scope = scope || this;
          this.store.get(key, function(val){
            if (fn) fn.call(scope, true, val[key]);
          });
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = this.key(key);

          var out = {};
          out[key] = val;
          if (fn) {
            scope = scope || this;  
            this.store.set(out, function(){
              fn.call(scope, true, val);
            });
          } else {
            this.store.set(out);
          }
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key
          key = this.key(key);

          if (fn) {
            // get value first
            scope = scope || this;
            this.store.get(key, function(val){
              this.store.remove(key, function(){
                fn.call(scope, (val[key] !== null), val[key]);
              });
            });
          } else {
            this.store.remove(key);
          }
        } 
      }
    }, 
    
    // DGF Fake local storage
    androidStorage: {
      // (unknown?)
      // ie has the remainingSpace property, see:
      // http://msdn.microsoft.com/en-us/library/cc197016(VS.85).aspx
      size: -1,

      test: function() {
        try {
          return window.androidStorage ? true : false;
        } catch (e) {
          return false;
        }
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = androidStorage;
        },

        get: function(key, fn, scope) {
          // expand key
          key = this.key(key);

          if (fn)
            fn.call(scope || this, true, this.store.getItem(key));
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = this.key(key);

          // set value
          this.store.setItem(key, val);

          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key
          key = this.key(key);

          // get value
          val = this.store.getItem(key);

          // delete value
          this.store.removeItem(key);

          if (fn)
            fn.call(scope || this, (val !== null), val);
        } 
      }
    }, 

    // DGF iOS managed storage
    iosStorage: {
      size: -1,

      test: function() {
        try {
          return window.isIosApp ? true : false;
        } catch (e) {
          return false;
        }
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {

        },

        callIos: function(scheme, path) {
          path = encodeURIComponent(path).replace(/[!~*')(]/g, function(match) {
            return "%" + match.charCodeAt(0).toString(16);
          });

          var url = scheme + "://" + path;
          var iframe = document.createElement("IFRAME");
          iframe.setAttribute("src", url);
          iframe.setAttribute("style", "display:none");
          document.documentElement.appendChild(iframe);
          iframe.parentNode.removeChild(iframe);
          iframe = null;
        },

        get: function(key, fn, scope) {
          if (!fn) return;
          // expand key
          key = this.key(key);

          var nonce = "storageget" + key + (+new Date);
          window[nonce] = function(value) {
            delete window[nonce];
            fn.call(scope || this, true, value);
          }
          this.callIos("storageget", key + " " + nonce);
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = this.key(key);

          // set value
          var nonce = "storageset" + key + (+new Date);
          window[nonce] = function() {
            delete window[nonce];
            if (fn) fn.call(scope || this, true, val);
          }
          this.callIos("storageset", key + " " + nonce + " " + encodeURIComponent(val));
        },

        remove: function(key, fn, scope) {
          if (fn) {
            this.get(key, function(val) {
              this._remove(key, fn, scope, val);
            }, this);
          } else {
            this._remove(key, fn, scope);
          }
        },

        _remove: function(key, fn, scope, val) {
          var val;

          // expand key
          key = this.key(key);

          // delete value
          var nonce = "storagerem" + key + (+new Date);
          window[nonce] = function() {
            delete window[nonce];
            if (fn) fn.call(scope || this, (val !== null), val);
          }
          this.callIos("storagerem", key + " " + nonce);
        } 
      }
    }, 

    // DGF OSX managed storage
    macStorage: {
      size: -1,

      test: function() {
        try {
          return window.macStorage ? true : false;
        } catch (e) {
          return false;
        }
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = macStorage;
        },

        get: function(key, fn, scope) {
          // expand key
          key = this.key(key);

          if (fn)
            fn.call(scope || this, true, this.store.objectForKey_(key));
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = this.key(key);

          // set value
          this.store.setObject_forKey_(val, key);

          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key
          key = this.key(key);

          // get value
          val = this.store.objectForKey_(key)

          // delete value
          this.store.removeObjectForKey_(key);

          if (fn)
            fn.call(scope || this, (val !== null), val);
        } 
      }
    }, 

    // DGF Old win app managed storage
    winOldStorage: {
      size: -1,

      test: function() {
        try {
          return window.external.IsWinOldApp();
        } catch (e) {
          return false;
        }
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = window.external;
        },

        get: function(key, fn, scope) {
          // expand key
          key = this.key(key);

          if (fn)
            fn.call(scope || this, true, this.store.GetValue(key));
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = this.key(key);

          // set value
          this.store.SetValue(key, val);

          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key
          key = this.key(key);

          // get value
          val = this.store.GetValue(key)

          // delete value
          this.store.DeleteValue(key);

          if (fn)
            fn.call(scope || this, (val !== null), val);
        } 
      }
    }, 

      // DGF WinStore managed storage
    winStoreStorage: {
        size: -1,

        test: function () {
            try {
                return Windows.Storage.ApplicationData.current.roamingFolder;
            } catch (e) {
                return false;
            }
        },

        methods: {
            key: function (key) {
                return esc(this.name) + esc(key);
            },

            init: function () {
                var self = this;
                function doneLoadingWinStore() {
                  self.loaded = true;
                  for (var i = self.loadListeners.length - 1; i >= 0; i--) {
                    setTimeout(self.loadListeners[i], 0);
                  }
                }
                this.loaded = false;
                this.loadListeners = [];

                Windows.Storage.ApplicationData.current.roamingFolder
                  .createFileAsync("data.txt", Windows.Storage.CreationCollisionOption.openIfExists)
                  .then(function (file) {
                    self.file = file;
                    return Windows.Storage.FileIO.readTextAsync(file);
                  }).done(function (data) {
                    self.store = {};
                    if (data && typeof data == "string") {
                      var rows = data.split("\n");
                      for (var i = rows.length - 1; i >= 0; i--) {
                        var row = rows[i].split("\t");
                        self.store[row[0]] = decodeURIComponent(row[1]);
                      }
                    }
                    doneLoadingWinStore();
                  },
                  function(){
                    self.store = {};
                    doneLoadingWinStore();
                  });
            },

            get: function (key, fn, scope) {
                if (!this.loaded) {
                  var self = this;
                  this.loadListeners.push(function() {self.get(key, fn, scope)});
                  return;
                }
                // expand key
                key = this.key(key);

                if (fn)
                    fn.call(scope || this, true, this.store[key]);
            },

            set: function (key, val, fn, scope) {
                if (!this.loaded) {
                  var self = this;
                  this.loadListeners.push(function() {self.set(key, val, fn, scope)});
                  return;
                }
                // expand key
                key = this.key(key);

                // set value
                this.store[key] = val;
                this.writeAsync();

                if (fn)
                    fn.call(scope || this, true, val);
            },

            remove: function (key, fn, scope) {
                if (!this.loaded) {
                  var self = this;
                  this.loadListeners.push(function() {self.remove(key, fn, scope)});
                  return;
                }
                var val;

                // expand key
                key = this.key(key);

                // get value
                val = this.store[key];

                // delete value
                delete this.store[key];
                this.writeAsync();

                if (fn)
                    fn.call(scope || this, (val !== null), val);
            },

            writeAsync: function() {
              var output = [];
              for (var key in this.store) {
                output.push(key, '\t', encodeURIComponent(this.store[key]), '\n');
              }
              Windows.Storage.FileIO.writeTextAsync(this.file, output.join(''));
            }
        }
    },

    // IE backend
    ie: {
      prefix:   '_persist_data-',
      // style:    'display:none; behavior:url(#default#userdata);',

      // 64k limit
      size:     64 * 1024,

      test: function() {
        // make sure we're dealing with IE
        // (src: http://javariet.dk/shared/browser_dom.htm)
        return window.ActiveXObject ? true : false;
      },

      make_userdata: function(id) {
        var el = document.createElement('div');

        // set element properties
        // http://msdn.microsoft.com/en-us/library/ms531424(VS.85).aspx 
        // http://www.webreference.com/js/column24/userdata.html
        el.id = id;
        el.style.display = 'none';
        el.addBehavior('#default#userdata');

        // append element to body
        document.body.appendChild(el);

        // return element
        return el;
      },

      methods: {
        init: function() {
          var id = B.ie.prefix + esc(this.name);

          // save element
          this.el = B.ie.make_userdata(id);

          // load data
          if (this.o.defer)
            this.load();
        },

        get: function(key, fn, scope) {
          var val;

          // expand key
          key = esc(key);

          // load data
          if (!this.o.defer)
            this.load();

          // get value
          val = this.el.getAttribute(key);

          // call fn
          if (fn)
            fn.call(scope || this, val ? true : false, val);
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = esc(key);
          
          // set attribute
          this.el.setAttribute(key, val);

          // save data
          if (!this.o.defer)
            this.save();

          // call fn
          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key
          key = esc(key);

          // load data
          if (!this.o.defer)
            this.load();

          // get old value and remove attribute
          val = this.el.getAttribute(key);
          this.el.removeAttribute(key);

          // save data
          if (!this.o.defer)
            this.save();

          // call fn
          if (fn)
            fn.call(scope || this, val ? true : false, val);
        },

        load: function() {
          this.el.load(esc(this.name));
        },

        save: function() {
          this.el.save(esc(this.name));
        }
      }
    },

    // cookie backend
    // uses easycookie: http://pablotron.org/software/easy_cookie/
    cookie: {
      delim: ':',

      // 4k limit (low-ball this limit to handle browser weirdness, and 
      // so we don't hose session cookies)
      size: 4000,

      test: function() {
        // XXX: use easycookie to test if cookies are enabled
        return P.Cookie.enabled ? true : false;
      },

      methods: {
        key: function(key) {
          return this.name + B.cookie.delim + key;
        },

        get: function(key, fn, scope) {
          var val;

          // expand key 
          key = this.key(key);

          // get value
          val = ec.get(key);

          // call fn
          if (fn)
            fn.call(scope || this, val != null, val);
        },

        set: function(key, val, fn, scope) {
          // expand key 
          key = this.key(key);

          // save value
          ec.set(key, val, this.o);

          // call fn
          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, val, fn, scope) {
          var val;

          // expand key 
          key = this.key(key);

          // remove cookie
          val = ec.remove(key)

          // call fn
          if (fn)
            fn.call(scope || this, val != null, val);
        } 
      }
    },

    // flash backend (requires flash 8 or newer)
    // http://kb.adobe.com/selfservice/viewContent.do?externalId=tn_16194&sliceId=1
    // http://livedocs.adobe.com/flash/8/main/wwhelp/wwhimpl/common/html/wwhelp.htm?context=LiveDocs_Parts&file=00002200.html
    flash: {
      test: function() {
        // TODO: better flash detection
        if (!window.deconcept || !window.deconcept.SWFObjectUtil)
          return false;

        // get the major version
        var major = deconcept.SWFObjectUtil.getPlayerVersion().major;

        // check flash version (require 8.0 or newer)
        return (major >= 8) ? true : false;
      },

      methods: {
        init: function() {
          if (!B.flash.el) {
            var o, key, el, cfg = C.flash;

            // create wrapper element
            el = document.createElement('div');
            el.id = cfg.div_id;

            // FIXME: hide flash element
            // el.style.display = 'none';

            // append element to body
            document.body.appendChild(el);

            // create new swf object
            o = new deconcept.SWFObject(this.o.swf_path || cfg.path, cfg.id, cfg.size.w, cfg.size.h, '8');

            // set parameters
            for (key in cfg.args)
              o.addVariable(key, cfg.args[key]);

            // write flash object
            o.write(el);

            // save flash element
            B.flash.el = document.getElementById(cfg.id);
          }

          // use singleton flash element
          this.el = B.flash.el;
        },

        get: function(key, fn, scope) {
          var val;

          // escape key
          key = esc(key);

          // get value
          val = this.el.get(this.name, key);

          // call handler
          if (fn)
            fn.call(scope || this, val !== null, val);
        },

        set: function(key, val, fn, scope) {
          var old_val;

          // escape key
          key = esc(key);

          // set value
          old_val = this.el.set(this.name, key, val);

          // call handler
          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // get key
          key = esc(key);

          // remove old value
          val = this.el.remove(this.name, key);

          // call handler
          if (fn)
            fn.call(scope || this, true, val);
        }
      }
    }
  };

  /**
   * Test for available backends and pick the best one.
   * @private
   */
  var init = function() {
    var i, l, b, key, fns = C.methods, keys = C.search_order;

    // set all functions to the empty function
    for (i = 0, l = fns.length; i < l; i++) 
      P.Store.prototype[fns[i]] = empty;

    // clear type and size
    P.type = null;
    P.size = -1;

    // loop over all backends and test for each one
    for (i = 0, l = keys.length; !P.type && i < l; i++) {
      b = B[keys[i]];

      // test for backend
      try {
        if (b.test()) {
          // found backend, save type and size
          P.type = keys[i];
          P.size = b.size;

          // extend store prototype with backend methods
          for (key in b.methods)
            P.Store.prototype[key] = b.methods[key];
        }
      } catch (e) {}
    }

    // mark library as initialized
    P._init = true;
  };

  // create top-level namespace
  P = {
    // version of persist library
    VERSION: VERSION,

    // backend type and size limit
    type: null,
    size: 0,

    // XXX: expose init function?
    // init: init,

    add: function(o) {
      // add to backend hash
      B[o.id] = o;

      // add backend to front of search order
      C.search_order = [o.id].concat(C.search_order);

      // re-initialize library
      init();
    },

    remove: function(id) {
      var ofs = index_of(C.search_order, id);
      if (ofs < 0)
        return;

      // remove from search order
      C.search_order.splice(ofs, 1);

      // delete from lut
      delete B[id];

      // re-initialize library
      init();
    },

    // expose easycookie API
    Cookie: ec,

    // store API
    Store: function(name, o) {
      // verify name
      if (!C.name_re.exec(name))
        throw new Error("Invalid name");

      // XXX: should we lazy-load type?
      // if (!P._init)
      //   init();

      if (!P.type)
        throw new Error("No suitable storage found");

      o = o || {};
      this.name = name;

      // get domain (XXX: does this localdomain fix work?)
      o.domain = o.domain || location.host || 'localhost';
      
      // strip port from domain (XXX: will this break ipv6?)
      o.domain = o.domain.replace(/:\d+$/, '')

      // append localdomain to domains w/o '."
      // (see https://bugzilla.mozilla.org/show_bug.cgi?id=357323)
      // (file://localhost/ works, see: 
      // https://bugzilla.mozilla.org/show_bug.cgi?id=469192)
/* 
 *       if (!o.domain.match(/\./))
 *         o.domain += '.localdomain';
 */ 

      this.o = o;

      // expires in 2 years
      o.expires = o.expires || 365 * 2;

      // set path to root
      o.path = o.path || '/';

      // call init function
      this.init();
    } 
  };

  // init persist
  init();

  // return top-level namespace
  return P;
})();
