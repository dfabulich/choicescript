doh = {
    is: function(expected, actual, message){
        if (expected != actual) deepEqual(actual, expected, message);
    },
    assertError: function(type, obj, method, args, message) {
        raises(function() {obj[method].apply(obj, args)}, null, message);
    }
};


module("FullScene");

test("error increasing indent", function() {
    var text = "foo\n  bar";
    var scene = new Scene();
    scene.loadLines(text);
    raises(function() {scene.execute();}, null, "Illegally increased indentation");
})

test("errorInvalidCommand", function() {
    var text = "foo\n*bar";
    var scene = new Scene();
    scene.loadLines(text);
    raises(function() {scene.execute()}, null, "Invalid command");
})
test("labelGoto", function() {
    printed = [];
    var text = "foo\n*goto foo\nskip me!\n*label foo\nbar";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo bar </p>", "printed value");
})
test("gotoRef", function() {
    printed = [];
    var text = "foo\n*temp x\n*set x \"foo\"\n*gotoref x\nskip me!\n*label foo\nbar";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo bar </p>", "printed value");
})
test("mixedCaseLabels", function() {
    printed = [];
    var text = "foo\n*goto foo\nskip me!\n*Label Foo\nbar";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo bar </p>", "printed value");
})
test("finish", function() {
    printed = [];
    var text = "foo\n*finish\nskip me!";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo </p>", "printed value");
})

module("OptionParsing");

test("single", function() {
    var text = "*choice\n  #foo\n    Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
})
test("singleTabs", function() {
    var text = "*choice\n\t#foo\n\t\tFoo!\n\t#bar\n\t\tBar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
})
test("blankLine", function() {
    var text = "*choice\n  #foo\n    Foo!\n\n    Foo, I say!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":5},{"name":"bar","line":6,"group":"choice","endLine":7}], options, "options");
})
test("singlePrint", function() {
    var text = "*choice\n  #foo\n    Foo!\n  *print \"#ba\"&\"r\"\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
})
test("simpleConditionalTrue", function() {
    var text = "*choice\n  *if true\n    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:4,name:"foo",line:3},{group:"choice",endLine:6,name:"bar",line:5}], options, "options");
})
test("oneLineConditionalTrue", function() {
    var text = "*choice\n  *if (true) #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:3,name:"foo",line:2},{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("unselectable", function() {
    var text = "*choice\n  *selectable_if (false) #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:3,unselectable:true,name:"foo",line:2},{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("nonUnselectable", function() {
    var text = "*choice\n  *selectable_if (true) #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:3,name:"foo",line:2},{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("simpleConditionalFalse", function() {
    var text = "*choice\n  *if false\n    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:6,name:"bar",line:5}], options, "options");
})
test("oneLineConditionalFalse", function() {
    var text = "*choice\n  *if (false)    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("simpleConditionalElseTrue", function() {
    var text = "*choice\n  *if true\n    #foo\n      Foo!\n  *else\n    #fail\n      Fail!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:4,name:"foo",line:3},{group:"choice",endLine:9,name:"bar",line:8}], options, "options");
})
test("simpleConditionalElseFalse", function() {
    var text = "*choice\n  *if false\n    #fail\n      Fail!\n  *else\n    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:7,name:"foo",line:6},{group:"choice",endLine:9,name:"bar",line:8}], options, "options");
})
test("nestedConditionalTrue", function() {
    var text = "*choice\n  *if true\n    *if true\n        #foo\n          foo\n          *finish\n    #bar\n      bar\n      *finish";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:6,name:"foo",line:4},{group:"choice",endLine:9,name:"bar",line:7}], options, "options");
})
test("multi", function() {
    var text = 
        "*choice color toy\n"+
        "  #red\n"+
        "    #spaceship\n"+
        "      Red spaceship\n"+
        "    #yo-yo\n"+
        "      Red yo-yo\n"+
        "  #blue\n"+
        "    #spaceship\n"+
        "      Blue spaceship\n"+
        "    #yo-yo\n"+
        "      Blue yo-yo\n"+
        "baz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, ["color", "toy"]);
    var expected = [
        {"name":"red","line":2,"group":"color","endLine":6,
            "suboptions":[
                {"name":"spaceship","line":3,"group":"toy","endLine":4},
                {"name":"yo-yo","line":5,"group":"toy","endLine":6}
            ]
        },
        {"name":"blue","line":7,"group":"color","endLine":11,
            "suboptions":[
                {"name":"spaceship","line":8,"group":"toy","endLine":9},
                {"name":"yo-yo","line":10,"group":"toy","endLine":11}
            ]
        }
    ];
    doh.is(expected, options, "options");
})

test("multi partially unselectable", function() {
    var text = 
        "*choice color toy\n"+
        "  #red\n"+
        "    #spaceship\n"+
        "      Red spaceship\n"+
        "    #yo-yo\n"+
        "      Red yo-yo\n"+
        "  #blue\n"+
        "    #spaceship\n"+
        "      Blue spaceship\n"+
        "    *selectable_if (false) #yo-yo\n"+
        "      Blue yo-yo\n"+
        "baz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, ["color", "toy"]);
    var expected = [
        {"name":"red","line":2,"group":"color","endLine":6,
            "suboptions":[
                {"name":"spaceship","line":3,"group":"toy","endLine":4},
                {"name":"yo-yo","line":5,"group":"toy","endLine":6}
            ]
        },
        {"name":"blue","line":7,"group":"color","endLine":11,
            "suboptions":[
                {"name":"spaceship","line":8,"group":"toy","endLine":9},
                {"name":"yo-yo","line":10,unselectable:true,"group":"toy","endLine":11}
            ]
        }
    ];
    doh.is(expected, options, "options");
})

