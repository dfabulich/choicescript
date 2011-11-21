load(arguments[0]);

QUnit.init();
QUnit.config.blocking = false;
QUnit.config.autorun = true;
QUnit.config.updateRate = 0;

QUnit.testStart = function(x) {
	print("  ", x.name);
}

QUnit.moduleStart = function(x) {
	print(x.name);
}

QUnit.log = function(entry) {
	if (entry.result) return;
	var message = entry.message;
	if (typeof message === "undefined") message = "";
    print("    ", entry.result ? 'PASS' : 'FAIL', message);
    if (!entry.result && entry.expected) {
    	if (entry.actual) {
    		print("      expected <"+entry.expected+ "> was <"+entry.actual+">");
    	} else {
    		print("      expected <"+entry.expected+ ">");
    	}
    }
};

var finalResults;
QUnit.done = function(results) {
	finalResults = results;
}

for (var i = 1; i < arguments.length; i++) {
	load(arguments[i]);
}

if (finalResults.failed) {
	print(finalResults.failed, "FAILED out of", finalResults.total, "total");
	java.lang.System.exit(1);
} else {
	print(finalResults.total, "PASSED");
}