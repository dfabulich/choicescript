dict = new Map();

//-------------------------- Dictionary Definitions --------------------------\\
dict.set('the', makeDefinition("The", "/ðə/, /ˈðiː/", "Article", "Definite grammatical article that implies necessarily that an entity it hints at is presupposed; something already mentioned, or completely specified later in that same sentence, or assumed already completely specified."));
dict.set('see', makeDefinition("See", "/ˈsiː/", "Verb", "To perceive or detect someone or something with the eyes, or as if by sight."));
dict.set('uat', makeDefinition("UAT", null, null, "UNIVERSITY"));
//----------------------------------------------------------------------------\\

function makeDefinition(word, pronounce, pos, def) {
    return {
        word: word,
        pronunciation: pronounce,
        partOfSpeech: pos,
        definition: def
    };
}

function openDefinition(inp, showButton=true) {
    if (document.getElementById('loading')) return;

    // Get definition from dict hashmap
    let tmp = dict.get(inp.toLowerCase());
    let temp = new Scene("dict", null, this.nav, { secondaryMode: "dict" });

    // Null check for easy readin'
    let nullCheck = (input, tester) => {
        return (tester == null ? '' : input)
    }

    // Create 
    clearScreen(function () {
        setButtonTitles();
        document.getElementById("text").innerHTML =`
            <div id="dict-top-row">` + 
            nullCheck(`<span id="dict-word">${tmp.word}</span>`, tmp.word) + 
            nullCheck(`<span>•</span><span id="dict-pos">${tmp.partOfSpeech}</span>`, tmp.partOfSpeech) +
            nullCheck(`<span>•</span><span id="dict-pronounce">${tmp.pronunciation}</span>`, tmp.pronunciation) + `
            </div>` +
            nullCheck(`<p id="dict-definition">${tmp.definition}</p>`, tmp.definition);
	if(showButton){
            printButton("Back", main, false, () => {
                clearScreen(loadAndRestoreGame);
            })
        }

        temp.execute();
    });
}

function openAllDefinitions(){
    if (document.getElementById('loading')) return;

    let temp = new Scene("dict", null, this.nav, { secondaryMode: "dict" });

    // Null check for easy readin'
    let nullCheck = (input, tester) => {
        return (tester == null ? '' : input)
    }

    dict.forEach(function(value, key) {
		document.getElementById("text").innerHTML +=`
		    <div id="dict-top-row">` + 
            nullCheck(`<span id="dict-word">${value.word}</span>`, value.word) + 
            nullCheck(`<span>•</span><span id="dict-pos">${value.partOfSpeech}</span>`, value.partOfSpeech) +
            nullCheck(`<span>•</span><span id="dict-pronounce">${value.pronunciation}</span>`, value.pronunciation) + `
            </div>` +
            nullCheck(`<p id="dict-definition">${value.definition}</p>`, value.definition);

    });
}


// Maybe this will be useful later...
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
