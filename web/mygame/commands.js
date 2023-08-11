//------------------------------ Custom Commands ------------------------------
Scene.validCommands["exec"] = 1;
Scene.validCommands["bug_continue"] = 1;

// Totally not a rebadged script function, I promise :).
Scene.prototype.exec = function exec(code) {
    try {
        if (typeof window === "undefined") {
            var _window = _global;
        }
        eval(code);
    } catch (e) {
        throw new Error(
            "error executing javascript on "
            .concat(this.lineMsg(), "\n")
            .concat(e)
            .concat(e.stack ? "\n" + e.stack : "")
        );
    }
}

// Allow the printing of a bug, but continue because it's not fatal :)
Scene.prototype.bug_continue = function(message) {

    if (message) {
        message = "Bug: " + this.replaceVariables(message);
    } else {
        message = "Bug";
    }
    
    // Stop Autotest from failing (alert doesn't work on the command line)
    if (typeof window === "undefined") {
        this.warning(this.lineMsg() + "\n" + message)
    } else {
        alert(this.lineMsg() + "\n" + message);
    }

}