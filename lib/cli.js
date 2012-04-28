#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');

var fs = require('fs');

var exec = require('child_process').exec;

program
  .version(JSON.parse(fs.readFileSync(
       require.main.filename.match(/^(.+)\/.+$/)[1] + '/../package.json')).version)
  .option('-q, --quiet', "supress output");
  
  
function game_js(scenes, stats) {
  
   var txt = "// Specify the list of scenes here, separated by commas, with no final comma\n\nnav = new SceneNavigator([\n    ";
   txt += scenes.map(function(scene){return '"'+scene+'"';}).join("\n    ,");
   txt += "\n]);\n\n// Specify the default starting stats here\n\nstats = {\n    ";
   keylist = stats.join(": 50\n    ,") + ": 50\n";
   txt += keylist;
   txt += "};\n\n// Specify the stats to use in debug mode\n\ndebugStats = {\n    ";
   txt += keylist;
   txt += "};\n\n// or just use defaults\n// debugStats = stats";
   return txt;
}

/* Guestimates a reasonable variable name */
function varname(name) {
  return name.toLowerCase().replace(/\s+/g, "_");
}
  
program
  .command("new <NAME> [comma,seperated,list,of,scene,names]")
  .description("Create a new ChoiceScript project named NAME.\nYou may optionally pass a list of scene names to be generated.")
  .option("--no-stats", "Run --no-stats to skip generating choicescript_stats.txt", true)
  .option("--stats-list <stat,stat:type,...>", "Generate these stats (quoting the argument is recommended). `stat` is the name of the stat, type can be `percent` (default), `text` or `opposed_pair(NAME)`", function(arg) {
    out = {};
    arg.split(/\s*,\s*/).forEach(function(stat) {
      stat = stat.split(/\s*\:\s*/);
      if (stat[1]) {
        if(m = stat[1].match(/opposed_pair\(\s*(.+)\s*\)/)) {
          out[stat[0]] = {
            type: "opposed_pair",
            opposed_to: m[1]
          }
        } else {
          out[stat[0]] = {type: stat[1]};
        }
      } else {
        out[stat[0]] = {type: "percent"};
      }
    });
    return out;
  })
  .action(function(name, scenes, opts) {
    path = "./" + name;
    fs.mkdirSync(path, 0777);
    path += "/";
    
    if(scenes) { 
      scenes = scenes.split(",");
    } else {
      scenes = ["startup", "ending"];
    }
    stats = [];
    if (opts.statsList) {
      for(key in opts.statsList) {
        key = varname(key);
        stats.push(key);
      }
    } else if (opts.stats) {
      stats = ["leadership", "strength"];
    }
    fs.writeFileSync(path + "game.js", game_js(scenes, stats));
    path += "scenes/";
    fs.mkdirSync(path, 0777);
    first = scenes.shift();
    exec("touch " + scenes.map(function(scene){return path + scene + ".txt"}).join(' '), function(){});
    fs.writeFileSync(path + first + ".txt", "Welcome to your very first ChoiceScript game!\n\nCopyright 2010 by Dan Fabulich.\n\nDan Fabulich licenses this file to you under the\nChoiceScript License, Version 1.0 (the \"License\"); you may\nnot use this file except in compliance with the License. \nYou may obtain a copy of the License at\n\n*link http://www.choiceofgames.com/LICENSE-1.0.txt\n\nSee the License for the specific language governing\npermissions and limitations under the License.\n\nUnless required by applicable law or agreed to in writing,\nsoftware distributed under the License is distributed on an\n\"AS IS\" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,\neither express or implied.\n\n*page_break\n\nYour majesty, your people are starving in the streets, and threaten revolution.\nOur enemies to the west are weak, but they threaten soon to invade.  What will you do?\n\n*choice\n  #Make pre-emptive war on the western lands.\n    If you can seize their territory, your kingdom will flourish.  But your army's\n    morale is low and the kingdom's armory is empty.  How will you win the war?\n    *choice\n      #Drive the peasants like slaves; if we work hard enough, we'll win.\n        Unfortunately, morale doesn't work like that.  Your army soon turns against you\n        and the kingdom falls to the western barbarians.\n        *finish\n      #Appoint charismatic knights and give them land, peasants, and resources.\n        Your majesty's people are eminently resourceful.  Your knights win the day,\n        but take care: they may soon demand a convention of parliament.\n        *finish\n      #Steal food and weapons from the enemy in the dead of night.\n        A cunning plan.  Soon your army is a match for the westerners; they choose\n        not to invade for now, but how long can your majesty postpone the inevitable?\n        *finish\n  #Beat swords to plowshares and trade food to the westerners for protection.\n    The westerners have you at the point of a sword.  They demand unfair terms\n    from you.\n    *choice\n      #Accept the terms for now.\n        Eventually, the barbarian westerners conquer you anyway, destroying their\n        bread basket, and the entire region starves.\n        *finish\n      #Threaten to salt our fields if they don't offer better terms.\n        They blink.  Your majesty gets a fair price for wheat.\n        *finish\n  #Abdicate the throne. I have clearly mismanaged this kingdom!\n    The kingdom descends into chaos, but you manage to escape with your own hide.\n    Perhaps in time you can return to restore order to this fair land.\n    *finish");
    
    
    if(opts.stats) {
      var txt = "This is a stats screen!\n\n*stat_chart\n";
      statsList = opts.statsList || {Leadership: {type: "percentage"}, Strength: {type: "opposed_pair", opposed_to: "Weakness"}};
      for(key in statsList) {
        var name = varname(key);
        var stat = statsList[key];
        txt += "\n  " + stat.type + " ";
        if (name == key.toLowerCase()) {
          txt += key;
        } else if(stat.type == "opposed_pair") {
          txt += name + "\n    " + key;
        } else {
          txt += name + " " + key;
        }
        if(stat.type == "opposed_pair") {
          txt += "\n    " + stat.opposed_to;
        }
      }
      fs.writeFileSync(path + "choicescript_stats.txt",  txt);
    }
    if(!program.quiet) {
      console.log("Your game has been generated. You can now run it with `choicescript server`.");
    }
  });

