//---------------------------- Hooked Functions -------------------------------

/* -== Function hooker ==- */
// Store the original function to ensure our code keeps up with updated choicescript versions.
function hookFunctions() {
    let hookedFuncs = [
        ["replaceBbCode", "replacementReplaceBbCode", "originalReplaceBbCode"],
        ["setButtonTitles", "replacementSetButtonTitles", "originalSetButtonTitles"],
        ["changeFontSize", "replacementChangeFontSize", "originalChangeFontSize"]
    ];
    // Is this particularly safe, probably not.
    // Do I care? ... :) 
    for(i in hookedFuncs) {
        eval(`${hookedFuncs[i][2]} = ${String(window[hookedFuncs[i][0]])}`);
        eval(`${hookedFuncs[i][0]} = ${hookedFuncs[i][1]}`);
    }
}

/* -== Custom BBcode ==- */
// This is where we add our own formatting tags.
function replacementReplaceBbCode(msg) {
    return msg = String(originalReplaceBbCode(msg))
      // Start and end tags for color 
      .replace(/\[color\=(.*?)\]/g, '<color style="color: $1;">')
      .replace(/\[\/color\]/g, '</color>')
      // Tag for the dictionary system
      .replace(/\[define\:(.*?)\]/g, "<a id=\"defined-word\" onClick=\"openDefinition('$1')\">$1</a>")
      .replace(/\[head\]/g, '<h1 class="custom-head1" align="center" style="margin-bottom: 0em;">')
      .replace(/\[\/head\]/g, '</h1><hr class="custom-head1-line" style="margin-top: 0em; width: 90%;">')
      .replace(/\[break\]/g, '<br>')
}

// This fixes the the button not being reset when clicking on the buttons while
// in the codex.
function replacementSetButtonTitles() {
    // Call original function 
    originalSetButtonTitles();
    
    // Update codex button
    button = document.getElementById("codexButton");
    if (button) {
        button.className = "codexButton";
        button.innerHTML = '<img id="codexButtonImg" src="images/bookButton.webp"/>';
    }
}

// Fixes Codex button scaling issues when using text size options.
function replacementChangeFontSize(bigger) {
    originalChangeFontSize(bigger);
    
    // Root of the document
    let root = document.documentElement;
    // Custom CSS propery that gets parsed again after changing 
    let customProperty = "--codex-button-image-width";
    // Get the original width of codex button property
    let ogWidth = getComputedStyle(root).getPropertyValue(customProperty);
    
    // Add 10% when increasing text size, subtract 10% when decreasing text size. 
    if(bigger) {
        root.style.setProperty(customProperty, parseInt(ogWidth) + 10 + "%");
    } else {
        root.style.setProperty(customProperty, parseInt(ogWidth) - 10 + "%");
    }
}