test("errorInvalidIndent", function() {
    var text = "*choice\n    #foo\n  #bar";
    var scene = new Scene();
    scene.loadLines(text);
    //var options = scene.parseOptions(0, []);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Invalid indent");
})
test("errorTabMixing", function() {
    var text = "*choice\n\t #foo\n\t\tFoo!\n\t#bar\n\t\tBar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
})
test("errorTabFirstSpaceLater", function() {
    var text = "*choice\n\t#foo\n        Foo!\n\t#bar\n\t\tBar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
})
test("errorSpaceFirstTabLater", function() {
    var text = "*choice\n    #foo\n\t\tFoo!\n\t#bar\n\t\tBar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
})
test("errorNoChoices", function() {
    var text = "*choice\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    //var options = scene.parseOptions(0, []);
    doh.assertError(Error, scene, "parseOptions", [0, []], "No options");
})
test("errorNoBody", function() {
    var text = "*choice\n  #foo\n  #bar";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Expected choice body");
})
test("errorNoBodyOneChoice", function() {
    var text = "*choice\n  #foo\nbar";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Expected choice body");
})
test("errorNoBodyMultiChoice", function() {
    var text = "*choice one two\n  #foo\n    #x\n  #bar\n    #x\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, ["one", "two"]], "Expected choice body");
})
test("errorNonOverlappingMultiChoice", function() {
    var text = 
        "*choice color toy\n"+
        "  #red\n"+
        "    #wagon\n"+
        "      Red spaceship\n"+
        "    #yo-yo\n"+
        "      Red yo-yo\n"+
        "  #blue\n"+
        "    #spaceship\n"+
        "      Blue spaceship\n"+
        "    #truck\n"+
        "      Blue yo-yo\n"+
        "baz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, ["color", "toy"]], "Mismatched suboptions");
})
test("errorNonOverlappingMultiChoice2", function() {
    var text = 
        "*choice color toy\n"+
        "  #red\n"+
        "    #wagon\n"+
        "      Red spaceship\n"+
        "    #yo-yo\n"+
        "      Red yo-yo\n"+
        "  #blue\n"+
        "    #spaceship\n"+
        "      Blue spaceship\n"+
        "    #truck\n"+
        "      Blue yo-yo\n"+
        "    #wagon\n"+
        "      Blue wagon\n"+
        "baz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, ["color", "toy"]], "Mismatched suboptions");
})
test("errorDupes", function() {
    var text = "*choice\n  #foo\n    Foo!\n  #foo\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Duplicate options");
})
test("errorNoSelectable", function() {
    var text = "*choice\n  *selectable_if (false) #foo\n      Foo!\n  *selectable_if (false) #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "No selectable options");
})

module("Random");

test("testInt", function() {
    var stats = {test:null};
    var scene = new Scene("test", stats);
    var minPassed = maxPassed = false;
    for (var i = 0; !(minPassed && maxPassed) && i < 10000; i++) {
        scene.rand("test 1 6");
        var value = stats.test;
        if (value == 1) minPassed = true;
        if (value == 6) maxPassed = true;
    }
    ok(minPassed, "minPassed");
    ok(maxPassed, "maxPassed");
})
test("testDecimal", function() {
    var stats = {test:null};
    var scene = new Scene("test", stats);
    var minPassed = maxPassed = false;
    for (var i = 0; !(minPassed && maxPassed) && i < 10000; i++) {
        scene.rand("test 1.0 6.0");
        var value = stats.test;
        if (value < 1.01) minPassed = true;
        if (value > 5.99) maxPassed = true;
    }
    ok(minPassed, "minPassed");
    ok(maxPassed, "maxPassed");
})

module("Set")


test("setTemp", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo\n*set foo 2");
    scene.execute();
    doh.is(2, scene.temps.foo, "scene.temps.foo");
})
test("mixedCaseVariable", function() {
    var scene = new Scene();
    scene.loadLines("*temp Foo\n*set foo 2");
    scene.execute();
    doh.is(2, scene.temps.foo, "scene.temps.foo");
})
test("deleteTemp", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo\n*set foo 2\n*delete foo");
    scene.execute();
    doh.is("undefined", typeof scene.temps.foo, "typeof scene.temps.foo");
})
test("setStat", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines("*create foo 0\n*set foo 2");
    scene.execute();
    doh.is(2, scene.stats.foo, "scene.stats.foo");
})
test("deleteStat", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines("*create foo 0\n*set foo 2\n*delete foo");
    scene.execute();
    doh.is("undefined", typeof scene.stats.foo, "typeof scene.stats.foo");
})
test("setTempOverridingStat", function() {
    printed = [];
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines("*create foo 0\n*set foo 2\n*temp foo\n*set foo 3\n*print foo");
    scene.execute();
    doh.is(2, scene.stats.foo, "scene.stats.foo");
    doh.is(3, scene.temps.foo, "scene.temps.foo");
    doh.is("<p>3 </p>", printed.join(""), "printed");
})
test("deleteTempOverridingStat", function() {
    printed = [];
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines("*create foo 0\n*set foo 2\n*temp foo\n*set foo 3\n*delete foo\n*print foo");
    scene.execute();
    doh.is(2, scene.stats.foo, "scene.stats.foo");
    doh.is("undefined", typeof scene.temps.foo, "typeof scene.temps.foo");
    doh.is("<p>2 </p>", printed.join(""), "printed");
})
test("implicitVariable", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo 0\n*set foo 2\n*set foo+2");
    scene.execute();
    doh.is(4, scene.temps.foo, "scene.temps.foo");
})
test("errorInvalidVariable", function() {
    var scene = new Scene();
    scene.loadLines("*set 1 2");
    doh.assertError(Error, scene, "execute", null, "Invalid variable");
})
test("errorNoVariable", function() {
    var scene = new Scene();
    scene.loadLines("*set () ()");
    doh.assertError(Error, scene, "execute", null, "No variable");
})
test("errorNoExpression", function() {
    var scene = new Scene();
    scene.loadLines("*set foo");
    doh.assertError(Error, scene, "execute", null, "No expression");
})
test("setRef", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo 0\n*temp bar 0\n*set foo \"bar\"\n*setref foo 2");
    scene.execute();
    doh.is(2, scene.temps.bar, "scene.temps.bar");
})
test("setByRef", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo 0\n*temp bar 0\n*set foo \"bar\"\n*set {foo} 2");
    scene.execute();
    doh.is(2, scene.temps.bar, "scene.temps.bar");
})
test("setArray", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo \"foo\"\n*temp foo_1 0\n*set foo[1] 2");
    scene.execute();
    doh.is(2, scene.temps.foo_1, "scene.temps.foo_1");
})
test("setMultidimensionalArray", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo \"foo\"\n*temp foo_1_1 0\n*set foo[1][1] 2");
    scene.execute();
    doh.is(2, scene.temps.foo_1_1, "scene.temps.foo_1_1");
})
test("errorSetRefNoExpression", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo 0\n*temp bar 0\n*set foo \"bar\"\n*setref foo");
    doh.assertError(Error, scene, "execute", null, "No expression");
})
test("setRefWhitespace", function() {
    var scene = new Scene();
    scene.loadLines("*temp foo 0\n*temp bar 0\n*set foo \"bar\"\n*setref foo(2)");
    scene.execute();
    doh.is(2, scene.temps.bar, "scene.temps.bar");
    //doh.assertError(Error, scene, "execute", null, "No expression");
})

module("If");

