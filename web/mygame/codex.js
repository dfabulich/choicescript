// Replace the setButtonTitles
// This fixes the the button not being reset when clicking on the buttons
// while in the codex.
setButtonTitles = repSetButtonTitles

//How to open the Codex scene. Also the second half replaces my Codex button with the option to return to the game
function openCodex() {
    // Wait for game to stop loading.
    if (document.getElementById('loading')) return;
    var button = document.getElementById("codexButton");
    if (button && button.innerHTML == "Return to the Game") {
        return clearScreen(function () {
            setButtonTitles();
            loadAndRestoreGame();
        });
    }

    var scene = new Scene("codex", window.stats, this.nav, { secondaryMode: "codex", saveSlot: "temp", resume: true });
    clearScreen(function () {
        setButtonTitles();
        var button = document.getElementById("codexButton");
        button.innerHTML = "Return to the Game";
        scene.execute();
    })
}

// Replacement function for setButtonTitles.
function repSetButtonTitles() {
    var button;
    button = document.getElementById("menuButton");
    if (button) {
        button.innerHTML = "Menu";
    }
    button = document.getElementById("statsButton");
    if (button) {
        button.innerHTML = "Show Stats";
    }
    button = document.getElementById("achievementsButton");
    if (button) {
        if (nav.achievementList.length) {
            button.style.display = "";
            button.innerHTML = "Achievements";
        } else {
            button.style.display = "none";
        }
    }
    button = document.getElementById("codexButton");
    if (button) {
        button.innerHTML = '<img src="images/bookButton.png"/>';
    }
}


