# ChoiceScript FINFUATS Repository

Be careful and read the setup guide before you attempt to use this repository.

A lot of things with this documentation are subject to change...

## Table of context

- [Setup](#setup)
- [Commiting](#commiting)

## Setup

Before you get started, you need to have these software packages install:

- [Node](https://nodejs.org/en) - the latest LTS version should be fine
- [git](https://git-scm.com/downloads)

Once you have both software packages installed, setup ChoiceScript-UAT by running these commands:

```bash
git clone --recurse-submodules git@github.com:FINFUATS/choicescript-UAT.git
cd choicescript-UAT
```

When git is done fully cloning the repo, run the command:

```bash
node serve.js
```

or run `run-server.bat` if you use Windows, or run `./serve.command` if you use macOS/Linux.

## Commiting

Committing to this repository can be a bit complex as the game files and the environment files are in two different repositories. Follow the sections in order, you will need to do both to ensure main repo stays up to date.

#### Game

First, you need to go into the `web/mygame` directory and run the commands:

```bash
git add .
git commit -m "**YOUR COMMIT MESSAGE**"
git push
```

#### Main

After committing to the game repository, you need to update the main repository. To do this, run the exact same command in the root of the repository.

```bash
git add .
git commit -m "**YOUR COMMIT MESSAGE**"
git push
```