test("basic", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if true\n  Truthy\n  *finish\n*else\n  Falsish\n  *finish");
    scene.execute();
    doh.is("<p>Truthy </p>", printed.join(""), "Wrong printed value");
})
test("extraLineBreak", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if true\n\n  Truthy\n  *finish\n*else\n  Falsish\n  *finish");
    scene.execute();
    doh.is("<p>Truthy </p>", printed.join(""), "Wrong printed value");
})
test("testElse", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if false\n  Truthy\n  *finish\n*else\n  Falsish\n  *finish");
    scene.execute();
    doh.is("<p>Falsish </p>", printed.join(""), "Wrong printed value");
})
test("testElseExtraLineBreak", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if false\n  Truthy\n  *finish\n*else\n\n  Falsish\n  *finish");
    scene.execute();
    doh.is("<p>Falsish </p>", printed.join(""), "Wrong printed value");
})
test("testElseIfTrue", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if false\n  Truthy\n  *finish\n*elseif true\n  Elsey\n  *finish\n*else\n  Falsish\n  *finish");
    scene.execute();
    doh.is("<p>Elsey </p>", printed.join(""), "Wrong printed value");
})
test("testElseIfFalse", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if false\n  Truthy\n  *finish\n*elseif false\n  Elsey\n  *finish\n*else\n  Falsish\n  *finish");
    scene.execute();
    doh.is("<p>Falsish </p>", printed.join(""), "Wrong printed value");
})
test("testDoubleElseIf", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if false\n  Truthy\n  *finish\n*elseif false\n  Elsey\n  *finish\n*elseif true\n  Double Elsey\n  *finish\n*else\n  Falsish\n  *finish");
    scene.execute();
    doh.is("<p>Double Elsey </p>", printed.join(""), "Wrong printed value");
})
test("nested", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if true\n  *if true\n    Truthy\n*label end");
    scene.execute();
    doh.is("<p>Truthy </p>", printed.join(""), "Wrong printed value");
})
test("errorNonNestedElse", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if true\n  OK\n  *if false\n    Fail\n*else\n  Fail");
    doh.assertError(Error, scene, "execute", null, "fall into else");
})
test("nestedExtraLineBreak", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines("*if true\n  *if true\n    Truthy\n\n  Still Truthy\n*label end");
    scene.execute();
    doh.is("<p>Truthy </p><p>Still Truthy </p>", printed.join(""), "Wrong printed value");
})
test("errorDrift", function() {
    var scene = new Scene();
    scene.loadLines("*if true\n        drift\n      drift\n    drift\n  drift");
    //TODO drift detection
    //doh.assertError(Error, scene, "execute", null, "drifting");
})

module("Complex Choice");

test("trueNestedIf", function() {
    var text = "*choice\n  #foo\n    Foo!\n  *if true\n    #bar\n      Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is(([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":5,"group":"choice","endLine":6}]), (options), "options");
})
test("falseNestedIf", function() {
    var text = "*choice\n  #foo\n    Foo!\n  *if false\n    #bar\n      Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is(([{"name":"foo","line":2,"group":"choice","endLine":3}]), (options), "options");
})
test("trueNestedElse", function() {
    var text = "*choice\n  #foo\n    Foo!\n    *finish\n  *if true\n    #bar\n      Bar!\n      *finish\n  *else\n    #baz\n      Baz!\n      *finish\nbaz\n";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"bar","line":6,"group":"choice","endLine":8}], options, "options");
})
test("falseNestedElse", function() {
    var text = "*choice\n  #foo\n    Foo!\n    *finish\n  *if false\n    #bar\n      Bar!\n      *finish\n  *else\n    #baz\n      Baz!\n      *finish\nbaz\n";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","group":"choice","line":2,"endLine":4},{"name":"baz","group":"choice","line":10,"endLine":12}], options, "options");
})
test("twoFalseNestedElses", function() {
    var text = "*choice\n"+
    "  #foo\n"+
    "    Foo!\n"+
    "    *finish\n"+
    "  *if false\n"+
    "    #bar\n"+
    "      Bar!\n"+
    "      *finish\n"+
    "    *goto end\n"+
    "  *else\n"+
    "    #baz\n"+
    "      Baz!\n"+
    "      *finish\n"+
    "  *if false\n"+
    "    #qoo\n"+
    "      Qoo!\n"+
    "      *finish\n"+
    "    *goto end\n"+
    "  *else\n"+
    "    #quz\n"+
    "      Quz!\n"+
    "*label end\n"+
    "baz";
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"baz","line":11,"group":"choice","endLine":13},{"name":"quz","line":20,"group":"choice","endLine":21}], options, "options");
})
// TODO add drift detection
// test("errorTwoFalseNestedElses", function() {
//             var text = "*choice\n"+
//             "  #foo\n"+
//             "    Foo!\n"+
//             "  *if false\n"+
//             "    #bar\n"+
//             "      Bar!\n"+
//             "    *goto end\n"+
//             "  *else\n"+
//             "    #baz\n"+
//             "      Baz!\n"+
//             "  *if false\n"+
//             "    #qoo\n"+
//             "      Qoo!\n"+
//             "    *goto end\n"+
//             "  *else\n"+
//             "    #quz\n"+
//             "      Quz!\n"+
//             "      *goto end\n"+
//             "   #sheesh\n"+ // misindented = 3
//             "     Sheesh!\n"+
//             "*label end\n"+
//             "baz";
//             var scene = new Scene();
//             scene.loadLines(text);
//             doh.assertError(Error, scene, "parseOptions", [0, []], "misindented");
//         })

module("Standard Resolution");

