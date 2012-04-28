% CHOICESCRIPT-SYNTAX(1) | About the ChoiceScript Language

Introduction to ChoiceScript
============================

A basic guide to the ChoiceScript programming language. Please post on
the [ChoiceScript google
group](http://groups.google.com/group/choicescript) if you have
questions about this document.

What is ChoiceScript?
---------------------

ChoiceScript is a simple programming language for writing
multiple-choice games (MCGs) like [Choice of the
Dragon](http://www.choiceofgames.com/dragon/). Writing games with
ChoiceScript is easy and fun, even for authors with no programming
experience.

Trying it out
-------------

To begin, [download the ChoiceScript source from
GitHub](http://github.com/dfabulich/choicescript/zipball/master),
extract the zip file, and open the `web/index.html` file. The game will
immediately begin.

(You can also use the [ChoiceScript github
page](http://github.com/dfabulich/choicescript) to browse our files,
file bugs, or receive notifications when we update ChoiceScript.)

Your First Scene: `*choice` and `*finish`
-----------------------------------------

Here’s a simple scene written in ChoiceScript. You can find it in
`web/mygame/startup.txt`.

``

      Your majesty, your people are starving in the streets, and threaten revolution.
      Our enemies to the west are weak, but they threaten soon to invade.  What will you do?

      *choice
        #Make pre-emptive war on the western lands.
          If you can seize their territory, your kingdom will flourish.  But your army's
          morale is low and the kingdom's armory is empty.  How will you win the war?
          *choice
            #Drive the peasants like slaves; if we work hard enough, we'll win.
              Unfortunately, morale doesn't work like that.  Your army soon turns against you
              and the kingdom falls to the western barbarians.
              *finish
            #Appoint charismatic knights and give them land, peasants, and resources.
              Your majesty's people are eminently resourceful.  Your knights win the day,
              but take care: they may soon demand a convention of parliament.
              *finish
            #Steal food and weapons from the enemy in the dead of night.
              A cunning plan.  Soon your army is a match for the westerners; they choose
              not to invade for now, but how long can your majesty postpone the inevitable?
              *finish
        #Beat swords to plowshares and trade food to the westerners for protection.
          The westerners have you at the point of a sword.  They demand unfair terms
          from you.
          *choice
            #Accept the terms for now.
              Eventually, the barbarian westerners conquer you anyway, destroying their
              bread basket, and the entire region starves.
              *finish
            #Threaten to salt our fields if they don't offer better terms.
              They blink.  Your majesty gets a fair price for wheat.
              *finish
        #Abdicate the throne. I have clearly mismanaged this kingdom!
          The kingdom descends into chaos, but you manage to escape with your own hide.
          Perhaps in time you can return to restore order to this fair land.
          *finish

As you can see, the `*choice` command presents the user with a list of
options; the result of choosing each option appears indented right below
the option (in an “indented block”).

If you go to play this scene, you’ll first be presented with three
options:

1.  Make pre-emptive war on the western lands.
2.  Beat swords to plowshares and trade food to the westerners for
    protection.
3.  Abdicate the throne. I have clearly mismanaged this kingdom!

If you choose option \#1, you get to choose how to win the war. If you
choose option \#2, you may decide how to negotiate with the westerners.
If you choose option \#3, the scene ends with no additional choices.

As you can see, there’s a lot you can do with just the `*choice` command
and the `*finish` command. Indeed, using only these two commands and a
lot of time, you could develop an entire “Choose Your Own Adventure”
book!

Go On, Play with It!
--------------------

Try opening up `web/mygame/startup.txt` in a simple text editor like
Notepad or TextEdit. If you change the text, save the file, and refresh
the `web/mygame/index.html` page in your browser, you should be able to
see the effect of your changes immediately.

Indentation
-----------

Note that indentation in ChoiceScript is mandatory. Without those spaces
for indentation, we would have no way to tell the difference between
options nested within other choices and options on the main menu.

You can indent blocks using spaces or with the Tab character (but not
both in the same file). You can use any number of spaces you want, but
you must be consistent. Code like this is not allowed:

``

    *choice
        #Hold 'em.
            He calls; you win!
            *finish
          #Fold 'em.
            Better luck next time.
            *finish

Option 1 has four spaces, but Option 2 has six spaces; since these don’t
line up, ChoiceScript will display an error message if you try to write
scenes like this.

Reusing Code: Goto and Label
----------------------------

ChoiceScript provides a way to jump around in a scene besides just
making choices. You can use the `*goto` command to jump to any line in
the scene, as long as you first put a `*label` on the line you want to
reach.

``

      What kind of animal will you be?
      *choice
        #Lion
          *goto claws
        #Tiger
          *label claws
          In that case, you'll have powerful claws and a mighty roar!
          *finish
        #Elephant
          Well, elephants are interesting animals, too.
          *finish

When we reach the line `*goto claws`, we automatically jump to the line
`*label claws`. You may create as many labels as you like, and use
`*goto` to reach any of them.

Note that every indented (nested) block must conclude with either a
`*finish` command (which ends the scene) or a `*goto` line which jumps
to another line in the scene.

(You can also reuse code with the `*goto_scene` command, described later
in this document.)

Setting and Checking Variables
------------------------------

In ChoiceScript, you can use variables to make scenes and decisions more
interesting than a “Choose Your Own Adventure” book.

To use a variable, you must begin by defining it and setting it, like
this:

``

      *temp leadership
      *set leadership 20

**TODO: Discuss `*create` vs. `*temp`.** We will probably remove the
`*create` command in the future, replacing it with something in
`mygame.js`; we should document what the new thing will be. (The basic
idea is that `*temp` variables only last for the current scene, whereas
permanent variables persist through the entire game.)

Once a variable has been set, you can check the value of the variable
like this:

``

      #Run for class president
        *if leadership > 15
          You win the election.
          *finish
        You lose the election.
        *finish

In this case, leadership is just set to 20, so the player is sure to win
the election. But you can choose to give the player a different amount
of leadership depending on the player’s earlier choices. Using
variables, the player’s earlier leadership choices can have an effect on
the story later in the game.

You can also add leadership points to the current number of leadership
points, like this:

``

      *set leadership +20

This would add 20 points to the player’s current leadership score. It’s
the same thing as writing `*set leadership leadership+20`. You can also
subtract points with “-”, multiply with “\*” or divide with “/”.

If you need to use multiple operators at once (e.g. you need to do both
division and addition), you must use parentheses, like this:
`*set honesty (leadership + manners)*2`. You may not omit the
paretheses, even though it’s perfectly understandable arithmetic:
`*set honesty leadership + manners / 2`.

You can also show the player’s current leadership score by using `${}`
(a dollar sign followed by curly braces), like this:

``

      Your leadership score is: ${leadership}

By the way, variables aren’t just for numbers. You can also put text in
a variable by using quotation marks:

``

      *set lover_name "Jamie"

### Using `*else` and `*elseif` to Improve Readability

We can rewrite the leadership example above to use the `*else` command;
this will make it easier to read.

``

      #Run for class president
        *if leadership > 15
          You win the election.
          *finish
        *else
          You lose the election.
          *finish

This does exactly the same thing as before, but using `*else` makes it
clearer that only one of these two options is possible, just by
indenting the code.

You can also use the `*elseif` command to define three possible
branches, like this:

``

      #Run for class president
        *if leadership > 25
          You win the election by a landslide!
          *finish
        *elseif leadership > 15
          You win the election, but just barely.
          *finish
        *else
          You lose the election.
          *finish

You can also display variables on the stats screen, available when you
click the “Show Stats” button. There’s a lot to discuss there, see below for more details.
What Happens When We `*finish`?
-------------------------------

When we `*finish`, we move on to the next scene in the game. This is
defined in a file called `mygame.js`. Here’s an example:

      // Specify the list of scenes here, separated by commas, with no final comma

      nav = new SceneNavigator([
          "startup"
          ,"animal"
          ,"variables"
          ,"ending"
          ,"death"

      ]);

      // Specify the default starting stats here

      stats = {
          leadership: 50
          ,strength: 50
      };

      // Specify the stats to use in debug mode

      debugStats = {
          leadership: 50
          ,strength: 50
      };

      // or just use defaults
      // debugStats = stats

The first section defines the scene “navigator,” which describes how we
move from scene to scene. If you `*finish` in the “startup” scene, we’ll
move right ahead to the “animal” scene, then the “variables” scene.
Finally, we reach the ending scene. Here’s an example ending scene:

      This is the last scene!  The game is over!

      *ending

That final `*ending` command instructs the game to insert a “Play Again”
button at the end of the scene. If you choose to “Play Again”, the game
will begin again at the “startup” scene.

**WARNING**: mygame.js is likely to change considerably very soon. It’s
currently the absolute minimum amount of code that could possibly work;
we’d like it to be in a nicer format that looks more like ChoiceScript
and less like JavaScript.

(Note that Choice of the Dragon doesn’t even have a `mygame.js` file;
that feature was developed after CotD was released. You can see
something similar in its `index.html` file.)

You’re not required to use `*finish` to move on to the next scene; you
can also jump to any scene in the game using `*goto_scene`. Here’s an
example:

      #Lift weights
        *if strength > 15
          You lift the weights.
          *finish
        You drop the weights and hurt yourself badly.  You never recover.

        *goto_scene death

When this happens, we jump directly to the death scene. This allows you
to provide a standard “death” message without copying and pasting all
over the game.

Examples
--------

Here some example scenes from Choice of the Dragon. Please don’t copy
their code without explicit permission from Choice of Games.

-   startup
-   [queenpolitics](http://www.choiceofgames.com/dragon/scenes/queenpolitics.txt)

Using mygame.js to Create Variables
-----------------------------------

`*create` is deprecated. As we mentioned above, you may create a
temporary variable with `*temp`, but such a temporary variable only
lasts for the current vignette. Once you transition into a new scene, a
`*temp` variable is forgotten by game.

Instead, of `*create`, you should use mygame.js to define and establish
the baseline for variables that will be used in multiple vignettes. In
the section that starts with `stats = {`, you should list the variables
and their starting value. A very simple game’s variable section might
look like this:

`stats = {`

        leadership: 50
        ,strength: 50
        ,willpower: 1
        ,wounds: 0
        ,met_princess: false

};

As you might have surmised, Leadership and Strength will be percentage
variables which start at 50; Willpower will be a numerical variable that
starts at 1, and Wounds at 0. Met\_princess will be a boolean that
starts at false.

There is no limit to the number of variables you can create in
mygame.js. Obviously, you should not have a variable in mygame.js and
then use `*temp` to create one with the same name in a vignette.

Let Us Host Your ChoiceScript Games
-----------------------------------

Have you finished writing a game? Choice of Games encourages you to
[submit your finished ChoiceScript game to
us](http://www.choiceofgames.com/make-your-own-games/let-us-host-your-choicescript-games/)
so that we can host it for you publicly; we’ll give you a share of the
revenue your game produces.


Advanced Choicescript
=====================

More Commands
-------------

-   `*image`: This command inserts an image. Place the image in the
    “mygame” folder, and type the name of the image file, like this:

    ``

          *image beauty.jpg

    If you like, you can specify the alignment ("left" or "right") after
    the image name, like this:

    ``

          *image beauty.jpg left

    By default, the image appears centered on a line by itself, but if
    you align the image left or right, the text will flow around the
    image. (In CSS terms, the image will "float" left or right.)

-   `*comment`: This command does nothing; any text you put after
    `*comment` will be ignored. It's helpful to put remarks in the text
    that only the author should read.

    ``

          *comment TODO We should make this scene more interesting!

-   `*page_break`: Put in a "Next" button with no radio buttons. The
    game will continue on the subsequent page.

    ``

          You turn the corner slowly.  Blood rushes through your ears.  As you open the door...
          *page_break
          ... the masked murderer attacks!

-   `*line_break`: Put just one line break in your text, like a `<br>`
    in HTML. ChoiceScript automatically converts single line breaks to
    spaces, and double line breaks to paragraphs.

    ``

          So
          this
          is
          all
          one
          line.

          But this is a new paragraph.

          And this
          *line_break
          is two lines.

    That code would display like this:

    > So this is all one line
    >
    > But this is a new paragraph.
    >
    > And this\
    > is two lines

-   `*input_text`: Provides a text box for the user to specify the value
    of a variable, e.g. the user's name.

    ``

          Please enter your name.
          *input_text name

          Your name is ${name}

-   `*input_number`: Just like `*input_text`, but only numbers are
    allowed in the text box. Specify a variable name as well as a
    minimum and a maximum.

    ``

          How many coins?
          *input_text coins 0 30

          You asked for ${coins} coins.

-   `*fake_choice`: This convenience command behaves exactly like
    `*choice`, but no commands are allowed in the body of the choice;
    thus no `*goto`/`*finish` is required.

    ``

          What color do you prefer?

          *fake_choice
            #Red
              Red is the color of roses.
            #Blue
              Blue is the color of the sea.
            #Green
              Green is the color of spring.

          What an excellent choice!  And what flavor of ice cream would you like?

          *fake_choice
            #Vanilla
            #Chocolate
            #Strawberry

          Mmm, delicious!
          *finish

-   `*rand`: Set a variable to a random number. You set the minimum and
    maximum, we do the rest. For example, this would set the variable
    `die_roll` to a value from 1 to 6 inclusive: ``

          *rand die_roll 1 6

    Beware! It can be very hard to adequately test games that use
    randomness.

-   `*stat_chart`: Use this command to create a table of stats, suitable
    for displaying when the player clicks the "Show Stats" button. This
    command is so complicated it deserves a page all by itself.
    [Customizing the ChoiceScript Stats
    Screen](http://www.choiceofgames.com/blog/customizing-the-choicescript-stats-screen/)
-   `*ending`: Use this command to insert a "Play Again" button; when
    the player clicks that button, all stats will reset and the game
    will start over from the beginning. (The `*ending` command is very
    different from the `*finish` command; `*finish` adds a "Next
    Chapter" button, and does not reset anything.)
-   `*share_this_game`: Use this command to invite the player to share
    your game on Facebook, Twitter, StumbleUpon, etc. On iPhone/Android,
    `*share_this_game` will invite the user to rate/review the game.
    Therefore, **be cautious in how you use this command.** We recommend
    using `*share_this_game` at the end of the game, and only when the
    player has reached a "good" ending. Don't use the command if the
    player has reached a "bad" ending (e.g. if they have just died).
    Players who reach good endings tend to give positive reviews;
    players who reach bad endings tend to give negative reviews.

Advanced Techniques
-------------------

Labeled buttons: By default, `*finish` buttons say "Next Chapter" and
`*page_break` buttons say "Next". You can make the button say something
else, instead:

``

      *page_break On with the show!
      *finish The show is over!

Conditional options: This advanced technique lets you show/hide some
options based on the player's variables.

``

      How will you handle this?
      *choice
        #Try to talk them out of it.
          They cannot be dissuaded.
          *finish
        #Force them to relent.
          They back down, for now.
          *finish
        *if (president) #Abuse my presidential powers to silence them
          This works; you will never hear from them again.
          *finish

In this case, players have the option to abuse their presidential power
only if they are president; if they are not president, then the option
is completely hidden. (Note that the parentheses around "president" are
required.)

You can also use nested blocks of conditionals, but this technique is
pretty advanced; it's hard to get the indentation exactly right.

``

      *choice
        #Rattle my saber.
          They rattle back.
          *finish
        *if republican
          *if president
            #Declare open war.
              Congress refuses to approve funding.
              *finish
          *else
            #Ask other Republicans to help out.
              Talk radio is on your side.
              *finish
        *else
          *if president
            #Work with the United Nations.
              Russia vetoes your plan.
              *finish
          *else
            #Ask other Democrats to help out.
              They do their best, but the party is divided.
              *finish

Unselectable options: Instead of hiding options, you can disable
options, making them unselectable.

``

      How will you handle this?
      *choice
        #Try to talk them out of it.
          They cannot be dissuaded.
          *finish
        #Force them to relent.
          They back down, for now.
          *finish
        *selectable_if (president) #Abuse my presidential powers to silence them
          This works; you will never hear from them again.
          *finish

If you aren't president, you'll see the option to abuse presidential
power, but it will appear in grey; it won't highlight if you click on
it. This gives players a hint that if they play the game again, they
might be able to choose that option, by making different choices earlier
on.

Hiding used options: Sometimes you just need to hide an option after
you've used it. You can do it the hard way, like this:

``

      *temp unused_1
      *temp unused_2
      *set unused_1 true
      *set unused_2 true
      *label start
      *choice
        *if (unused_1) #One.
          *set unused_1 false
          The loneliest number that you'll ever do.
          *goto start
        *if (unused_2) #Two.
          *set unused_2 false
          Two can be as bad as one.
          *goto start
        #I can't decide!
          Well, think it over.
          *goto start
        #Done.
          OK!
          *finish

But there's an easier way. You can use the `*hide_reuse` command to mark
commands as non-reusable. You can use it in the middle of a `*choice`,
like this:

``

      *label start
      *choice
        *hide_reuse #One.
          The loneliest number that you'll ever do.
          *goto start
        *hide_reuse #Two.
          Two can be as bad as one.
          *goto start
        #I can't decide!
          Well, think it over.
          *goto start
        #Done.
          OK!
          *finish

Or you can make all options non-reusable, by adding `*hide_reuse` to the
top of your ChoiceScript file. Then you can use the `*allow_reuse`
command to allow certain options to be reused.

``

      *hide_reuse
      *label start
      *choice
        #One.
          The loneliest number that you'll ever do.
          *goto start
        #Two.
          Two can be as bad as one.
          *goto start
        *allow_reuse #I can't decide!
          Well, think it over.
          *goto start
        #Done.
          OK!
          *finish

You can also use the `*disable_reuse` command instead of `*hide_reuse`
to disable used options; instead of hiding them, the disabled options
will be greyed out and unselectable.

Fairmath: ChoiceScript includes two rather strange operators
specifically for use on variables that are percentages, called "%+" and
"%-". You use them like this:

``

      *set leadership 50
      *set leadership %+ 20
      *set leadership %- 40

The "%+" and "%-" operators are called the "fairmath" operators. The
idea is that as your leadership score gets higher, it becomes harder to
increase, and easier to decrease. According to fairmath:

Fair Addition: `(x %+ y) = (x + (100-x)*(y/100))`

-   Large scores are hard to increase: `(90 %+ 20) = (90 + 2) = 92`
-   Small scores are easy to increase: `(10 %+ 20) = (10 + 18) = 28`

Fair Subtraction: `(x %- y) = (x - x*(y/100))`

-   Large scores are easy to decrease: `(90 %- 20) = (90 - 18) = 72`
-   Small scores are hard to decrease: `(10 %- 20) = (10 - 2) = 8`

50 is equally easy to increase or decrease.

-   `(50 %+ 20) = (50 + 10) = 60`
-   `(50 %- 20) = (50 - 10) = 40`

Fairmath is great in expressions like: `*set leadership %+ 20`. The
player will get anywhere from 0 to 20 more points of leadership,
depending on how high leadership is currently.

Integer math: You can round a variable to the nearest integer using
`round()`. For example, this will set the variable "foo" to 3:
`*set foo round(2.5)`

You can also use the [modulo
operator](http://en.wikipedia.org/wiki/Modulo_operation) "%" to
calculate the remainder after taking a division. Modulo is pretty weird,
but it's has two particularly interesting uses. First, you can check
whether a number X is evenly divisible by a number Y by checking whether
`X % Y = 0`. Second, you can use it to get the fractional part of a
number X, the stuff that comes after the decimal point, by calculating
`X % 1`. For example, `3.14 % 1 = 0.14`.

Advanced `*if` statements: You can do a lot more with `*if` statements
than `leadership > 15`. Here's a few tricks:

-   Equality and Inequality
    -   Equal to: `leadership = 40` (Is leadership equal to forty?)
    -   Not equal to: `leadership != 40` (Is leadership different from
        forty?)
    -   Greater than: `leadership >40` (Is leadership greater than
        forty?)
    -   Less than: `leadership <40` (Is leadership less than forty?)
    -   Greater than OR equal to: `leadership >=50` (Is leadership
        greater than or equal to fifty?)
    -   Less than OR equal to: `leadership <=40` (Is leadership less
        than or equal to forty?)

-   And/or/not (with mandatory parentheses)
    -   And: `(leadership > 30) and (strength > 40)`
    -   Or: `(leadership > 60) or (strength > 70)`
    -   Not: `not(strength > 70)`
    -   Complex parentheses:
        `((leadership > 60) and (agility > 20)) or (strength > 80)`

-   Comparing text:
    -   `lover_name = "Jamie"`
    -   `"2" = 2` (this is true!)

-   Setting variables to `true` or `false`:
    -   `*set finished false`
    -   `*set correct guess = "blue"`

Text tricks:

-   Capitalize: You can capitalize just the first letter of a variable
    like this: `Behold! $!{He} is capitalized.` You can also capitalize
    an entire word like this: `PRESIDENT $!!{name} RESIGNS IN SHAME`
-   Concatenation: You can join text together like this:
    `*set murder "red"&"rum"`. You can use variables in the same way:
    `*set title "Dr. " & last_name`
-   Quotes: You can put quotes in your text by using backslashes, like
    this:

          *set joke "she said it was "ironic"!"

    If you write `${joke}`, you'll get:\

    > she said it was "ironic"!

-   Backslashes: You can put backslashes in your text by using even more
    backslashes, like this:

          *set slashy "Here's one backslash: \ and here's two backslashes: \\"

    If you write `${slashy}`, you'll get:\

    > Here's one backslash: and here's two backslashes: \\

-   `*print`: This command is no longer necessary; it just prints the
    value of the variable you specify. Use `${}` variable substitution
    instead.

Subroutines: Instead of the `*goto` command, you can use the `*gosub`
command to go to a label, and then use the `*return` command to jump
back to the line where you called `*gosub`.

``

      *choice
        #Happy.
          You're happy!
          *gosub saying
          Hopefully, you'll be happy for a very long time!
          *finish
        #Sad.
          You're sad.
          *gosub saying
          Maybe you'll be happier soon!
          *finish
      *label saying
      This, too, shall pass.
      *return

If you choose "Happy," the game will write:\

> You're happy! This, too, shall pass. Hopefully, you'll be happy for a
> very long time!

It's great for snippets of code that you would have copied and pasted
all over the place.

"Subroutines" are tiny sub-programs that you run in the middle of your
program. `*gosub` is so-called because it activates a subroutine. It is
possible to nest subroutines, by using `*gosub` twice or more before
using `*return` command.

``

      Start One,
      *gosub two
      End One.
      *finish

      *label two
      Start Two,
      *gosub three
      End Two.
      *return

      *label three
      Three.
      *return

That code would display:\

> Start One, Start Two, Three. End Two. End One.

WARNING: Generally speaking, the simpler your ChoiceScript is, the
better. It's possible to abuse `*gosub` to create extremely complex
programs. This is rarely a good idea; complex games aren't any more fun
than simple games, but complex games are a lot harder to make. If you
think you need a lot of subroutines, consider whether your game might be
better if it were simpler.

Truly bizarre references: Probably only programmers will appreciate
these. Beware! They add complexity without adding much value.

-   `*setref`: Set a variable by name, e.g. `*setref "leadership" 30`
    sets leadership to 30. Use it in crazy code like this:\
     ``

          *set virtue "courage"
          *setref virtue 30

    This code would set `courage` to 30. If this still doesn't seem
    useful, consider that `virtue` could have been determined by earlier
    choices, so it might have set `honesty` to 30 instead.

    Still not convinced? Don't worry about it; you'll probably never
    need it.

-   `*gotoref`: Goto a label by name, like this:\
     ``

          *temp superpower
          *set superpower "invisibility"
          Your super power is:
          *gotoref superpower
          flight!
          *finish
          *label invisibility
          invisibility.

-   Curly parens: Put some text in curly braces and we'll turn it into
    the value of the named variable.\
     ``

          *set honesty 30
          *set virtue "honesty"
          *set score {virtue}
          Your ${virtue} score is ${score}

    This would print:\

    > Your honesty score is 30


Customizing the ChoiceScript Stats Screen
=========================================

Most of our games have a “Show Stats” button (Choice of the Dragon has a
“My Dragon” button) showing some of the stats applying to your
character.

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.35.03-.png.pagespeed.ce.ZOEamYiLVh.png "Example 1")

This document describes how to build a stat screen in games you’re
writing in ChoiceScript.

Don’t Start Here!
-----------------

Be sure to read our basic [ChoiceScript
Introduction](http://www.choiceofgames.com/blog/choicescript-intro) page
before reading this advanced documentation.

Create a Stat Chart
-------------------

**tl;dr: Try experimenting with the “choicescript\_stats.txt” file.**

The essence of the stat screen is the “stat chart,” which you can create
using the `*stat_chart` command. The chart shows the value of any number
of ChoiceScript variables; if the values are numbers between 1 and 100,
you can display them as bars on the chart.

Let’s suppose you’ve got three variables:

-   the “name” variable, which contains the player’s name (e.g. “Dan”)
-   the “leadership” variable, which contains a Leadership score between
    1-100
-   the “strength” variable, which contains a Strength score between
    1-100

You could use the \*stat\_chart command like this:

``

    *stat_chart
      text name
      percent leadership
      percent strength

That would display a stat chart like this:

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.20.37-.png.pagespeed.ce.48VorFd32P.png "Example 2")

Note that when we want to display the value of the variable as text, we
write `text` before the variable; when we want to display the variable
as a percentage bar, we write `percent` before the variable.

If you don’t like the percentage bars, you can use text for everything,
in which case we’ll display the number as a numeral:

``

    *stat_chart
      text name
      text leadership
      text strength

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.52.10-.png.pagespeed.ce.-OohMGwTDY.png "Example 1.5")

The “Show Stats” Button
-----------------------

You can use the `*stat_chart` in any ChoiceScript vignette; it’s just
like any other command. For example, it’s nice to display a stat chart
at the end of the game, to give players a sense of closure and
accomplishment.

But the most interesting place to use `*stat_chart` is in a specially
named file called `choicescript_stats.txt`.

`choicescript_stats.txt` is a ChoiceScript vignette file, just like
`startup.txt` or any other file you create. When the player clicks the
“Show Stats” button, we pause the current ChoiceScript scene and display
the `choicescript_stats.txt` scene; when you finish that scene, we
resume the scene previously in action.

Most of the time, the `choicescript_stats.txt` file contains almost
nothing except the `*stat_chart`, but you may feel free to experiment
with including other text in that file, especially if you want to
include some information about the character that shouldn’t appear in a
data chart.

Label the Stats Poetically
--------------------------

In the previous example, the chart displayed “name”, “leadership” and
“strength” all in lower case; normally values like this should be in
“Title Case” (like the headline of a newspaper article).

You can capitalize the names of your variables any way you like, for
example:

``

    *stat_chart
      text Name
      percent LEADERSHIP
      percent sTrEnGtH

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.20.46-.png.pagespeed.ce.eUKBOX4SMC.png "Example 3")

That’s because, in ChoiceScript, variables are case-insensitive, so
“strength” and “sTrEnGtH” mean the same thing.

But you can also give the variables different names. Perhaps you want to
use more poetic labels, so instead of “Strength” you want to call it
“Thews and Sinews”; instead of “Leadership” you want to call it
“Serpent’s Tongue;” instead of “Name” you want to call it “Nom de
Guerre.” You can write that like this:

``

    *stat_chart
      text name Nom de Guerre
      percent leadership Serpent's Tongue
      percent strength Thews and Sinews

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.20.58-.png.pagespeed.ce.lvIxapSJZU.png "Example 4")

Display Opposed Pairs on the Chart
----------------------------------

In some of our games, we say that two variables are “opposed;” e.g.
Brutality is the opposite of Finesse, Cunning is the opposite of Honor,
and Disdain is the opposite of Vigilance.

However, in our ChoiceScript code, we really only have three variables:
“brutality,” “cunning,” and “disdain.” When we say “Honor increases” we
simply decrease Cunning.

We can use these variables to display opposed pairs on the chart, like
this:

``

    *stat_chart
      opposed_pair Brutality
        Finesse
      opposed_pair Cunning
        Honor
      opposed_pair Disdain
        Vigilance

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.21.06-.png.pagespeed.ce.iUkHkAqLUp.png "Example 5")

Again, note that “Finesse,” “Honor,” and “Vigilance” don’t really exist
as variables in ChoiceScript, so we can write anything we like here. For
example, we could have called Vigilance “Eye of the Dragon.”

However, if you need to use a poetic label for the LEFT side of the
chart, you’ll need to write your chart a little differently:

``

    *stat_chart
      opposed_pair strength
        Thews and Sinews
        Fragile Bones
      opposed_pair leadership
        Serpent's Tongue
        Minion's Obeisance

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.21.20-.png.pagespeed.ce.OCZvoMIKrf.png "Example 6")

In this case, the first indented line is the left-side label, and the
second indented line is the right-side label. If there’s only one
indented line, then we assume it’s the right-side label.

It’s perfectly fine to have some variables that are opposed next to some
other values that aren’t. For example, in Dragon, “Infamy” is not
opposed by anything, so we can write our chart like this:

``

    *stat_chart
      opposed_pair Brutality
        Finesse
      opposed_pair Cunning
        Honor
      opposed_pair Disdain
        Vigilance
      percent Infamy

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.21.26-.png.pagespeed.ce.vX1RwNaKuV.png "Example 7")

**NOTE: Some people have expressed confusion about how opposed variables
are displayed.** I think of them as bar charts; in the above example,
the top bar is mostly red, because the dragon has 85% Brutality and 15%
Finesse.

But some people look at the chart and see the opposite; they imagine
that the chart is like a needle on a speedometer gauge; when the needle
points all the way to “Finesse,” the dragon has lots of Finesse. Those
people look at the chart and incorrectly think that the dragon has 85%
Finesse! I think this is a bug in the way we display stats; I hope to
fix it in a future version of ChoiceScript.

Use Temp Variables for Weird Values
-----------------------------------

In Choice of the Dragon, we keep track of wounds as a simple number 0-4,
but display it as text, like this:

-   Wounds=0: Uninjured
-   Wounds=1: Battle-scarred
-   Wounds=2: Permanently wounded
-   Wounds=3: Permanently weakened
-   Wounds=4: At Death’s door

The way we do that is by creating a temporary variable to hold the text
describing your wounds, like this:

``

    *temp wound_text
    *if wounds = 0
      *set wound_text "Uninjured"
      *goto chart
    *elseif wounds = 1
      *set wound_text "Battle-scarred"
      *goto chart
    *elseif wounds = 2
      *set wound_text "Permanently wounded"
      *goto chart
    *elseif wounds = 3
      *set wound_text "Permanently weakened"
      *goto chart
    *else
      *set wound_text "At Death's door"
    *label chart

    *stat_chart
      text wound_text Wounds

Adding Stat Definitions
-----------------------

**WARNING: This feature is somewhat advanced, and may not have been a
very good idea. If you feel a need to define your stats, it may be a
sign that they aren’t named very well; maybe you’re being a bit *too*
poetic.**

Stat charts can include definitions for any line on the chart; just
include a definition indented underneath the line in the \*stat\_chart
command.

``

    *stat_chart
      text name Nom de Guerre
        Your new name as a clan member
      percent leadership Serpent's Tongue
        Ability to convince others to follow you
      percent strength Thews and Sinews
        Endurance and strength of arms

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.21.36-.png.pagespeed.ce.NdirMKoU3R.png "Example 8")

That gets a bit more complicated when you want to define opposed pairs
with definitions; you have to do it like this:

``

    *stat_chart
      opposed_pair Brutality
        Brutality
          Strength and cruelty
        Finesse
          Precision and aerial maneuverability
      opposed_pair Cunning
        Cunning
          Intelligence and trickery
        Honor
          Honesty and trustworthiness
      opposed_pair Disdain
        Disdain
          Patience and scorn
        Vigilance
          Attention and impulsiveness

![image](http://www.choiceofgames.com/wp-content/uploads/2010/12/Screen-shot-2010-12-21-at-17.21.44-.png.pagespeed.ce.uubwJVYDoS.png "Example 9")

Examples
--------

Here are some example `choicescript_stats.txt` files:

[Choice of
Broadsides](http://www.choiceofgames.com/broadsides/scenes/choicescript_stats.txt)
stat screen

[Choice of
Romance](http://www.choiceofgames.com/romance/scenes/choicescript_stats.txt)
stat screen

[Choice of the
Vampire](http://www.choiceofgames.com/vampire/scenes/choicescript_stats.txt)
stat screen


