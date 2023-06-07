const dict = new Map();

//-------------------------- Dictionary Definitions --------------------------\\
dict.set('the', makeDefinition("The", "/ðə/, /ˈðiː/", "Article", "Definite grammatical article that implies necessarily that an entity it hints at is presupposed; something already mentioned, or completely specified later in that same sentence, or assumed already completely specified."));
dict.set('see', makeDefinition("See", "/ˈsiː/", "Verb", "To perceive or detect someone or something with the eyes, or as if by sight."));
//----------------------------------------------------------------------------\\

function makeDefinition(word, pronounce, pos, def) {
    return { word: word, pronunciation: pronounce, partOfSpeech: pos, definition: def };
}

function openDefinition(inp) {
    if (document.getElementById('loading')) return;

    let tmp = dict.get(inp);
    let temp = new Scene("dict", null, this.nav, { secondaryMode: "startup" });

    clearScreen(function () {
        setButtonTitles();
        // REMINDER: Remember to delete the temp text
        document.getElementById("text").innerHTML = `
            <replaceignore></replaceignore>
            <span id="temp-text">This is a quick test of the dictionary feature. There will be bugs. - Long</span>
            <div id="dict-top-row">
            <span id="dict-word">${tmp.word}</span>
            <span>•</span>
            <span id="dict-pos">${tmp.partOfSpeech}</span>
            <span>•</span>
            <span id="dict-pronounce">${tmp.pronunciation}</span>
            </div>
            <p id="dict-definition">${tmp.definition}</p>`;

        printButton("Back", main, false, () => {
            clearScreen(loadAndRestoreGame);
        })

        temp.execute();
        wordReplacer();
    });
}

function findWordAndReplaceWithDefinition(inp) {
    var main = document.getElementById("text")
    if (main.getElementsByTagName("replaceignore").length != 0) return;

    var tml = main.innerHTML.split(" ");

    tml.forEach((v, i, a) => {
        tml[i] = v.replace(new RegExp(
            `\\b${inp}(?![a-z,A-Z,0-9].*)`, "i"),
            `<a id="defined-word" onclick="openDefinition('${inp}')">$&</a>`
        );
    })

    main.innerHTML = tml.join(" ");
}

// modified code from https://stackoverflow.com/a/61511955
function doAfterLoad(func) {
    let selector = "#loading"
    new Promise(resolve => {
        if (document.querySelector(selector) == null) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector) == null) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }).then(func);
}

function wordReplacer() {
    doAfterLoad(() => {
        // if(document.getElementsByTagName("processed").length != 0) return;

        dict.forEach((v, k) => {
            findWordAndReplaceWithDefinition(k);
        })

        Array.from(document.getElementsByTagName("button")).forEach((v, i, a) => {
            v.addEventListener("click", () => {
                wordReplacer();
            });
        });

        document.getElementById("text").append(document.createElement("processed"));

    })
}