test("single", function() {
    printed = [];
    var text = "*choice\n  #foo\n    Foo!\n    *finish\n  #bar\n    Bar!\n    *finish\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"bar","line":5,"group":"choice","endLine":7}], options, "options");
    scene.standardResolution(options[0]);
    doh.is("<p>Foo! </p>", printed.join(""), "printed");
})
test("saveAndRestore", function() {
    printed = [];
    var text = "*choice\n  #foo\n    Foo!\n    *finish\n  #bar\n    Bar!\n    *finish\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.resetPage = function() {};
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"bar","line":5,"group":"choice","endLine":7}], options, "options");
    scene.standardResolution(options[0]);
    var scene2 = new Scene();
    scene2.loadLines(text);
    scene2.temps = scene.temps;
    scene2.stats = scene.stats;
    scene2.lineNum = scene.lineNum;
    scene2.indent = scene.indent;
    scene2.execute();
    doh.is("<p>Foo! </p>", printed.join(""), "printed");
})
test("saveAndRestoreGoSub", function() {
    printed = [];
    var text = "start\n*gosub subroutine\nend\n*finish\n*label subroutine\n*choice\n  #foo\n    Foo!\n    *return\n  #bar\n    Bar!\n    *return\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
        this.paragraph();
    };
    scene.resetPage = function() {};
    scene.execute();
    doh.is([{group:"choice",endLine:9,name:"foo",line:7},{group:"choice",endLine:12,name:"bar",line:10}], options, "options");
    scene.standardResolution(options[0]);
    var scene2 = new Scene();
    scene2.loadLines(text);
    scene2.temps = scene.temps;
    scene2.stats = scene.stats;
    scene2.lineNum = scene.lineNum;
    scene2.indent = scene.indent;
    scene2.execute();
    doh.is("<p>start </p><p>Foo! end </p>", printed.join(""), "printed");
})
test("extraLineBreak", function() {
    printed = [];
    var text = "*choice\n  #foo\n\n    Foo!\n    *finish\n  #bar\n    Bar!\n    *finish\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":5},{"name":"bar","line":6,"group":"choice","endLine":8}], options, "options");
    scene.standardResolution(options[0]);
    doh.is("<p>Foo! </p>", printed.join(""), "printed");
})
test("fake", function() {
    printed = [];
    var text = "*fake_choice\n  #foo\n    Foo!\n  #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
    scene.standardResolution(options[0]);
    doh.is("<p>Foo! baz </p>", printed.join(""), "printed");
})
test("fakeFollowedByBlank", function() {
    printed = [];
    var text = "*fake_choice\n  #foo\n    Foo!\n  #bar\n    Bar!\n\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
    scene.standardResolution(options[0]);
    doh.is("<p>Foo! </p><p>baz </p>", printed.join(""), "printed");
})
test("fakeNoBody", function() {
    printed = [];
    var text = "*fake_choice\n  #foo\n  #bar\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":2},{"name":"bar","line":3,"group":"choice","endLine":3}], options, "options");
    scene.standardResolution(options[0]);
    doh.is("<p>baz </p>", printed.join(""), "printed");
})
test("unselectableFake", function() {
    printed = [];
    var text = "*fake_choice\n  #foo\n    Foo!\n  *selectable_if (false) #bar\n    Bar!\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","unselectable":true,"endLine":5}], (options), "options");
    scene.standardResolution(options[0]);
    doh.is("<p>Foo! baz </p>", printed.join(""), "printed");
})
test("unselecteableFakeNoBody", function() {
    printed = [];
    var text = "*fake_choice\n  #foo\n  *selectable_if (false) #bar\nbaz";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":2},{"name":"bar","line":3,"group":"choice","unselectable":true,"endLine":3}], (options), "options");
    scene.standardResolution(options[0]);
    doh.is("<p>baz </p>", printed.join(""), "printed");
})
/*test("choiceTemp", function() {
    printed = [];
    var text = "*choice\n  #foo\n    Foo!\n    *goto end\n  #bar\n    Bar!\n*label end\n*print choice_1";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    var formValues = {choice:0};
    scene.getFormValue = function(name) {return formValues[name];}
    scene.reset = function() {};
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"bar","line":5,"group":"choice","endLine":6}], options, "options");
    scene.resolveChoice(options,groups);
    doh.is("<p>Foo! foo </p>", printed.join(""), "printed");
})*/
test("fallingChoices", function() {
    printed = [];
    var text = "*choice\n"+
    "   #foo\n"+
    "       Foo\n"+
    "       *finish\n"+
    "   #bar\n"+
    "       Bar\n"+
    "baz\n"+
    "*choice\n"+
    "   #one\n"+
    "       one\n"+
    "       *finish\n"+
    "   #two\n"+
    "       two";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"bar","line":5,"group":"choice","endLine":6}], options, "options");
    scene.standardResolution(options[1]);
    doh.is([{"name":"one","line":9,"group":"choice","endLine":11},{"name":"two","line":12,"group":"choice","endLine":13}], options, "options");
    scene.standardResolution(options[1]);
    doh.is("<p>Bar baz two </p>", printed.join(""), "printed");
})

module("Reuse Options");

