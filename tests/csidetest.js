
function getProcessLogs(process) {
    var logs = [];
    return new Promise(async (resolve) => {
        process.on("message", function(log) {
            logs.push(log);
         });
         process.on('disconnect', async function(code) {
             resolve(logs);
         });
    });
}

function getSceneNamesFromDir(dir) {
    return fs.readdirSync(dir).filter(function(fileName) {
        return fileName.substring(fileName.lastIndexOf("."), fileName.length) === ".txt";
    }).map(function(sceneName) {
        return sceneName.slice(0, sceneName.lastIndexOf("."));
    });
}

function getExitCode(logs) {
    exitLog = logs.find(function(log) { return log.type === "exitCode"; });
    return (exitLog !== "undefined") ? exitLog.value : undefined;
}

function getErrorText(logs) {
    return logs.filter((l) => {
        return l.type === "error"
    }).reduce(function(prev, cur) {
        return "    " + prev + "           " + cur.value;
    }, "\n        Error Text:\n");
}

module("CSIDE Sub-Process Communication");

asyncTest("cside-autotest", async function() {
    var autotest_process = cp.fork("autotest.js",
        ["tests/data/scenes/"].concat(
            getSceneNamesFromDir("tests/data/scenes/")
        )
    );
    var logs = await getProcessLogs(autotest_process);

    start();
    equal(getExitCode(logs), 0, getErrorText(logs));
});

asyncTest("cside-compile", async function() {
    var compile_process = cp.fork("compile.js", ["mygame.html", "web/", "tests/data/scenes"]);
    var logs = await getProcessLogs(compile_process);

    start();
    equal(getExitCode(logs), 0, getErrorText(logs));
    ok(fs.existsSync("mygame.html"), "Expected output file doesn't exist");
});

asyncTest("cside-randomtest", async function() {
    var randomtest_process = cp.fork("randomtest.js", ["num=1000", "project=tests/data/scenes/", "seed=0", "delay=false", "trial=false"]);
    logs = await getProcessLogs(randomtest_process);

    start();
    equal(getExitCode(logs), 0, getErrorText(logs));
});

asyncTest("cside-randomtest to output file", async function() {
    var randomtest_process = cp.fork("randomtest.js", ["num=1000", "project=tests/data/scenes/", "seed=0", "delay=false", "trial=false", "showText=true", "output=random.txt"]);
    logs = await getProcessLogs(randomtest_process);

    start();
    equal(getExitCode(logs), 0, getErrorText(logs));
    ok(fs.existsSync("random.txt"), "Expected output file doesn't exist");
});