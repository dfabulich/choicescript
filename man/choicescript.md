% CHOICESCRIPT(1) ChoiceScript Usage

# General Usage


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

    $ choicescript --help
    
or for any command:

    $ choicescript COMMAND --help

## The new command ##


    $ choicescript new NAME
    
Generates a new project. NAME will be the name of the project, although that is currently only used as the name of the directory that will be written.

Additionally one may specify a list of scenes that will be generated in a comma-separated list (without spaces). Each of these will generate a file of that name in the scenes subdirectory and add that scene to the `SceneNavigator` in game.js.

### Options ###

`--no-stats` will skip generating the magical `scenes/choicescript_stats.txt` that represents the stats screne.

`--stats-list <args>` is a rather complex option that allows you to customize what stats will be used in the project. The simplest way is simply to run it with a list of names:
  
    $ choicescript new my_game --stats-list "Wisdom, Strength"
    > Your game has been generated. You can now run it with `choicescript server`.
    $ cat my_game/game.js
    ...
    > stats = {
    >    wisdom: 50
    >    ,strength: 50
    > };
    ...
    $ cat my_game
    > This is a stats screen!
    > 
    > *stat_chart
    > 
    >   percent Wisdom
    >   percent Strength
    
As you can see this will allow you to start writing your game immediately. Stats default to percentages with a value of 50%, however you can customize this with this more complex example:

    $ choicescript new my_game --stats-list "Pet Name:text, Willpower, Magic:opposed_pair(Strength)"                                                                                                                                   
    > Your game has been generated. You can now run it with `choicescript server`.
    $ cat my_game/game.js                                                                                                                                                                                                              
    ...
    > stats = {
    >     pet_name: 50
    >     ,willpower: 50
    >     ,magic: 50
    > };
    ...                                                                                                                                                                                                                 
    $ cat my_game/scenes/choicescript_stats.txt                                                                                                                                                                                        
    > This is a stats screen!
    > 
    > *stat_chart
    > 
    >   text pet_name Pet Name
    >   percent Willpower
    >   opposed_pair Magic
    >     Strength
    
This way we can generate other types. Also the command will automatically transform invalid variable names into variable ones.

# Server Command #

To actually play through your game you will need to run the ChoiceScript server. Simply run:

    $ choicescript server
    > Your game is running on http://localhost:3030/
    
Now you can open http://localhost:3030/ in your browser and play through your game.

You can customize the port this command runs on with the `--port` option (you may want to do this when hosting the game on a server or if the game is clashing with something -- perhaps you would like to have two games running at the same time).

If you pass `--open` on OSX the game should automatically open in your default browser.

# Testing #

The `test` command will run both tests that are provided with default options.

You can also run each command separately with:
  
    $ choicescript quicktest
    $ choicescript randomtest
    
It is quite recommended to run tests with the `-q` option to see only relevant output. 

An interesting argument to `quicktest` is `--watch`: this will monitor your game's directory for changes and run the test anytime you save a file.

See CHOICESCRIPT-TESTING(1) for more details. 