test("modifiers", function() {
    printed = [];
    var text = ""
      +"*label start\n"
      +"What do you want to do?\n"
      +"*choice\n"
      +"  *hide_reuse #A little of this.\n"
      +"    You do some of this.\n"
      +"    *goto start\n"
      +"  *disable_reuse #A little of that.\n"
      +"    You do some of that.\n"
      +"    *goto start\n"
      +"  *allow_reuse #Let me think about it a little longer.\n"
      +"    Very well.\n"
      +"    *goto start\n"
      +"  #What was the question?\n"
      +"    Quit stalling!\n"
      +"    *goto start  \n"
      +"  #Nothing; I'm done.\n"
      +"    OK!\n"
      +"    *finish\n";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
        this.paragraph();
    };
    scene.execute();
    doh.is([
      {reuse:"hide",group:"choice",endLine:6,name:"A little of this.",line:4},
      {reuse:"disable",group:"choice",endLine:9,name:"A little of that.",line:7},
      {group:"choice",endLine:12,name:"Let me think about it a little longer.",line:10},
      {group:"choice",endLine:15,name:"What was the question?",line:13},
      {group:"choice",endLine:19,name:"Nothing; I\'m done.",line:16}], options, "options");
    scene.standardResolution(options[0]);
    doh.is([
      {reuse:"disable",group:"choice",endLine:9,name:"A little of that.",line:7},
      {group:"choice",endLine:12,name:"Let me think about it a little longer.",line:10},
      {group:"choice",endLine:15,name:"What was the question?",line:13},
      {group:"choice",endLine:19,name:"Nothing; I'm done.",line:16}], options, "options2");
    scene.standardResolution(options[0]);
    var expected = [
      {reuse:"disable",group:"choice",endLine:9,unselectable:true,name:"A little of that.",line:7},
      {group:"choice",endLine:12,name:"Let me think about it a little longer.",line:10},
      {group:"choice",endLine:15,name:"What was the question?",line:13},
      {group:"choice",endLine:19,name:"Nothing; I\'m done.",line:16}
    ];
    doh.is(expected, options, "options3");
    scene.standardResolution(options[1]);
    doh.is(expected, options, "options4");
    scene.standardResolution(options[2]);
    doh.is(expected, options, "options5");
    doh.is("<p>What do you want to do? </p><p>You do some of this. "
      +"What do you want to do? </p><p>You do some of that. "
      +"What do you want to do? </p><p>Very well. "
      +"What do you want to do? </p><p>Quit stalling! "
      +"What do you want to do? </p>", trim(printed.join("")), "printed");
})
test("hideByDefault", function() {
    printed = [];
    var text = "*hide_reuse\n"
      +"*label start\n"
      +"What do you want to do?\n"
      +"*choice\n"
      +"  *hide_reuse #A little of this.\n"
      +"    You do some of this.\n"
      +"    *goto start\n"
      +"  *disable_reuse #A little of that.\n"
      +"    You do some of that.\n"
      +"    *goto start\n"
      +"  *allow_reuse #Let me think about it a little longer.\n"
      +"    Very well.\n"
      +"    *goto start\n"
      +"  #What was the question?\n"
      +"    Quit stalling!\n"
      +"    *goto start  \n"
      +"  #Nothing; I'm done.\n"
      +"    OK!\n"
      +"    *finish\n";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
        this.paragraph();
    };
    scene.execute();
    doh.is([
      {reuse:"hide",group:"choice",endLine:7,name:"A little of this.",line:5},
      {reuse:"disable",group:"choice",endLine:10,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"hide",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"hide",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}], options, "options");
    scene.standardResolution(options[0]);
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"hide",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"hide",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}], options, "options2");
    scene.standardResolution(options[0]);
    var beforeHiding = [
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"hide",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"hide",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}
    ];
    doh.is(beforeHiding, options, "options3");
    scene.standardResolution(options[1]); // Let me think
    doh.is(beforeHiding, options, "options4");
    scene.standardResolution(options[2]); // What was the question?
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"hide",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}], options, "options5");
    doh.is("<p>What do you want to do? </p><p>You do some of this. "
      +"What do you want to do? </p><p>You do some of that. "
      +"What do you want to do? </p><p>Very well. "
      +"What do you want to do? </p><p>Quit stalling! "
      +"What do you want to do? </p>", trim(printed.join("")), "printed");
})
test("disableByDefault", function() {
    printed = [];
    var text = "*disable_reuse\n"
      +"*label start\n"
      +"What do you want to do?\n"
      +"*choice\n"
      +"  *hide_reuse #A little of this.\n"
      +"    You do some of this.\n"
      +"    *goto start\n"
      +"  *disable_reuse #A little of that.\n"
      +"    You do some of that.\n"
      +"    *goto start\n"
      +"  *allow_reuse #Let me think about it a little longer.\n"
      +"    Very well.\n"
      +"    *goto start\n"
      +"  #What was the question?\n"
      +"    Quit stalling!\n"
      +"    *goto start  \n"
      +"  #Nothing; I'm done.\n"
      +"    OK!\n"
      +"    *finish\n";
    var scene = new Scene();
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
        this.paragraph();
    };
    scene.execute();
    doh.is([
      {reuse:"hide",group:"choice",endLine:7,name:"A little of this.",line:5},
      {reuse:"disable",group:"choice",endLine:10,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"disable",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"disable",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}], (options), "options");
    scene.standardResolution(options[0]);
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"disable",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"disable",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}], (options), "options2");
    scene.standardResolution(options[0]);
    var beforeHiding = [
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"disable",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"disable",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}
    ];
    doh.is(beforeHiding, (options), "options3");
    scene.standardResolution(options[1]); // Let me think
    doh.is(beforeHiding, options, "options4");
    scene.standardResolution(options[2]); // What was the question?
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"disable",group:"choice",endLine:16,unselectable:true,name:"What was the question?",line:14},
      {reuse:"disable",group:"choice",endLine:20,name:"Nothing; I\'m done.",line:17}], options, "options5");
    doh.is("<p>What do you want to do? </p><p>You do some of this. "
      +"What do you want to do? </p><p>You do some of that. "
      +"What do you want to do? </p><p>Very well. "
      +"What do you want to do? </p><p>Quit stalling! "
      +"What do you want to do? </p>", trim(printed.join("")), "printed");
})

module("Tokenizer");

var tokenizerTests = {
    '3': [{"value":"3","name":"NUMBER","pos":1}]
    ,"{\"fo\"&\"o\"}": [{"value":"{","name":"OPEN_CURLY","pos":1},{"value":"\"fo\"","name":"STRING","pos":5},{"value":"&","name":"OPERATOR","pos":6},{"value":"\"o\"","name":"STRING","pos":9},{"value":"}","name":"CLOSE_CURLY","pos":10}]
    ,'3.0': [{"value":"3.0","name":"NUMBER","pos":3}]
    ,'bar="blah"': [{"value":"bar","name":"VAR","pos":3},{"value":"=","name":"EQUALITY","pos":4},{"value":"\"blah\"","name":"STRING","pos":10}]
    ,'foo=2': [{"value":"foo","name":"VAR","pos":3},{"value":"=","name":"EQUALITY","pos":4},{"value":"2","name":"NUMBER","pos":5}]
    
    ,'foo%+50': [{"value":"foo","name":"VAR","pos":3},{"value":"%+","name":"FAIRMATH","pos":5},{"value":"50","name":"NUMBER","pos":7}]
    ,'"2"/2': [{"value":"\"2\"","name":"STRING","pos":3},{"value":"/","name":"OPERATOR","pos":4},{"value":"2","name":"NUMBER","pos":5}]
    ,'(foo=2) or (foo=3)': [{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"foo","name":"VAR","pos":4},{"value":"=","name":"EQUALITY","pos":5},{"value":"2","name":"NUMBER","pos":6},{"value":")","name":"CLOSE_PARENTHESIS","pos":7},{"value":"or","name":"NAMED_OPERATOR","pos":10},{"value":"(","name":"OPEN_PARENTHESIS","pos":12},{"value":"foo","name":"VAR","pos":15},{"value":"=","name":"EQUALITY","pos":16},{"value":"3","name":"NUMBER","pos":17},{"value":")","name":"CLOSE_PARENTHESIS","pos":18}]
    ,'foo': [{"value":"foo","name":"VAR","pos":3}]
    ,'"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"': [{"value":'"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"',"name":"STRING","pos":42}]
    ,'2<=1': [{"value":"2","name":"NUMBER","pos":1},{"value":"<=","name":"INEQUALITY","pos":3},{"value":"1","name":"NUMBER","pos":4}]
    ,'8/2': [{"value":"8","name":"NUMBER","pos":1},{"value":"/","name":"OPERATOR","pos":2},{"value":"2","name":"NUMBER","pos":3}]
    ,'(true) and (false)': [{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"true","name":"VAR","pos":5},{"value":")","name":"CLOSE_PARENTHESIS","pos":6},{"value":"and","name":"NAMED_OPERATOR","pos":10},{"value":"(","name":"OPEN_PARENTHESIS","pos":12},{"value":"false","name":"VAR","pos":17},{"value":")","name":"CLOSE_PARENTHESIS","pos":18}]
    ,'foo-3': [{"value":"foo","name":"VAR","pos":3},{"value":"-","name":"OPERATOR","pos":4},{"value":"3","name":"NUMBER","pos":5}]
    ,'((foo>4) and (foo<8)) or (bar=0)': [{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"(","name":"OPEN_PARENTHESIS","pos":2},{"value":"foo","name":"VAR","pos":5},{"value":">","name":"INEQUALITY","pos":6},{"value":"4","name":"NUMBER","pos":7},{"value":")","name":"CLOSE_PARENTHESIS","pos":8},{"value":"and","name":"NAMED_OPERATOR","pos":12},{"value":"(","name":"OPEN_PARENTHESIS","pos":14},{"value":"foo","name":"VAR","pos":17},{"value":"<","name":"INEQUALITY","pos":18},{"value":"8","name":"NUMBER","pos":19},{"value":")","name":"CLOSE_PARENTHESIS","pos":20},{"value":")","name":"CLOSE_PARENTHESIS","pos":21},{"value":"or","name":"NAMED_OPERATOR","pos":24},{"value":"(","name":"OPEN_PARENTHESIS","pos":26},{"value":"bar","name":"VAR","pos":29},{"value":"=","name":"EQUALITY","pos":30},{"value":"0","name":"NUMBER","pos":31},{"value":")","name":"CLOSE_PARENTHESIS","pos":32}]
    ,'&"blah blah"': [{"value":"&","name":"OPERATOR","pos":1},{"value":"\"blah blah\"","name":"STRING","pos":12}]
    ,'{"fo"&"o"}': [{"value":"{","name":"OPEN_CURLY","pos":1},{"value":"\"fo\"","name":"STRING","pos":5},{"value":"&","name":"OPERATOR","pos":6},{"value":"\"o\"","name":"STRING","pos":9},{"value":"}","name":"CLOSE_CURLY","pos":10}]
    ,'2*3': [{"value":"2","name":"NUMBER","pos":1},{"value":"*","name":"OPERATOR","pos":2},{"value":"3","name":"NUMBER","pos":3}]
    ,'3%2': [{name:"NUMBER",value:"3",pos:1},{name:"OPERATOR",value:"%",pos:2},{name:"NUMBER",value:"2",pos:3}]
    ,'not(false)': [{name:"FUNCTION",value:"not(",pos:4,func:"not"},{name:"VAR",value:"false",pos:9},{name:"CLOSE_PARENTHESIS",value:")",pos:10}]
    ,'round(1.5)': [{name:"FUNCTION",value:"round(",pos:6,func:"round"},{name:"NUMBER",value:"1.5",pos:9},{name:"CLOSE_PARENTHESIS",value:")",pos:10}]
}

