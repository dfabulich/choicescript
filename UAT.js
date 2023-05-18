#!/usr/bin/env node
const GameName = "FINFUATS"
const TAG = require('path').basename(__filename) + " - A script to help with git...";
const prompt = require('prompt-sync')();

var commandExists = require('command-exists').sync;
const { execSync } = require('child_process');
const { Console } = require('console');
const { resolve } = require('path');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// I live and breath Rust, I subconsciously structured this like Rust
const CommitSubCommand = {
    Help: "help",
    Both: "both",
    Main: "main",
    Game: "game"
}

function printCommitHelp() {
    console.log(TAG);
    console.log("\ncommands:");
    console.log(`    ${CommitSubCommand.Help}\t\tPrint this text`);
    console.log(`    ${CommitSubCommand.Both}\t\tCommit & Push to both repos (order: ${CommitSubCommand.Game}, ${CommitSubCommand.Main})`);
    console.log(`    ${CommitSubCommand.Game}\t\tCommit to the game sub repo (default when no args passed)`);
    console.log(`    ${CommitSubCommand.Main}\t\tCommit to the main repo`);
}

// Commit message for the git commit.
function getCommitMessage() {
    var commitMesg = "";

    if (commandExists('git')) {
        // Stop user from inputting no text in commit.
        while (commitMesg === "") {
            commitMesg = prompt('Input commit message: ');

            if (commitMesg === "") {
                console.log("Cannot commit with empty message\n");
            }
        }
    } else {
        console.log("git is not installed, install git before running this program.");
        process.exit(0);
    }

    return commitMesg;
}

async function gitCommitPushFlow(isSubDir) {
    let prefix = (isSubDir) ? "cd web/mygame && " : "";
    let commitMesg = getCommitMessage();
        let add_confirm = "";

        // Files to be added.
        let fba = execSync(`${prefix}git add . --dry-run`).toString().split("\n");

        // Update each element in list
        fba.forEach((e, i) => {
            fba[i] = e.slice(4);
        });

        console.log("\nFiles to be added:\n" + fba.join("\n"));

        // Add to git repo section
        while (add_confirm != "y" || add_confirm != "n") {
            add_confirm = prompt("Would you like to add/readd these files to the git repo? (y/n): ").toLowerCase()[0];

            if (add_confirm === "y") { break; }
            if (add_confirm === "n") { process.exit(0); }
        }
        execSync(`${prefix}git add .`);
        console.log("Added files...");
        
        // Commit section
        for (let i = 5; i > 0; i--){
            process.stdout.write(`Commiting in ${i}...\r`);
            await delay(1000);
        }
        console.log("");
        execSync(`${prefix}git commit -m \"${commitMesg}\"`, {stdio: 'inherit'});

        // Push section
        for (let i = 5; i > 0; i--){
            process.stdout.write(`Pushing in ${i}...\r`);
            await delay(1000);
        }
        console.log("");
        execSync(`${prefix}git push`, {stdio: 'inherit'});
}

function handleCommit(CommitEnum) {
    // Doing it like this ensures I don't have to rewrite code... probably.
    // Main git commit lambda function
    let mainGitFunc = () => {
        // let commitMesg = getCommitMessage();
        gitCommitPushFlow(false);
    }

    // Game git commit lambda function
    let gameGitFunc = async () => {
        gitCommitPushFlow(true);
    }

    switch (CommitEnum) {
        case CommitSubCommand.Help:
            printCommitHelp();
            break;

        case CommitSubCommand.Main:
            mainGitFunc();
            break;

        case CommitSubCommand.Game:
        default:
            gameGitFunc();
            break;

        case CommitSubCommand.Both:
            gameGitFunc();
            mainGitFunc();
            break;
    }
}

const MainSubCommand = {
    Help: "help",
    Update: "update",
    Commit: "commit"
}

function printMainHelp() {
    console.log(TAG);
    console.log("\ncommands:");
    console.log(`    ${MainSubCommand.Update}\t\tUpdate both Choicescript and ${GameName} git repos`);
    console.log(`    ${MainSubCommand.Commit}\t\tCommit for either Choicescript or ${GameName} git repos (default: ${GameName})`);
}

function main() {
    if (typeof process != "undefined") {

        var command = process.argv[2];

        switch (command) {

            case MainSubCommand.Update:
                printMainHelp();
                break;

            case MainSubCommand.Commit:
                handleCommit(process.argv[3]);
                break;

            case MainSubCommand.Help:
            default:
                printMainHelp();
                break;
        }
    }
}

main()
