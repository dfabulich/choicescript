//How to open the Codex scene. Also the second half replaces my Codex button with the option to return to the game
function openCodex() {
    if (document.getElementById('loading')) return;
    var button = document.getElementById("codexButton");
    if (!button) return;
    if (button.innerHTML == "Return to the Game") {
        return clearScreen(function () {
            setCodexButton();
            loadAndRestoreGame();
        });
    }
    let temp = new Scene("codex", null, this.nav, { secondaryMode: "codex", saveSlot: "temp" });
    clearScreen(function () {
        setCodexButton();
        var button = document.getElementById("codexButton");
        button.innerHTML = "Return to the Game";
        temp.execute(); 
    })

}

function setCodexButton() {
    button = document.getElementById("codexButton");
    if (button) {
        button.innerHTML = '<img src="images/bookButton.png"/>';
    }
}