var tokenizerErrorTests = ['"foo'];

(function(){
for (var key in tokenizerTests) {
    var expected = tokenizerTests[key];
    test(key, function() {
        var scene = new Scene();
        var actual = scene.tokenizeExpr(key);
        if (toJson(actual) != toJson(expected)) {
            print(toJson(actual));
            print(toJson(expected));
        }
        deepEqual(actual, expected);
    })
}
})();

(function(){
for (var i = 0; i < tokenizerErrorTests.length; i++) {
    var name = tokenizerErrorTests[i];
    test(name + " error", function() {
        var scene = new Scene();
        //print(str);
        raises(function() {scene.tokenizeExpr(name)}, null, "Invalid expression");
    })
}
})();

module("Expression Evaluator");

test("simpleValue", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("3");
    doh.is([{"value":"3","name":"NUMBER","pos":1}], stack, "stack");
    var actual = scene.evaluateExpr(stack);
    doh.is(3, actual, 3);
})
test("simpleParenthetical", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("(3)");
    //print(toJson(stack))
    doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"3","name":"NUMBER","pos":2},{"value":")","name":"CLOSE_PARENTHESIS","pos":3}], stack, "stack");
    var actual = scene.evaluateExpr(stack);
    doh.is(3, actual, 3);
})
test("twoPlusTwo", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("2+2");
    //print(toJson(stack))
    doh.is([{"value":"2","name":"NUMBER","pos":1},{"value":"+","name":"OPERATOR","pos":2},{"value":"2","name":"NUMBER","pos":3}], stack, "stack");
    var actual = scene.evaluateExpr(stack);
    doh.is(4, actual, 4);
})
test("twoPlusTwoParenthetical", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("(2+2)");
    //print(toJson(stack))
    doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"2","name":"NUMBER","pos":2},{"value":"+","name":"OPERATOR","pos":3},{"value":"2","name":"NUMBER","pos":4},{"value":")","name":"CLOSE_PARENTHESIS","pos":5}], stack, "stack");
    var actual = scene.evaluateExpr(stack);
    doh.is(4, actual, 4);
})
test("errorSimpleParentheticalMissingClose", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("(3");
    //print(toJson(stack))
    doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"3","name":"NUMBER","pos":2}], stack, "stack");
    doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
})
test("errorTwoPlusTwoParentheticalMissingClose", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("(2+2");
    //print(toJson(stack))
    doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"2","name":"NUMBER","pos":2},{"value":"+","name":"OPERATOR","pos":3},{"value":"2","name":"NUMBER","pos":4}], stack, "stack");
    doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
})
test("twoPlusTwoParentheticalMissingCloseWrongToken", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("(2+2 4");
    //print(toJson(stack))
    doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"2","name":"NUMBER","pos":2},{"value":"+","name":"OPERATOR","pos":3},{"value":"2","name":"NUMBER","pos":4},{"value":"4","name":"NUMBER","pos":6}], stack, "stack");
    doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
})
test("errorTwoPlusTwoFour", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("2+2 4");
    //print(toJson(stack))
    doh.is([{"value":"2","name":"NUMBER","pos":1},{"value":"+","name":"OPERATOR","pos":2},{"value":"2","name":"NUMBER","pos":3},{"value":"4","name":"NUMBER","pos":5}], stack, "stack");
    doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
})
test("errorMissingOperator", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("3 3");
    //print(toJson(stack))
    doh.is([{"value":"3","name":"NUMBER","pos":1},{"value":"3","name":"NUMBER","pos":3}], stack, "stack");
    doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
})
test("errorMissingValueAfterOperator", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("3 =");
    //print(toJson(stack))
    doh.is([{"name":"NUMBER","value":"3","pos":1},{"name":"EQUALITY","value":"=","pos":3}], stack, "stack");
    doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
})
test("errorEmptyStack", function() {
    var scene = new Scene();
    doh.assertError(Error, scene, "evaluateExpr", [], "Invalid expression");
})

module("Token Evaluator");

