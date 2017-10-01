nav = {
  nextSceneName: function() { return "";}
}

function autotestScene(text, expectedCoverage, expectedUncovered) {
  stats = {};
  var result = autotester(text);
  deepEqual(result[0], expectedCoverage, "coverage");
  var uncovered = result[1];
  deepEqual(uncovered, expectedUncovered, "uncovered");
}

test("textOnly", function() {
  var scene = "foo\nbar\nbaz";
  autotestScene(scene, [1,1,1,0]);
})
test("unreachable", function() {
  var scene = "foo\n*goto baz\nbar\n*label baz\nbaz";
  autotestScene(scene, [1,1,0,1,1,0], [3]);
})
test("basicIf", function() {
  var scene = ""
    +"\n*temp blah"
    +"\n*set blah 2"
    +"\n*if blah = 2"
    +"\n  *finish"
    +"\n*elseif blah = 3"
    +"\n  *finish"
    +"\n*elseif blah = 4"
    +"\n  *finish"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,0]);
})
test("basicChoice", function() {
  var scene = ""
    +"\nFoo"
    +"\n*choice"
    +"\n  #foo"
    +"\n    *finish"
    +"\n  #bar"
    +"\n    *finish"
    +"\n  #baz"
    +"\n    *finish"
    +"\n  #quz"
    +"\n    *finish"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,1,1,0]);
})
test("gotoChoice", function() {
  var scene = ""
    +"\nFoo"
    +"\n*choice"
    +"\n  #foo"
    +"\n    *goto end"
    +"\n  #bar"
    +"\n    *goto end"
    +"\n  #baz"
    +"\n    *goto end"
    +"\n  #quz"
    +"\n    *goto end"
    +"\n*label end"
    +"\nthe end"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,1,1,1,0]);
})
test("conditionalChoices", function() {
  var scene = ""
    +"\nFoo"
    +"\n*choice"
    +"\n  *if true"
    +"\n    #foo"
    +"\n      *finish"
    +"\n  *if false"
    +"\n    #bar"
    +"\n      *finish"
    +"\n  #baz"
    +"\n      *finish"
    +"\n  #quz"
    +"\n      *finish"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]);
})
test("conditionalChoicesElse", function() {
  var scene = ""
    +"\nFoo"
    +"\n*choice"
    +"\n  *if true"
    +"\n    #foo"
    +"\n      *finish"
    +"\n  *else"
    +"\n    #bar"
    +"\n      *finish"
    +"\n  #baz"
    +"\n      *finish"
    +"\n  #quz"
    +"\n      *finish"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]);
})
test("conditionalChoicesElseIf", function() {
  var scene = ""
    +"\nFoo"
    +"\n*choice"
    +"\n  *if true"
    +"\n    #foo"
    +"\n      *finish"
    +"\n  *elseif false"
    +"\n    #bar"
    +"\n      *finish"
    +"\n  #baz"
    +"\n      *finish"
    +"\n  #quz"
    +"\n      *finish"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]);
})
test("oneLineConditionalChoices", function() {
  var scene = ""
    +"\nFoo"
    +"\n*choice"
    +"\n  *if (true) #foo"
    +"\n      *finish"
    +"\n  *if (false) #bar"
    +"\n      *finish"
    +"\n  #baz"
    +"\n      *finish"
    +"\n  #quz"
    +"\n      *finish"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,1,1,0]);
})
test("choiceInIfList", function() {
  var scene = ""
    +"\n*temp foo"
    +"\n*set foo 1"
    +"\n"
    +"\n*if foo = 1"
    +"\n  1"
    +"\n  1"
    +"\n*if foo = 2"
    +"\n  *choice"
    +"\n    #This"
    +"\n      *finish"
    +"\n    #That"
    +"\n      *finish"
    +"\n*if foo = 3"
    +"\n  3"
    +"\n  3"
    +"\n*if foo = 4"
    +"\n  4"
    +"\n  4"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,0]);
})
test("nestedChoice", function() {
  var scene = ""
    +"\n*temp foo"
    +"\n*set foo 1"
    +"\n"
    +"\n*if foo = 1"
    +"\n  1"
    +"\n  *if foo = 2"
    +"\n    2"
    +"\n  *if foo = 3"
    +"\n    3"
    +"\n"
    +"\n*page_break"
    +"\ndone"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,2,1,3,3,1,0]);
})
test("badElseIf", function() {
  stats = {};
  var scene = ""
    +"\n*temp blah"
    +"\n*set blah 2"
    +"\n*if blah = 2"
    +"\n  two"
    +"\n*elseif blah = 3"
    "+\n  three";
  raises(function() {autotester(scene)}, null, "Fall out of if statement");
})
test("repeatedGosub", function() {
  var scene = ""
    +"\nHi"
    +"\n*gosub foo"
    +"\n*gosub Foo"
    +"\nBye"
    +"\n*finish"
    +"\n*label foo"
    +"\nFoo"
    +"\n*return"
  ;
  autotestScene(scene,  [1,1,2,1,1,1,1,1,1,0]);
})
test("repeatedStatChart", function() {
  var scene = ""
    +"\n*temp x"
    +"\n*set x \"foo\""
    +"\nHi"
    +"\n*stat_chart"
    +"\n  text x"
    +"\n"
    +"\nHello again"
    +"\n"
    +"\n*stat_chart"
    +"\n  text x"
    +"\n"
    +"\nGood bye for now!"
    +"\n"
    +"\nAll done"
  ;
  autotestScene(scene,  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]);
})
test("afterFakeChoice", function() {
  var scene = ""
    +"\n*fake_choice"
    +"\n  #Foo"
    +"\n  #Bar"
    +"\n    Baz"
    +"\nQuz"
  ;
  autotestScene(scene,  [1,1,1,1,1,2,0]);
})
test("ifInChoiceMistakenForRealIf", function() {
  var scene = ""
    +"\n*choice"
    +"\n  #One"
    +"\n    One"
    +"\n    *choice"
    +"\n      #A"
    +"\n        A"
    +"\n        *if false"
    +"\n          impossibleA"
    +"\n          *finish"
    +"\n      *if false"
    +"\n        #B"
    +"\n          impossibleB"
    +"\n          *finish"
    +"\n  #Two"
    +"\n    Two"
    +"\n    *finish"
  ;
  debugger;
  raises(function() {autotester(scene)}, null, "Fall out of *choice statement");
})