//Test file for the conditional comment inclusion/exclusion code.
//Run this file from the util/buildscripts/tests directory.

load("../jslib/buildUtil.js");
load("../jslib/fileUtil.js");
load("../jslib/logger.js");




var result = buildUtil.processConditionals(
	"conditionalTest.txt", 
	fileUtil.readFile("conditionalTest.txt"),
	{
		loader: "xdomain",
		shouldInclude: true,
		nesting: 1
	}
);

print(result);
