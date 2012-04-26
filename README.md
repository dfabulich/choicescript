# ChoiceScript #

[ChoiceScript](http://www.choiceofgames.com/blog/choicescript-intro/) is a small language written by Dan Fabulich for running multiple choice games.

This is a fork of that project that attempts to bring easier development (especially if you are from a Mac/Unix dev background) to the language.

## Installation ##

Provided you have [npm](http://npmjs.org/) on your system, run:

    $ npm install -g choicescript
    
That's it.

## Usage ##

To create a new game simply run:

    $ choicescript new MyAwesomeGame intro_scene,ending
    
This will create the following project in your current directory (you can omit `intro_scene,ending`, some sample vignettes will be generated for you):

    MyAwesomeGame/
      |- game.js
      `- scenes/
          |- intro_scene.txt
          |- ending.txt
          `- choicescript_stats.txt
          
You can open up your folder and write your game. To run it in a browser use:

    $ choicescript server
    
in the project directory. This will (by default) start your game at http://localhost:3030/.

To test that your game works you can use two types of automated testing:

    $ choicescript quicktest
    $ choicescript randomtest

This runs them both:

    $ choicescript test 
    
Finally remember that you can get help on all the various command and options by typing:

    $ choicescript -h
    
or for any command:

    $ choicescript COMMAND -h

