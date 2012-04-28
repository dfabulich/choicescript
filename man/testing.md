% CHOICESCRIPT-TESTING(1) Testing ChoiceScript Programms

Testing ChoiceScript Games Automatically
========================================

Multiple-choice games written in ChoiceScript can be very hard to test,
because each `*choice` point can create new variations of the game that
need testing. When testing by hand, it can be hard to be certain whether
some path of choices can cause the game to crash, or whether some
important part of the story can’t be reached at all.

To help with this, we’ve developed two tools that can make debugging
ChoiceScript games considerably easier.

-   **Randomtest**: The Randomtest tool automatically plays your game
    over and over, making random decisions for every choice, and
    generates a “hit count” report, which tells you how many times each
    line of code was used in random play.
-   **Quicktest**: Instead of running the code at random, Quicktest
    attempts to test every `#option` in every `*choice`, and both sides
    of every `*if` statement. In order to do this quickly, Quicktest
    “cheats” by skipping lines that it has already tested.

Both types of tests are necessary. Quicktest can find some bugs that
Randomtest can’t find, and vice versa. Unfortunately, Quicktest can also
find some “fake” bugs — problems with code style that *could* cause a
problem, but don’t actually do any harm for actual players.

1.  Running the Tests
2.  Interpreting Error Messages
3.  Detecting Dead Code
4.  Fake Bugs in Quicktest
5.  Randomtest Game Log
6.  Randomtest Hit Count

Running the Tests
-----------------

On OSX, you’ll need to use the Terminal application. `cd` to your game 
directory and type `choicescript quicktest` or `choicescript randomtest`
to run the tests. You can also type `choicescript test` to run both.

**Quicktest a Single File**: By default, Quicktest attempts to test
every file listed in your `mygame.js` list, but you can also use it to
test just one file at a time. (Testing the whole game can be a waste of
time when you’re only working on one file.) For example, to test a file
called “spaceship.txt”, you can run `choicescript quicktest spaceship`.

**Randomtest Iterations**: By default, Randomtest runs your game 10,000
times. To run Randomtest only 500 times, type `choicescript randomtest 500`.

