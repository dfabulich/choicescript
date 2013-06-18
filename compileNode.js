var fs = require('fs');
var path = require('path');
var inputDir = process.argv[2] || "web/mygame/scenes";
var outputDir = process.argv[3] || "web/mygame/scenes";
eval(fs.readFileSync("web/scene.js", "utf-8"));
eval(fs.readFileSync("web/util.js", "utf-8"));
eval(fs.readFileSync("headless.js", "utf-8"));

var scene_object = "";

//1. Retrieve game's html
var game_html = fs.readFileSync("web/mygame/index.html", "utf-8");

//2. Find and extract all .js file data
var patt = /<script.*?src=["'](.*?)["']><\/script>/gm;
var doesMatch;
var jsStore = "";
console.log("\nExtracting js data from:");
while (doesMatch = patt.exec(game_html)) {
   console.log(doesMatch[1]);
  if (doesMatch[1] != "../version.js") {
  new_value = fs.readFileSync('web/mygame/' + doesMatch[1], "utf-8"); 
	if (new_value != "undefined" && new_value != null) {
		jsStore = jsStore + new_value;
	}
  }
}

//3. Find and extract all .css file data
var patt = /^\<link[\s][\w'"\=\s\.\/]*[\s]?href\=["']([\w\.\/]*.css)["']/gm;
var doesMatch;
var cssStore = "";
console.log("\nExtracting css data from:");
while (doesMatch = patt.exec(game_html)) {
   console.log(doesMatch[1]);
  new_value = fs.readFileSync('web/mygame/' + doesMatch[1], "utf-8"); 
	if (new_value != "undefined" && new_value != null) {
		cssStore = cssStore + new_value;
	}
}

//4. Remove css links
patt = /^<link[\s][\w'"\=\s\.\/]*>/gm
game_html=game_html.replace(patt,"");

//5. Remove js links
patt = /^<script src\=[\w'"\=\s\.\/]*><\/script>/gm
game_html=game_html.replace(patt,"");

//6. Slice the document
var top = game_html.slice(0, (game_html.indexOf("</head>") - 1));
var bottom = game_html.slice((game_html.indexOf("</head>")),game_html.length);

//7. Create the allScenes object
var sceneList = fs.readdirSync(inputDir);
console.log("");
console.log("Combining scene files...");
var scene_data = "";
for (var i = 0; i < sceneList.length; i++) {
	if (sceneList[i] == 'choicescript_upgrade.txt') continue;
		scene_data = slurpFile('web/mygame/scenes/' + sceneList[i]);
		var scene = new Scene();
		scene.loadLines(scene_data);
		var sceneName = sceneList[i].replace(/\.txt/gi,"");
		sceneName = sceneName.replace(/ /g, "_");
		scene_object = scene_object + "\"" + sceneName + "\": {\"crc\":" + scene.temps.choice_crc + ", \"lines\":" + toJson(scene.lines)+ ", \"labels\":" + toJson(scene.labels) + "}";
		if ((i + 1) != sceneList.length) {
			scene_object += ",";
		}
		
		if (sceneList[i] == "startup.txt") {
			//Check startup.txt, check for a *title
			var csTitle = "";
			patt = /^\*title/i;
			for (var i = 0; i < scene["lines"].length; i++) {
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
		}
}
scene_object = "allScenes = {" + scene_object + "}";
	
//8. Reassemble the document (selfnote: allScenes causes issues if not in its own pair of script tags)
fs.writeFileSync("mygame_complete.html", top + "<script>" + scene_object + "</script><script>" + jsStore + "</script>" + "<style>" + cssStore + "</style>" + bottom, "utf-8");

console.log("\nDone!\nmygame_complete.html exported to root cs directory.");