test("num", function() {
    var stack = [{"value":"2","name":"NUMBER","pos":1}];
    var token = stack.shift();
    var scene = new Scene();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is(2, actual, 2);
})
test("str", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr('"two"');
    //print(toJson(stack))
    doh.is([{"value":"\"two\"","name":"STRING","pos":5}], stack, "stack");
    var token = stack.shift();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is("two", actual, "two");
})
test("quotedStr", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr('"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"');
    //print(toJson(stack))
    doh.is([{"value":'"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"',"name":"STRING","pos":42}], stack, "stack");
    var token = stack.shift();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is("she \\said\\ it\\\" \\\\ was \"ironic\"!", actual, "she \\said\\ it\\\" \\\\ was \"ironic\"!");
})
test("variable", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr('true');
    //print(toJson(stack))
    doh.is([{"value":"true","name":"VAR","pos":4}], stack, "stack");
    var token = stack.shift();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is(true, actual, true);
})
test("parenthetical", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("(3)");
    //print(toJson(stack))
    doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"3","name":"NUMBER","pos":2},{"value":")","name":"CLOSE_PARENTHESIS","pos":3}], stack, "stack");
    var token = stack.shift();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is(3, actual, 3);
})
test("curly", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr('{"true"}');
    //print(toJson(stack))
    doh.is([{"value":"{","name":"OPEN_CURLY","pos":1},{"value":"\"true\"","name":"STRING","pos":7},{"value":"}","name":"CLOSE_CURLY","pos":8}], stack, "stack");
    var token = stack.shift();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is(true, actual, true);
})
test("array", function() {
    var scene = new Scene();
    scene.stats = {foo:"foo", foo_1:true};
    var stack = scene.tokenizeExpr('foo[1]');
    //print(toJson(stack))
    doh.is([{"name":"VAR","value":"foo","pos":3},{"name":"OPEN_SQUARE","value":"[","pos":4},{"name":"NUMBER","value":"1","pos":5},{"name":"CLOSE_SQUARE","value":"]","pos":6}], stack, "stack");
    var actual = scene.evaluateExpr(stack);
    doh.is(true, actual, true);
})
test("multidimensional array", function() {
    var scene = new Scene();
    scene.stats = {foo:"foo", foo_1_1:true};
    var stack = scene.tokenizeExpr('foo[1][1]');
    //print(toJson(stack))
    doh.is([{"name":"VAR","value":"foo","pos":3},{"name":"OPEN_SQUARE","value":"[","pos":4},{"name":"NUMBER","value":"1","pos":5},{"name":"CLOSE_SQUARE","value":"]","pos":6},{"name":"OPEN_SQUARE","value":"[","pos":7},{"name":"NUMBER","value":"1","pos":8},{"name":"CLOSE_SQUARE","value":"]","pos":9}], stack, "stack");
    var actual = scene.evaluateExpr(stack);
    doh.is(true, actual, true);
})

module("Operators")


test("add", function() {
    var value = Scene.operators["+"]("1", "2");
    doh.is(3, value, 3);
})
test("subtract", function() {
    var value = Scene.operators["-"]("6", "2");
    doh.is(4, value, 4);
})
test("multiply", function() {
    var value = Scene.operators["*"]("6", "2");
    doh.is(12, value, 12);
})
test("divide", function() {
    var value = Scene.operators["/"]("6", "2");
    doh.is(3, value, 3);
})
test("modulo", function() {
    var value = Scene.operators["modulo"]("3", "2");
    doh.is(1, value, 1);
})
test("concatenate", function() {
    var value = Scene.operators["&"]("6", "2");
    doh.is(62, value, 62);
})
test("fairPlus", function() {
    var value = Scene.operators["%+"]("50", "20");
    doh.is(60, value, 60);
})
test("fairMinus", function() {
    var value = Scene.operators["%-"]("50", "20");
    doh.is(40, value, 40);
})
test("equals", function() {
    var value = Scene.operators["="]("50", "50");
    doh.is(true, value, true);
})
test("lessThan", function() {
    var value = Scene.operators["<"]("50", "45");
    doh.is(false, value, false);
})
test("greaterThan", function() {
    var value = Scene.operators[">"]("50", "45");
    doh.is(true, value, true);
})
test("lessThanOrEquals", function() {
    var value = Scene.operators["<="]("50", "45");
    doh.is(false, value, false);
})
test("greaterThanOrEquals", function() {
    var value = Scene.operators[">="]("50", "45");
    doh.is(true, value, true);
})
test("notEquals", function() {
    var value = Scene.operators["!="]("0", "");
    doh.is(true, value, true);
})
test("and", function() {
    var value = Scene.operators["and"](true, true);
    doh.is(true, value, true);
})
test("or", function() {
    var value = Scene.operators["or"](false, true);
    doh.is(true, value, true);
})

module("Functions");

test("not", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("not(true)");
    var token = stack.shift();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is(false, actual);
});

test("round", function() {
    var scene = new Scene();
    var stack = scene.tokenizeExpr("round(1.5)");
    var token = stack.shift();
    var actual = scene.evaluateValueToken(token, stack);
    doh.is(2, actual);
});

module("Line Breaks");


test("noBreaks", function() {
    printed = [];
    var text = "No line breaks";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>No line breaks </p>", printed.join(""), "printed");
})
test("oneTrailingBreak", function() {
    printed = [];
    var text = "One trailing break\n";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>One trailing break </p>", printed.join(""), "printed");
})
test("singleBreakNoBr", function() {
    printed = [];
    var text = "This is\none sentence";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence </p>", printed.join(""), "printed");
})
test("doubleBreakDoubleBr", function() {
    printed = [];
    var text = "This is one sentence.\n\nThis is another.";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence. </p><p>This is another. </p>", printed.join(""), "printed");
})
test("doubleBreakAfterPrint", function() {
    printed = [];
    var text = '*print "This is one sentence."\n\nThis is another.';
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence. </p><p>This is another. </p>", printed.join(""), "printed");
})
test("tripleBreakDoubleBr", function() {
    printed = [];
    var text = "This is one sentence.\n\n\nThis is another.";
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence. </p><p>This is another. </p>", printed.join(""), "printed");
})

module("Variable Interpolation")


test("replacement", function() {
    printed = [];
    var text = "This ${foo} is a ${bar}.";
    var stats = {foo:"foo", bar:"bar"};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This foo is a bar. </p>", printed.join(""), "printed");
})
test("unknownVariable", function() {
    var text = "Unknown variable: ${foo}.";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "execute", null, "Unknown variable");
})
test("invalidExpression", function() {
    var text = "Invalid expression: ${foo.";
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "execute", null, "Invalid expresison");
})
test("capitalize", function() {
    printed = [];
    var text = "This ${foo} is a true $!{Foo}.";
    var stats = {foo:"foo"};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This foo is a true Foo. </p>", printed.join(""), "printed");
})
test("references", function() {
    printed = [];
    var text = "This ${foo} is a true $!{{bar}}.";
    var stats = {foo:"foo",bar:"foo"};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This foo is a true Foo. </p>", printed.join(""), "printed");
})
test("multiReplace", function() {
    printed = [];
    var text = "There @{foo is one thing|are two things} here in the room, and @{(bar) one person|two people}.";
    var stats = {foo:1, bar:false};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>There is one thing here in the room, and two people. </p>", printed.join(""), "printed");
})

