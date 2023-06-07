let originalReplaceBbCode = ""

/* Store the original replaceBbCode to ensure our code keeps up with updated tags */
function storeOriginalReplaceBbCode(func) {
    // Is this particularly safe, probably not.
    // Do I care? ... :) 
    eval(`originalReplaceBbCode = ${func.toString()}`);
}

/* This is where we add our own formatting tags. */
function replacementReplaceBbCode(msg) {
    return msg = String(originalReplaceBbCode(msg))
      .replace(/\[color\=(.*?)\]/g, '<color style="color: $1;">')
      .replace(/\[\/color\]/g, '</color>')        
}