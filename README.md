# ChoiceScript FINFUATS Repository

Be careful and read the setup guide before you attempt to use this repository.

A lot of things with this documentation are subject to change...

## Table of context

- [Setup](#setup)
- [Commiting](#commiting)
  - [UAT.js](#uatjs-under-construction)
    - [update](#update)
    - [commit](#commit)
      - [help](#help)
      - [game](#game)
      - [main](#main)
  - [Manual Commit](#manual)

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

Committing to this repository can be a bit complex as the game files and the environment files are in two different repositories. We'll go over the two methods of commiting to both repositories.

### UAT.js (Under construction)

The UAT.js script is meant to simplify the process of commiting to both repositories.

#### UAT.js Help text

```plaintext
UAT.js - A script to help with git...
  node UAT.js (command) ...

commands:
    update              Update both Choicescript and FINFUATS git repos
    commit              Commit for either Choicescript or FINFUATS git repos (default: FINFUATS)
```

#### Update

This command has no functionality, yet...

#### Commit

This functionality will change in the future, do not use it yet

##### Commit Help Text

```plaintext
UAT.js - A script to help with git...
  node UAT.js commit (command)

commands:
    help		Print this text
    game		Commit to the game sub repo (default when no args passed)
    main		Commit to the main repo
```

##### help
TBW
##### game
TBW
##### main
TBW

### Manual

To commit manually, follow this sections in order.

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

