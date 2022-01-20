knownScenes = [];
var scene_object = "";
var success = true;
var skip = false;
var loadFailed = false;

var rootDir;

if (typeof process != "undefined") {
  var outputFile = process.argv[2];
  if (!outputFile) throw new Error("Specify an output file on the command line");
  rootDir = process.argv[3];
  if (rootDir) {
    rootDir += "/";
  } else {
    rootDir = "web/";
  }
  fs = require('fs');
  path = require('path');
  vm = require('vm');
  load = function(file) {
    vm.runInThisContext(fs.readFileSync(file), file);
  };
  load(rootDir+ "scene.js");
  load(rootDir+"navigator.js");
  load(rootDir+"util.js");
  load("headless.js");
  load(rootDir+"mygame/mygame.js");
  fs.writeFileSync(outputFile, compile(), "utf8");
}

if (!rootDir) rootDir = "web/";

function compile(){
  if (typeof window !== 'undefined' && "file:" === window.location.protocol && !window.slurpedFiles) {
    window.loading.innerHTML = "<p>Please \"upload\" the choicescript folder (including compile.html).</p>";
    var input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    loading.appendChild(input);
    input.addEventListener('change', function() {
      var candidates = [];
      var numFiles = input.files.length;
      for (var i = 0; i < numFiles; i++) {
        var file = input.files[i];
        if (input.files[i].name == "scene.js") {
          candidates.push(file);
        }
      }
      if (!candidates.length) {
        alert("We couldn't find scene.js in the folder you chose. Please try again. (Note that compile.html requires access to the entire choicescript directory, not just the mygame folder");
      } else if (candidates.length > 1) {
        if (candidates.length > 1) {
          alert("There were multiple files called scene.js in the folder you chose. Please try again.\n" +
            candidates.map(function(file) {return "\u2022 " + file.webkitRelativePath}).join("\n"));
        }
      }
      rootDir = candidates[0].webkitRelativePath.replace(/\/scene.js$/, "/");
      var rootDirTest = new RegExp("^" + rootDir + ".*\.(js|css|html|txt)");
      loading.innerHTML = "";
      var webFiles = [].filter.call(input.files, function(file) {
        return rootDirTest.test(file.webkitRelativePath);
      });
      Promise.all(webFiles.map(function(file) {return new Response(file).text()})).then(function(results) {
        window.slurpedFiles = {};
        for (var i = 0; i < webFiles.length; i++) {
          slurpedFiles[webFiles[i].webkitRelativePath] = results[i];
        }
        slurpFile = function(url, throwOnError) {
          var parts = url.split('/');
          var newParts = [];
          for (var i = 0; i < parts.length; i++) {
            if (".." === parts[i]) {
              newParts.pop();
            } else {
              newParts.push(parts[i]);
            }
          }
          url = newParts.join('/');
          if (throwOnError && ! slurpedFiles[url]) {
            throw new Error("Error: Could not open " + url);
          }
          return slurpedFiles[url];
        }
        var compiledResult = compile();
        if (compiledResult) finish(compiledResult);
      })
    });
    return;
  }

  function safeSlurpFile(file) {
    try {
      return slurpFile(file, false);
    } catch (e) {
      return null;
    }
  }

  //1. Grab the game's html file
  var url = rootDir+"mygame/index.html";
  var game_html = slurpFile(url, true);
    
  //2. Find and extract all .js file data
  var next_file = "";
  var patt = /<script.*?src=["'](.*?)["'][^>]*><\/script>/gim;
  var doesMatch;
  var jsStore = "";
  console.log("\nExtracting js data from:");
  while (doesMatch = patt.exec(game_html)) {
    console.log(doesMatch[1]);
    next_file = safeSlurpFile(rootDir+'mygame/' + doesMatch[1]);
    if (next_file != "undefined" && next_file !== null) {
      jsStore = jsStore + "\n;\n" + next_file;
    }
  }
  
  console.log("");
  
  //3. Find and extract all .css file data
  patt = /^<link[\s][\w'"\=\s\.\/]*[\s]?href\=["']([\w\.\/]*.css)["']/gim;
  var cssStore = "";
  console.log("\nExtracting css data from:");
  while (doesMatch = patt.exec(game_html)) {
    // console.log(doesMatch[0]);
    console.log(doesMatch[1]);
    next_file = slurpFile(rootDir+'mygame/' + doesMatch[1], true);
    if (next_file != "undefined" && next_file !== null) {
      cssStore = cssStore + next_file;
    }
  }

  //4. Remove css links
  patt = /^<link[\s][\w'"\=\s\.\/]*>/gim;
  game_html=game_html.replace(patt,"");

  //5. Remove js links
  patt = /^<script src\=[^>]*><\/script>/gim;
  game_html=game_html.replace(patt,"");

  //6. Slice the document and check for a *title
  var top = game_html.slice(0, (game_html.indexOf("</head>") - 1));
  var bottom = game_html.slice((game_html.indexOf("</head>")),game_html.length);

  //7.1 Find scene files (as we can't read the dir)
  console.log("");
  console.log("Searching for scene files...");
  for (var i = 0; i < nav._sceneList.length; i++) {
    addFile(nav._sceneList[i] + ".txt");
  }
  verifyFileName("choicescript_stats.txt");
  verifyFileName("choicescript_upgrade.txt");
  
  //Check startup.txt for a *scene_list
  var sceneList = false;
  scene = new Scene("startup");
  var scene_data = slurpFile(rootDir+'mygame/scenes/startup.txt', true);
  scene.loadLines(scene_data);
  patt = /^\*scene_list\b/i;
  for (i = 0; i < scene["lines"].length; i++) {
    if (patt.exec(scene["lines"][i])) {
      sceneList = true;
      scene.lineNum = i;
      break;
    }
  }
  //if we have a scene_list, add its contents to knownScenes
  if (sceneList) {
    var scenes = scene.parseSceneList();
    for (i = 0; i < scenes.length; i++) {
      verifyFileName(scenes[i]+".txt");
    }
  }
  
  for (i in knownScenes) {
    console.log(knownScenes[i]);
  }
    
    //whilst we're looking at startup.txt, check for a *title
    var csTitle = "";
    patt = /^\*title/i;
    for (i = 0; i < scene["lines"].length; i++) {
      if (patt.exec(scene["lines"][i])) {
        csTitle = scene["lines"][i];
      }
    }

    //if we have a title, set the <h1> and <title> tags to it
    if (csTitle != "") {
      patt = /^\*title[\s]+/i
      csTitle = csTitle.replace(patt, "");
      patt = /<title>.*<\/title>/i;
      if (patt.exec(top)) top = top.replace(patt, "<title>" + csTitle + "</title>");
      patt = /<h1.*>.*<\/h1>/i;
      if (patt.exec(bottom)) bottom = bottom.replace(patt, "<h1 class='gameTitle'>" + csTitle + "</h1>");
      console.log("");
      console.log("Game title set to: " + csTitle);
    }
  
  var ifidLine = scene.lines.find(line => /^\*ifid/i);
  if (ifidLine) {
    var ifid = ifidLine.replace(/^\*ifid\s+/i, "").toUpperCase();
    top += `<meta property="ifiction:ifid" content="${ifid}" prefix="ifiction: http://babel.ifarchive.org/protocol/iFiction/">`;
  }

  //7.2 Create the allScenes object
  console.log("");
  console.log("Combining scene files...");
  var scene_data = "";
  for (var i = 0; i < knownScenes.length; i++) {
      scene_data = safeSlurpFile(rootDir+'mygame/scenes/' + knownScenes[i]);
      if (scene_data === null || typeof scene_data === 'undefined') {
        if ("choicescript_upgrade.txt" === knownScenes[i]) continue;
        throw new Error("Couldn't find file " + 'mygame/scenes/' + knownScenes[i]);
      }
      var scene = new Scene();
      scene.loadLines(scene_data);
      var sceneName = knownScenes[i].replace(/\.txt/gi,"");
      sceneName = sceneName.replace(/ /g, "_");
      if (typeof slurpImage !== "undefined") {
        scene.lines = scene.lines.map(line => {
          let result = /^(\s*\*)(\w+)(.*)/.exec(line);
          if (!result) return line;
          let command = result[2].toLowerCase();
          if (!/(text_)image/.test(command)) return line;
          let data = trim(result[3]);
          let match = /(\S+) (\S+)(.*)/.exec(data);
          if (match) {
            let image = slurpImage(rootDir + 'mygame/' + match[1]);
            return `${result[1]}${command} ${image} ${match[2]}${match[3]}`;
          } else {
            let image = slurpImage(rootDir + 'mygame/' + data);
            return `${result[1]}${command} ${image}`;
          }
        });
      }
      scene_object = scene_object + "\"" + sceneName + "\": {\"crc\":" + scene.crc + ", \"lines\":" + toJson(scene.lines)+ ", \"labels\":" + toJson(scene.labels) + "}";
      if ((i + 1) != knownScenes.length) {
        scene_object += ",\n";
      }
  }
  scene_object = "allScenes = {" + scene_object + "}";

  //8. Reassemble the document (selfnote: allScenes object seems to cause issues if not in its own pair of script tags)
  console.log("Assembling new html file...");
  var new_game = top + "<script>" + scene_object + "<\/script><script>" + jsStore + "<\/script><style>" + cssStore + "</style>" + bottom;
  return new_game;
}

function addFile(name) {
  for (var i = 0; i < knownScenes.length; i++) {
    if (knownScenes[i] == name) return;
  }
  knownScenes.push(name);
}

function verifyFileName(name) {
  addFile(name);
}
