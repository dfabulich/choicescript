//------------------------------ Custom Commands ------------------------------
Scene.validCommands["exec"] = 1;

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
