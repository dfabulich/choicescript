// Centralize functionality for overriding various ChoiceScript utilities
// in order to forward their output to CSIDE via IPC.

var LOG_TYPES = {
    "INFO": "log",
    "WARNING": "warn",
    "ERROR": "error",
    "PROGRESS": "progress",
    "STATUS": "status"
}

var writeToOutputFile = false;
var fileStream = null;

function write(obj) {
    if (writeToOutputFile) {
        fileStream.write(obj.value + '\n', 'utf8');
    }
    process.send(obj);
}

if (typeof process !== "undefined") {

    var consoleLog = console.log;

    if (typeof process.send !== "undefined") {
        // We're a subprocess, and should get ready to forward data to CSIDE.
        process.on('uncaughtException', function(err) {
            console.log('Caught exception: ' + err, { type: LOG_TYPES.ERROR });
        });
        
        process.on('exit', function(code) {
            console.log("exit", { type: "exitCode", value: code})
        });

        console.log = function(message, data) {
            type = "log";
            if (data && data.type) {
                type = data.type;
            }
            switch(type) {
                case "config":
                    if (data && data.outputFile) {
                        writeToOutputFile = true;
                        fileStream = fs.createWriteStream(data.outputFile, {encoding: 'utf8'});
                    }
                    break;
                case "progress":
                    process.send({ type: type, value: data.value });
                    break;
                case "exitCode":
                    process.send({ type: type, value: data.value });
                    break;
                case "error":
                    write({ type: type, value: message });
                    break;
                default:
                    write({ type: type, value: message });
                    break;
            }
        }
    } else {
        // This isn't a CSIDE instantiation, so we
        // re-override console.log with a version that
        // mutes metadata output (the 'data' obj).
        console.log = function(message, data) {
            consoleLog(message);
        }
    }
}