*Note: Randomtest is not truly random.* In fact, Randomtest’s output is
completely deterministic; if you run it twice in a row, you’ll get
exactly the same results both times. This catches a lot of people by
surprise. (Specifically, Randomtest is using a [pseudo-random number
generator](http://en.wikipedia.org/wiki/Pseudorandom_number_generator)
with a hard-coded “seed” value.)

Doing it this way has one big advantage: if Randomtest fails with an
error and you run it again, it will fail again with the same error. If
you fix a bug and Randomtest passes, you can be sure that you’ve fixed
that problem.

As a result, if you want to run 30,000 random playthroughs with
Randomtest, it won’t work to just run Randomtest three times; you’ll
just play the same 10,000 variations over again. Instead, use the
command above to specify 30,000 iterations instead of 10,000.

Interpreting Error Messages
---------------------------

If Quicktest passes, it will say “QUICKTEST PASSED” on the console. If
not, it will print out a confusing error message! (Our apologies; the
error message could really be much better.)

``

    js: "web/scene.js", line 285: exception from uncaught JavaScript throw: Error: line 16: Non-existent command 'oops'
        at web/scene.js:285 (runCommand)
        at editor/embeddable-autotester.js:141 (test_runCommand)
        at web/scene.js:87 (printLoop)
        at web/scene.js:250 (execute)
        at editor/embeddable-autotester.js:252 (autotester)
        at autotest.js:88

The reason this error message is so bad is because most of it is useless
to ChoiceScript authors but very useful to Choice of Games, the
developers of ChoiceScript.

The worst thing about this error message is that it reports a problem on
“line 285,” which is somewhat true, but not really very true at all,
because that’s line 285 of ChoiceScript itself, the program we provide
to you! In this case, the real problem appears later in the error
message, “line 16.”

In this example, I added a broken line `*oops` on line 16 of a
ChoiceScript file, and this is what it printed out.

If Quicktest (or ChoiceScript) gives you an error message that you can’t
understand, feel free to ask us about it on our Google group. Be sure to
post not only the error message, but also the entire file of code that
causes the problem. If you don’t want to share that much code with the
group, you can also just send the code to us at
support@choiceofgames.com; we’ll do our best to help you out.

Detecting Dead Code
-------------------

But even if Quicktest passes, it may still report a number of lines
untested, e.g.

``

    13 UNTESTED startup
    18 UNTESTED startup
    19 UNTESTED startup

    SOME LINES UNTESTED
    QUICKTEST PASSED

If Quicktest says “SOME LINES UNTESTED,” it means that Quicktest thinks
those lines are completely unreachable. Either those lines are dead
code, or there’s a bug in Quicktest!

For example, here’s a way to introduce dead code without noticing it. We
start with code like this:

``

    *set leadership %+ 20
    *goto big_speech

But then later we realize we also want to decrease `strength`.
Foolishly, we just add a line at the end, like this:

``

    *set leadership %+ 20
    *goto big_speech
    *set strength %-15

That `*set strength %-15` line is dead code; it can never be reached,
because it comes immediately after a `*goto`.

When Quicktest finds dead code, you should fix the problem, either by
deleting the code or by fixing the bug that kills the code. In this
example, we’d probably just move the `*goto` line down to the end.

Note that Quicktest isn’t guaranteed to find all dead code… due to the
way Quicktest “cheats,” it can sometimes reach code that normal human
players can’t reach. Use Randomtest to find some of the other dead code
in this system.

Fake Bugs in Quicktest
----------------------

**tl;dr: You may need to turn some of your `*if` statements into `*else`
statements to get Quicktest to pass.**

Quicktest automatically plays through the code as a normal player would,
but when encountering a `*choice` statement or an `*if` statement,
Quicktest makes multiple copies of itself and attempts to run them. (The
copies run one at a time; for example, we test the `true` lines of an
`*if` statement before we test the `*else` lines.)

To save time, Quicktest “cheats.” If one copy of Quicktest verifies a
line of code, and then a later copy of Quicktest reaches the same line
of code, the second copy of Quicktest will quit, assuming that the
earlier copy of Quicktest has already done its job.

But Quicktest “cheats” in another way, too, by testing both sides of
`*if` statements even if the lines are not actually possible for a
player to reach. This can cause Quicktest to identify “fake” bugs: bugs
that can’t actually happen in real life.

For example, ChoiceScript attempts to guarantee correctness by requiring
every `#option` in a `*choice` statement to end with `*goto` or
`*finish`. Quicktest can help you catch bugs like this:

``

    Example 1 (Buggy)

    *choice
        #Be very naughty.
            Santa refuses to give you a present.
        #Be mostly nice.
            Santa gives you a present reluctantly.
        #Be as nice as can be.
            Santa gives you a present enthusiastically.

    Inside the gift box is a video game!

If ChoiceScript allowed this code, it would create a hard-to-detect bug;
if you’re very naughty, you still get a video game. Instead,
ChoiceScript crashes if you write code like this; Quicktest can detect
the crash automatically, allowing you to catch the bug easily.

You can fix the code like this:

``

    Example 2 (Fixed)

    *choice
        #Be very naughty.
            Santa refuses to give you a present.
            *finish
        #Be mostly nice.
            Santa gives you a present reluctantly.
            *goto present
        #Be as nice as can be.
            Santa gives you a present enthusiastically.

    *label present
    Inside the gift box is a video game!

But now suppose we included an `*if` statement in the middle of this
`*choice`. Suppose we have a `gender` variable, which we set to either
“male” or “female”. Then we might write code like this:

``

    Example 3 (Gender Bug)
    *choice
        #Be very naughty.
            Santa refuses to give you a present.
            *finish
        #Be mostly nice.
            *if gender = "male"
                *goto boy_present
            *if gender = "female"
                *goto girl_present
        #Be as nice as can be.
            Santa gives you a video game.

In fact, this code has a bug, but it might never happen in real life:
what if `gender` is neither “male” nor “female?” For example, in Choice
of the Dragon, your dragon may be “neither” male nor female, or your
gender may be “unknown.”

If a genderless dragon were playing through Example 3, the game would
crash, with the same error as Example 1; Quicktest automatically detects
that.

Here’s how: at the first `*if` statement, Quicktest creates a copy of
itself: it starts with one copy where `gender = "male"`, and then
another copy where `gender != "male"`; that non-male copy then makes a
copy of itself, one where `gender = "female"` and another copy where
`gender != "female"`.

In that final copy, Quicktest tests the case where `gender` is neither
male nor female; since there is no `*goto` or `*finish` in that case,
Quicktest crashes with an error.

But, in your game, you may not actually have any genderless characters.
(It’s understandable; not every game does!) But Quicktest can’t know
that for sure, so Quicktest will say that Example 3 is buggy, even if
there’s a 0% chance of the bug occurring in real life.

You can fix Example 3 with an `*else` statement, which helps Quicktest
to understand that there’s only two possibilities in this case:

``

    Example 4 (Gender Fixed)
    *choice
        #Be very naughty.
            Santa refuses to give you a present.
            *finish
        #Be mostly nice.
            *if gender = "male"
                *goto boy_present
            *else
                *goto girl_present
        #Be as nice as can be.
            Santa gives you a video game.

Here, Quicktest only makes two copies: one where `gender = "male"` and
another where `gender != "male"`. The `*else` guarantees no other
possibilities.

Randomtest Game Log
-------------------

When Randomtest runs, it generates a huge file called
`randomtest-output.txt`. The file is in two parts: the first part of the
file is the “game log” of all 10,000 random playthroughs. The second
part of the file is a “hit count” report, which tells you how many times
each line of code was used (“hit”) in the course of playing the game.

Here’s a sample of the first part of the `randomtest-output.txt` file,
generated from our example game provided with ChoiceScript.

``

        *****0
        startup 42#1 (43)
        startup 46#2 (51)
        animal 19#3 (26)
        variables 24#1 (25)
        variables 33#2 (40)
        *****1
        startup 42#2 (59)
        startup 62#2 (67)
        animal 19#1 (20)
        variables 24#1 (25)
        variables 33#1 (34)
        *****2
        startup 42#1 (43)
        startup 46#3 (55)
        animal 19#2 (22)
        variables 24#1 (25)
        variables 33#2 (40)
        *****3

The `*****` lines tell you when Randomtest finished a playthrough and
started over again on its next playthrough. The other lines specify
which exact choices Randomtest made while playing through the game.

For example, the line `startup 42#1 (43)` says that in the file
`startup.txt` there was a `*choice` on line 42. The rest of the line
indicates which option Randomtest chose, and the line number of that
option. In this example, Randomtest chose option \#1 on line 43. In the
second playthrough, we see `startup 42#2 (59)` which says that
Randomtest instead chose option \#2 on line 59.

Ideally, the last line of randomtest-output.txt says “RANDOMTEST
PASSED.” If not, it contains an error message; see “Interpreting Error
Messages” above for additional details. But note that you can use the
Randomtest log to tell you exactly how to reproduce the bug by hand:
just make the exact same choices that Randomtest did (“option \#1, \#2,
\#3, \#1, \#2 …”) before the error occurred. Reproducing Randomtest bugs
by hand can make them much easier to understand and fix.

Randomtest Hit Count
--------------------

The game log is usually the longest part of `randomtest-output.txt`; the
hit count typically appears way down at the end of the file. The hit
count is a report of how many times Randomtest used (or “hit”) each line
in the game.

For example, here’s a sample from the hit count for the `startup.txt`
example:

``

    startup 10000: Your majesty, your people are starving in the streets, and threaten revolution.
    startup 10000: Our enemies to the west are weak, but they threaten soon to invade.  What will you do?
    startup 10000:
    startup 10000: *choice
    startup 10000:   #Make pre-emptive war on the western lands.
    startup 3418:     If you can seize their territory, your kingdom will flourish.  But your army's
    startup 3418:     morale is low and the kingdom's armory is empty.  How will you win the war?
    startup 3418:     *choice
    startup 3418:       #Drive the peasants like slaves; if we work hard enough, we'll win.
    startup 1133:         Unfortunately, morale doesn't work like that.  Your army soon turns against you
    startup 1133:         and the kingdom falls to the western barbarians.
    startup 1133:         *finish
    startup 3418:       #Appoint charismatic knights and give them land, peasants, and resources.
    startup 1132:         Your majesty's people are eminently resourceful.  Your knights win the day,
    startup 1132:         but take care: they may soon demand a convention of parliament.
    startup 1132:         *finish
    startup 3418:       #Steal food and weapons from the enemy in the dead of night.
    startup 1153:         A cunning plan.  Soon your army is a match for the westerners; they choose
    startup 1153:         not to invade for now, but how long can your majesty postpone the inevitable?
    startup 1153:         *finish
    startup 10000:   #Beat swords to plowshares and trade food to the westerners for protection.
    startup 3278:     The westerners have you at the point of a sword.  They demand unfair terms
    startup 3278:     from you.
    startup 3278:     *choice
    startup 3278:       #Accept the terms for now.
    startup 1601:         Eventually, the barbarian westerners conquer you anyway, destroying their
    startup 1601:         bread basket, and the entire region starves.
    startup 1601:         *finish
    startup 3278:       #Threaten to salt our fields if they don't offer better terms.
    startup 1677:         They blink.  Your majesty gets a fair price for wheat.
    startup 1677:         *finish
    startup 10000:   #Abdicate the throne. I have clearly mismanaged this kingdom!
    startup 3304:     The kingdom descends into chaos, but you manage to escape with your own hide.
    startup 3304:     Perhaps in time you can return to restore order to this fair land.
    startup 3304:     *finish

Randomtest plays 10,000 times by default, so you can see the intro and
the option text was displayed all 10,000 times. There are three options
(“war”, “trade”, and “abdicate”) each of which was hit approximately one
third of the time: Randomtest hit “war” 3,418 times, “trade” 3,278
times, and “abdicate” 3,304 times.

Under “war” there are three sub-options; those options divided the 3,418
“war” hits approximately into thirds: 1,133, 1,132, and 1,153. Under
“trade” there are only two sub-options; those options divided the 3,279
“trade” hits in half: 1,601 and 1,677.

If the hit count report tells you that some lines were hit zero times,
that suggests that the lines might be “dead” code — code that can’t be
reached no matter what choices the player makes. However, code with 0
hits doesn’t guarantee that the code is dead — it could just be very
difficult to reach.

If you find code that’s hard to reach, you’ll have to decide for
yourself whether that indicates you have a bug. For example, in the
traditional “Choose Your Own Adventure” books, it was very hard to reach
a “good” ending; most endings had a bad outcome (e.g. death). On the one
hand, that might be a good thing, if it encourages players to try again;
on the other hand, it might be frustrating to keep reaching bad endings.

To pick another example, if your choices have “right” and “wrong”
answers (e.g. if your game has a lot of puzzles in it), Randomtest may
tell you that it’s very unlikely to win your game when playing randomly.
But that may be ideal; if you can beat the game just by random choices,
your puzzles may be too easy!

When interpreting the hit count report, remember that you can divide the
hit count by 10,000 to get the percentage likelihood of hitting a given
line. If a line is hit less than 100 times, then there’s less than 1%
chance of hitting the line at random. If that’s too low in your opinion,
consider sculpting your game balance to allow more players to reach that
code.