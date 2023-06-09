originalReplaceBbCode = ""

/* Store the original replaceBbCode to ensure our code keeps up with updated tags */
function storeOriginalReplaceBbCode(func) {
    // Is this particularly safe, probably not.
    // Do I care? ... :) 
    eval(`originalReplaceBbCode = ${func.toString()}`);
}

/* This is where we add our own formatting tags. */
function replacementReplaceBbCode(msg) {
    return msg = String(originalReplaceBbCode(msg))
      // Start and end tags for color 
      .replace(/\[color\=(.*?)\]/g, '<color style="color: $1;">')
      .replace(/\[\/color\]/g, '</color>')
      // Tag for the dictionary system
      .replace(/\[define\:(.*?)\]/g, "<a id=\"defined-word\" onClick=\"openDefinition('$1')\">$1</a>")
}
