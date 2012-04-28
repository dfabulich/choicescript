#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');

var fs = require('fs');

var exec = require('child_process').exec;

program
  .version('1.0.0')
  .option('-q, --quiet', "Supress output")
  

program
  .command("new <name> [scene names comma-seperated]")
  .description("Create a new ChoiceScript project")
  .option("--no-stats", "Run --no-stats to skip generating choicescript_stats.txt", true)
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
  .command("quicktest")
  .description("Run a test that will methodically attempt to ")
  .action(function() {
    eval(fs.readFileSync(__dirname + "/autotest.js", "utf-8"));
  });
  
program
  .command("randomtest [iterations] [random seed]")
  .description("Run a test that will methodically attempt to ")
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