program
  .command("server")
  .description("Start your game.")
  .option('-p, --port <NUM>', "What port should the server run on", 3030)
  .option('--open', "Open in the browser (supported only on OSX)")
  .action(function(opts) {
    var express = require("express");
    var app = express.createServer(); //program.port
    app.use(express.static(__dirname + '/../public'));
    app.use(express.static(fs.realpathSync('.')));
    app.get("/", function() {});
    app.listen(opts.port);
    console.log("Your game is running on http://localhost:" + opts.port + "/");
    if (opts.open) exec("open http://localhost:" + opts.port + "/", function() {});
  });

program
  .command("quicktest [FILES]")
  .description("Run a test that will methodically attempt to try every possible option.")
  .option("-w, --watch", "Watch the directory of FILE for changes and run tests automatically")
  .action(function(files, opts) {
    var list = [];
    if(files) list = files.split(",");
    // Massive watch functionallity
    if(opts.watch) {
      // Check if fs.watch is available
      if(typeof fs.watch === 'function') {
        if (list.length > 0) {
          list.forEach(function(l) {
            fs.watch("./scenes/" + l + ".txt", function() {
              try {
                eval(fs.readFileSync(__dirname + "/autotest.js", "utf-8"));
              } catch(e) {}
            });
          });
        } else {
          function parseDir(f) {
            fs.readdirSync(f).forEach(function(p) {
              p = f + "/" + p;
              if (fs.statSync(p).isFile()) {
                fs.watch(p, function() {
                  try {
                    eval(fs.readFileSync(__dirname + "/autotest.js", "utf-8"));
                  } catch(e) {}
                });
              } else if(fs.statSync(p).isDirectory()) {
                parseDir(p);
              }
            });
          }
          parseDir(fs.realpathSync("."));
        }
      } else {
        process.stderr.write("fs.watch is not supported by your OS.");
        process.exit(-1);
      }
    } // end --watch support
    try {
      eval(fs.readFileSync(__dirname + "/autotest.js", "utf-8"));
    } catch(e) {}
  });
  
program
  .command("randomtest [iterations] [random-seed]")
  .description("Run a test that will randomly step trough your game and measure coverage of every line.")
  .action(function(iterations, randomSeed) {
    if (iterations == null) {
        iterations = 10000;
      }
      if (randomSeed == null) {
        randomSeed = 1;
      }
    eval(fs.readFileSync(__dirname + "/randomtest.js", "utf-8"));
  });
  
program
  .command("test")
  .description("Run both quicktest and randomtest")
  .action(function() {
    var iterations = 10000;
    var randomSeed = 1;
    eval(fs.readFileSync(__dirname + "/randomtest.js", "utf-8"));
    eval(fs.readFileSync(__dirname + "/autotest.js", "utf-8"));
  });

program.on("--help", function() {
  console.log("  For more information on command line usage type `man choicescript`\n  For more information on ChoiceScript syntax type `man choicescript-syntax`.");
});

program  
  .parse(process.argv);

if (program.args.length == 0) {
  console.log("Usage: " + program.name + " "+ program.usage() + "\n  Type `" + program.name + " --help` for more information.");
}