module("Parse Stat Chart");


test("noLabels", function() {
    var text = "*stat_chart\n"
      + "  percent foo\n"
      + "  percent bar\n"
      + "  text baz\n"
      + "  text quz\n";
    var scene = new Scene("test", {foo:50, bar:50, baz: "blah", quz:"urk"});
    scene.loadLines(text);
    var rows = scene.parseStatChart();
    var expected = [
        {type:"percent","label":"foo",variable:"foo"}
        ,{type:"percent","label":"bar",variable:"bar"}
        ,{type:"text","label":"baz",variable:"baz"}
        ,{type:"text","label":"quz",variable:"quz"}
    ];
    doh.is(expected, rows, "parsed");
})
test("labels", function() {
    var text = "*stat_chart\n"
      + "  percent foo One\n"
      + "  percent bar Two Three\n"
      + "  text baz Four  Five\n"
      + "  text quz Six Seven!\n";
    var scene = new Scene("test", {foo:50, bar:50, baz: "blah", quz:"urk"});
    scene.loadLines(text);
    var rows = scene.parseStatChart();
    var expected = [
        {type:"percent","label":"One",variable:"foo"}
        ,{type:"percent","label":"Two Three",variable:"bar"}
        ,{type:"text","label":"Four  Five",variable:"baz"}
        ,{type:"text","label":"Six Seven!",variable:"quz"}
    ];
    doh.is(expected, rows, "parsed");
})
test("opposedPairs", function() {
    var text = "*stat_chart\n"
      + "  opposed_pair Leadership\n"
      + "    Honesty\n"
      + "  opposed_pair strength\n"
      + "    Strength\n"
      + "    Weakness\n"
    var scene = new Scene("test", {leadership:50, strength:50});
    scene.loadLines(text);
    var rows = scene.parseStatChart();
    var expected = [
        {opposed_label:"Honesty",type:"opposed_pair",variable:"Leadership","label":"Leadership"}
        ,{opposed_label:"Weakness",type:"opposed_pair",variable:"strength","label":"Strength"}
    ];
    doh.is(expected, rows, "parsed");
})
test("definitions", function() {
    var text = "*stat_chart\n"
      + "  opposed_pair Leadership\n"
      + "    Leadership\n"
      + "      Managing\n"
      + "    Honesty\n"
      + "      Clueless\n"
      + "  percent strength\n"
      + "    Vigor\n"
    var scene = new Scene("test", {leadership:50, strength:50});
    scene.loadLines(text);
    var rows = scene.parseStatChart();
    var expected = [
        {opposed_label:"Honesty",type:"opposed_pair",definition:"Managing",variable:"Leadership","label":"Leadership",opposed_definition:"Clueless"}
        ,{type:"percent",definition:"Vigor",variable:"strength","label":"strength"}
    ];
    doh.is(expected, rows, "parsed");
})

module("Obfuscator");

test("obfuscate", function() {
    var value=" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u00f1";
    var input = {foo:value};
    var json = toJson(input);
    var scene = new Scene("test");
    var obfuscated = scene.obfuscate(json);
    var deobfuscated = scene.deobfuscatePassword(obfuscated);
    var output = eval("output = " + deobfuscated);
    doh.is(value, output.foo, "roundtrip failure");
})

module("goto_random_scene");

test("basic parse", function() {
    var text = "*goto_random_scene\n"
      + "  hello\n"
      + "  goodbye\n"
      + "  death\n"
    ;
    var scene = new Scene("test", {leadership:50, strength:50});
    scene.loadLines(text);
    var actual = scene.parseGotoRandomScene();
    var expected = [
        {allowReuse:false,name:"hello"}
        ,{allowReuse:false,name:"goodbye"}
        ,{allowReuse:false,name:"death"}
    ];
    deepEqual(actual, expected, "misparsed")
})

test("complex parse", function() {
    var text = "*goto_random_scene allow_no_selection\n"
      + "  *allow_reuse hello\n"
      + "  *if (false) goodbye\n"
      + "  *allow_reuse *if ((true and true) or false) death\n"
      + "Nothing selected"
    ;
    var scene = new Scene("test", {leadership:50, strength:50});
    scene.loadLines(text);
    var actual = scene.parseGotoRandomScene("allow_no_selection");
    var expected = [
        {allowReuse:true,name:"hello"}
        ,{allowReuse:false,conditional:"false",name:"goodbye"}
        ,{allowReuse:true,conditional:"(true and true) or false",name:"death"}
    ];
    deepEqual(actual, expected, "misparsed")
})


test("basic compute", function() {
    var scene = new Scene("test", {leadership:50, strength:50});
    var parsed = [
        {allowReuse:false,name:"hello"}
        ,{allowReuse:false,name:"goodbye"}
        ,{allowReuse:false,name:"death"}
    ];
    var actual = scene.computeRandomSelection(0, parsed, false);
    var expected = parsed[0];
    deepEqual(actual, expected, "miscomputed");
    deepEqual(scene.stats.choice_grs, ["hello"], "didn't update grs finished list");
})

test("block reuse", function() {
    var scene = new Scene("test", {leadership:50, strength:50});
    var parsed = [
        {allowReuse:false,name:"hello"}
        ,{allowReuse:false,name:"goodbye"}
        ,{allowReuse:false,name:"death"}
    ];
    scene.stats.choice_grs = ["hello", "goodbye"];
    var actual = scene.computeRandomSelection(0, parsed, false);
    var expected = parsed[2];
    deepEqual(actual, expected, "miscomputed");
    deepEqual(scene.stats.choice_grs, ["hello", "goodbye", "death"], "didn't update grs finished list");
})

test("conditional", function() {
    var scene = new Scene("test", {leadership:50, strength:50});
    var parsed = [
        {allowReuse:false,name:"hello",conditional:"false"}
        ,{allowReuse:false,name:"goodbye"}
        ,{allowReuse:false,name:"death"}
    ];
    var actual = scene.computeRandomSelection(0, parsed, false);
    var expected = parsed[1];
    deepEqual(actual, expected, "miscomputed");
    deepEqual(scene.stats.choice_grs, ["goodbye"], "didn't update grs finished list");
})

test("nothing selectable", function() {
    var scene = new Scene("test", {leadership:50, strength:50});
    var parsed = [
        {allowReuse:false,name:"hello",conditional:"false"}
        ,{allowReuse:false,name:"goodbye"}
        ,{allowReuse:false,name:"death"}
    ];
    scene.stats.choice_grs = ["goodbye", "death"];
    var actual = scene.computeRandomSelection(0, parsed, false);
    deepEqual(actual, null, "miscomputed");
    deepEqual(scene.stats.choice_grs, ["goodbye", "death"], "updated grs finished list, but shouldn't have");
})
