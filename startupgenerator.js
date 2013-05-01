if (typeof load == "undefined") {
	fs = require('fs');
	vm = require('vm');

	load = function(file) {
		vm.runInThisContext(fs.readFileSync(file), file);
	};
}

var mygame = "web/mygame/mygame.js";
load("web/navigator.js");
load("web/mygame/mygame.js");

console.log("*scene_list");
var firstScene;
for (var i = 0; i < nav._sceneList.length; i++) {
	if (!nav._sceneList[i]) continue;
	if (!firstScene) {
		firstScene = nav._sceneList[i];
		if (firstScene != "startup") console.log("  startup");
	}
	console.log("  " + nav._sceneList[i]);
}
console.log("");
var mygame = ""+fs.readFileSync("web/mygame/mygame.js");
var statBlock = /stats\s*=\s*{((\r|\n|.)*?)}/.exec(mygame)[1];
var lines = statBlock.split(/\r?\n/);
for (var i = 0; i < lines.length; i++) {
	var line = lines[i].trim();
	if (!line) {
		console.log("\n");
		continue;
	}
	if (/^,/.test(line)) line = line.substr(1);
	var parts = /"?(.*?)"?\s*:\s*(.*)/.exec(line);
	var stat = parts[1];
	var value = parts[2];
	var commentParts = /(.*?)\/\/(.*)$/.exec(value);
	if (commentParts) {
		value = commentParts[1];
		console.log("\n*comment " + commentParts[2]);
	}
	console.log("*create " + stat + " " + value);
}

console.log("*goto_scene " + firstScene);