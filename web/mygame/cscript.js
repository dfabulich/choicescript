originalReplaceBbCode = ""

/* Store the original replaceBbCode to ensure our code keeps up with updated tags */
function storeOriginalReplaceBbCode(func) {
    // Is this particularly safe, probably not.
    // Do I care? ... :) 
    eval(`originalReplaceBbCode = ${func.toString()}`);
}

//------------------------------- Custom BBcode -------------------------------

/* This is where we add our own formatting tags. */
function replacementReplaceBbCode(msg) {
    return msg = String(originalReplaceBbCode(msg))
      // Start and end tags for color 
      .replace(/\[color\=(.*?)\]/g, '<color style="color: $1;">')
      .replace(/\[\/color\]/g, '</color>')
      // Tag for the dictionary system
      .replace(/\[define\:(.*?)\]/g, "<a id=\"defined-word\" onClick=\"openDefinition('$1')\">$1</a>")
      .replace(/\[head\]/g, '<h1 class="custom-head1" align="center" style="margin-bottom: 0em;">')
      .replace(/\[\/head\]/g, '</h1><hr class="custom-head1-line" style="margin-top: 0em; width: 90%;">')
}

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
