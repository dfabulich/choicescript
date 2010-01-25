dependencies = {
	//This option configures dojox.storage to just include the Gears
	//storage provider for an offline use.
	dojoxStorageBuildOption: "offline",

	layers: [
		{
			name: "../dojox/off/offline.js",
			layerDependencies: [
			],
			dependencies: [
				"dojox.off.offline"
			]
		}
	],

	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}