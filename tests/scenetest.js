doh = {
    is: function(expected, actual, message){
        var stringify = x => JSON.stringify(sortObjByKey(x), null, 2);
        //stringify = x => x;
        if (expected != actual) deepEqual(stringify(actual), stringify(expected), message);
    },
    assertError: function(type, obj, method, args, message) {
        raises(function() {obj[method].apply(obj, args)}, null, message);
    }
};

function sortObjByKey(value) {
  return (typeof value === 'object') ?
    (Array.isArray(value) ?
      value.map(sortObjByKey) :
      Object.keys(value).sort().reduce(
        (o, key) => {
          const v = value[key];
          o[key] = sortObjByKey(v);
          return o;
        }, {})
    ) :
    value;
}

// https://github.com/MartinKolarik/dedent-js/blob/master/src/index.ts
function dedent (templateStrings, ...values) {
    let matches = [];
    let strings = typeof templateStrings === 'string' ? [ templateStrings ] : templateStrings.slice();

    // 1. Remove trailing whitespace.
    strings[strings.length - 1] = strings[strings.length - 1].replace(/\r?\n([\t ]*)$/, '');

    // 2. Find all line breaks to determine the highest common indentation level.
    for (let i = 0; i < strings.length; i++) {
        let match;

        if (match = strings[i].match(/\n[\t ]+/g)) {
            matches.push(...match);
        }
    }

    // 3. Remove the common indentation from all strings.
    if (matches.length) {
        let size = Math.min(...matches.map(value => value.length - 1));
        let pattern = new RegExp(`\n[\t ]{${size}}`, 'g');

        for (let i = 0; i < strings.length; i++) {
            strings[i] = strings[i].replace(pattern, '\n');
        }
    }

    // 4. Remove leading whitespace.
    strings[0] = strings[0].replace(/^\r?\n/, '');

    // 5. Perform interpolation.
    let string = strings[0];

    for (let i = 0; i < values.length; i++) {
        string += values[i] + strings[i + 1];
    }

    return string;
}


module("FullScene");

test("error increasing indent", function() {
    var text = dedent`
                foo
                  bar`;
    var scene = new Scene();
    scene.loadLines(text);
    raises(function() {scene.execute();}, null, "Illegally increased indentation");
})

test("errorInvalidCommand", function() {
    var text = dedent`
                foo
                *bar`;
    var scene = new Scene();
    scene.loadLines(text);
    raises(function() {scene.execute()}, null, "Invalid command");
})
test("labelGoto", function() {
    printed = [];
    var text = dedent`
                foo
                *goto foo
                skip me!
                *label foo
                bar`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo bar </p>", "printed value");
})
test("gotoRef", function() {
    printed = [];
    var text = dedent`
                foo
                *temp x
                *set x \"foo\"
                *gotoref x
                skip me!
                *label foo
                bar`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo bar </p>", "printed value");
})
test("mixedCaseLabels", function() {
    printed = [];
    var text = dedent`
                foo
                *goto foo
                skip me!
                *Label Foo
                bar`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo bar </p>", "printed value");
})
test("finish", function() {
    printed = [];
    var text = dedent`
                foo
                *finish
                skip me!`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    equal(printed.join(""), "<p>foo </p>", "printed value");
})

module("OptionParsing");

test("single", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
})
test("singleTabs", function() {
    var text = dedent`
                *choice
                    #foo
                        Foo!
                    #bar
                        Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
})
test("blankLine", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                
                    Foo, I say!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":5},{"name":"bar","line":6,"group":"choice","endLine":7}], options, "options");
})
test("singlePrint", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                  *print "#ba"&"r"
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":4,"group":"choice","endLine":5}], options, "options");
})
test("simpleConditionalTrue", function() {
    var text = dedent`
                *choice
                  *if true
                    #foo
                      Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:4,name:"foo",line:3},{group:"choice",endLine:6,name:"bar",line:5}], options, "options");
})
test("oneLineConditionalTrue", function() {
    var text = dedent`
                *choice
                  *if (true) #foo
                      Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:3,name:"foo",line:2},{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("unselectable", function() {
    var text = dedent`
                *choice
                  *selectable_if (false) #foo
                      Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:3,unselectable:true,name:"foo",line:2},{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("nonUnselectable", function() {
    var text = dedent`
                *choice
                  *selectable_if (true) #foo
                      Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:3,name:"foo",line:2},{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("simpleConditionalFalse", function() {
    var text = dedent`
                *choice
                  *if false
                    #foo
                      Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:6,name:"bar",line:5}], options, "options");
})
test("oneLineConditionalFalse", function() {
    var text = dedent`
                *choice
                  *if (false)    #foo
                      Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:5,name:"bar",line:4}], options, "options");
})
test("simpleConditionalElseTrue", function() {
    var text = dedent`
                *choice
                  *if true
                    #foo
                      Foo!
                  *else
                    #fail
                      Fail!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:4,name:"foo",line:3},{group:"choice",endLine:9,name:"bar",line:8}], options, "options");
})
test("simpleConditionalElseFalse", function() {
    var text = dedent`
                *choice
                  *if false
                    #fail
                      Fail!
                  *else
                    #foo
                      Foo!
                  #bar
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:7,name:"foo",line:6},{group:"choice",endLine:9,name:"bar",line:8}], options, "options");
})
test("nestedConditionalTrue", function() {
    var text = dedent`
                *choice
                  *if true
                    *if true
                        #foo
                          foo
                          *finish
                    #bar
                      bar
                      *finish`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{group:"choice",endLine:6,name:"foo",line:4},{group:"choice",endLine:9,name:"bar",line:7}], options, "options");
})
test("multi", function() {
    var text = dedent`
        *choice color toy
          #red
            #spaceship
              Red spaceship
            #yo-yo
              Red yo-yo
          #blue
            #spaceship
              Blue spaceship
            #yo-yo
              Blue yo-yo
        baz
    `;
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
    var text = dedent`
        *choice color toy
          #red
            #spaceship
              Red spaceship
            #yo-yo
              Red yo-yo
          #blue
            #spaceship
              Blue spaceship
            *selectable_if (false) #yo-yo
              Blue yo-yo
        baz`;
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
    var text = dedent`
                *choice
                    #foo
                  #bar`;
    var scene = new Scene();
    scene.loadLines(text);
    //var options = scene.parseOptions(0, []);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Invalid indent");
})
test("errorTabMixing", function() {
    var text = `
*choice
      #foo
        Foo!
    #bar
        Bar!
baz`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
})
test("errorTabFirstSpaceLater", function() {
    var text = dedent`
                *choice
                \t#foo
                        Foo!
                \t#bar
                \t\tBar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
})
test("errorSpaceFirstTabLater", function() {
    var text = dedent`
                *choice
                    #foo
                \t\tFoo!
                \t#bar
                \t\tBar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
})
test("errorNoChoices", function() {
    var text = dedent`
                *choice
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    //var options = scene.parseOptions(0, []);
    doh.assertError(Error, scene, "parseOptions", [0, []], "No options");
})
test("errorNoBody", function() {
    var text = dedent`
                *choice
                  #foo
                  #bar`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Expected choice body");
})
test("errorNoBodyOneChoice", function() {
    var text = dedent`
                *choice
                  #foo
                bar`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Expected choice body");
})
test("errorNoBodyMultiChoice", function() {
    var text = dedent`
                *choice one two
                  #foo
                    #x
                  #bar
                    #x
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, ["one", "two"]], "Expected choice body");
})
test("errorNonOverlappingMultiChoice", function() {
    var text = dedent`
        *choice color toy
          #red
            #wagon
              Red spaceship
            #yo-yo
              Red yo-yo
          #blue
            #spaceship
              Blue spaceship
            #truck
              Blue yo-yo
        baz`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, ["color", "toy"]], "Mismatched suboptions");
})
test("errorNonOverlappingMultiChoice2", function() {
    var text = dedent`
        *choice color toy
          #red
            #wagon
              Red spaceship
            #yo-yo
              Red yo-yo
          #blue
            #spaceship
              Blue spaceship
            #truck
              Blue yo-yo
            #wagon
              Blue wagon
        baz`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, ["color", "toy"]], "Mismatched suboptions");
})
test("errorDupes", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                  #foo
                    Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "parseOptions", [0, []], "Duplicate options");
})
test("errorNoSelectable", function() {
    var text = dedent`
                *choice
                  *selectable_if (false) #foo
                      Foo!
                  *selectable_if (false) #bar
                    Bar!
                baz`;
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
    scene.loadLines(dedent`
                *temp foo
                *set foo 2`);
    scene.execute();
    doh.is(2, scene.temps.foo, "scene.temps.foo");
})
test("mixedCaseVariable", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp Foo
                *set foo 2`);
    scene.execute();
    doh.is(2, scene.temps.foo, "scene.temps.foo");
})
test("deleteTemp", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp foo
                *set foo 2
                *delete foo`);
    scene.execute();
    doh.is("undefined", typeof scene.temps.foo, "typeof scene.temps.foo");
})
test("setStat", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create foo 0
                *set foo 2`);
    scene.execute();
    doh.is(2, scene.stats.foo, "scene.stats.foo");
})
test("deleteStat", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create foo 0
                *set foo 2
                *delete foo`);
    scene.execute();
    doh.is("undefined", typeof scene.stats.foo, "typeof scene.stats.foo");
})
test("setTempOverridingStat", function() {
    printed = [];
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create foo 0
                *set foo 2
                *temp foo
                *set foo 3
                *print foo`);
    scene.execute();
    doh.is(2, scene.stats.foo, "scene.stats.foo");
    doh.is(3, scene.temps.foo, "scene.temps.foo");
    doh.is("<p>3 </p>", printed.join(""), "printed");
})
test("deleteTempOverridingStat", function() {
    printed = [];
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create foo 0
                *set foo 2
                *temp foo
                *set foo 3
                *delete foo
                *print foo`);
    scene.execute();
    doh.is(2, scene.stats.foo, "scene.stats.foo");
    doh.is("undefined", typeof scene.temps.foo, "typeof scene.temps.foo");
    doh.is("<p>2 </p>", printed.join(""), "printed");
})
test("implicitVariable", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp foo 0
                *set foo 2
                *set foo+2`);
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
    scene.loadLines(dedent`
                *temp foo 0
                *temp bar 0
                *set foo \"bar\"
                *setref foo 2`);
    scene.execute();
    doh.is(2, scene.temps.bar, "scene.temps.bar");
})
test("setByRef", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp foo 0
                *temp bar 0
                *set foo \"bar\"
                *set {foo} 2`);
    scene.execute();
    doh.is(2, scene.temps.bar, "scene.temps.bar");
})
test("setArray", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp foo \"foo\"
                *temp foo_1 0
                *set foo[1] 2`);
    scene.execute();
    doh.is(2, scene.temps.foo_1, "scene.temps.foo_1");
})
test("setMultidimensionalArray", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp foo \"foo\"
                *temp foo_1_1 0
                *set foo[1][1] 2`);
    scene.execute();
    doh.is(2, scene.temps.foo_1_1, "scene.temps.foo_1_1");
})
test("errorSetRefNoExpression", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp foo 0
                *temp bar 0
                *set foo \"bar\"
                *setref foo`);
    doh.assertError(Error, scene, "execute", null, "No expression");
})
test("setRefWhitespace", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp foo 0
                *temp bar 0
                *set foo \"bar\"
                *setref foo(2)`);
    scene.execute();
    doh.is(2, scene.temps.bar, "scene.temps.bar");
    //doh.assertError(Error, scene, "execute", null, "No expression");
})

module("If");

test("basic", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if true
                  Truthy
                  *finish
                *else
                  Falsish
                  *finish`);
    scene.execute();
    doh.is("<p>Truthy </p>", printed.join(""), "Wrong printed value");
})
test("extraLineBreak", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if true
                
                  Truthy
                  *finish
                *else
                  Falsish
                  *finish`);
    scene.execute();
    doh.is("<p>Truthy </p>", printed.join(""), "Wrong printed value");
})
test("testElse", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if false
                  Truthy
                  *finish
                *else
                  Falsish
                  *finish`);
    scene.execute();
    doh.is("<p>Falsish </p>", printed.join(""), "Wrong printed value");
})
test("testElseExtraLineBreak", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if false
                  Truthy
                  *finish
                *else
                
                  Falsish
                  *finish`);
    scene.execute();
    doh.is("<p>Falsish </p>", printed.join(""), "Wrong printed value");
})
test("testElseIfTrue", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if false
                  Truthy
                  *finish
                *elseif true
                  Elsey
                  *finish
                *else
                  Falsish
                  *finish`);
    scene.execute();
    doh.is("<p>Elsey </p>", printed.join(""), "Wrong printed value");
})
test("testElseIfFalse", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if false
                  Truthy
                  *finish
                *elseif false
                  Elsey
                  *finish
                *else
                  Falsish
                  *finish`);
    scene.execute();
    doh.is("<p>Falsish </p>", printed.join(""), "Wrong printed value");
})
test("testDoubleElseIf", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if false
                  Truthy
                  *finish
                *elseif false
                  Elsey
                  *finish
                *elseif true
                  Double Elsey
                  *finish
                *else
                  Falsish
                  *finish`);
    scene.execute();
    doh.is("<p>Double Elsey </p>", printed.join(""), "Wrong printed value");
})
test("nested", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if true
                  *if true
                    Truthy
                *label end`);
    scene.execute();
    doh.is("<p>Truthy </p>", printed.join(""), "Wrong printed value");
})
test("errorNonNestedElse", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if true
                  OK
                  *if false
                    Fail
                *else
                  Fail`);
    doh.assertError(Error, scene, "execute", null, "fall into else");
})
test("nestedExtraLineBreak", function() {
    printed = [];
    var scene = new Scene();
    scene.loadLines(dedent`
                *if true
                  *if true
                    Truthy
                
                  Still Truthy
                *label end`);
    scene.execute();
    doh.is("<p>Truthy </p><p>Still Truthy </p>", printed.join(""), "Wrong printed value");
})
test("errorDrift", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *if true
                        drift
                      drift
                    drift
                  drift`);
    //TODO drift detection
    //doh.assertError(Error, scene, "execute", null, "drifting");
})
test("ignoreCommentsICF", function() {
    printed = [];
    var scene = new Scene("test", { implicit_control_flow: true })
    scene.loadLines(dedent`
                *if false
                  false
                *comment blah
                *elseif true
                  true
                
                end`);
    scene.execute();
    doh.is("<p>true </p><p>end </p>", printed.join(""), "Wrong printed value");
})

module("Complex Choice");

test("trueNestedIf", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                  *if true
                    #bar
                      Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is(([{"name":"foo","line":2,"group":"choice","endLine":3},{"name":"bar","line":5,"group":"choice","endLine":6}]), (options), "options");
})
test("falseNestedIf", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                  *if false
                    #bar
                      Bar!
                baz`;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is(([{"name":"foo","line":2,"group":"choice","endLine":3}]), (options), "options");
})
test("trueNestedElse", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                    *finish
                  *if true
                    #bar
                      Bar!
                      *finish
                  *else
                    #baz
                      Baz!
                      *finish
                baz
                `;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"bar","line":6,"group":"choice","endLine":8}], options, "options");
})
test("falseNestedElse", function() {
    var text = dedent`
                *choice
                  #foo
                    Foo!
                    *finish
                  *if false
                    #bar
                      Bar!
                      *finish
                  *else
                    #baz
                      Baz!
                      *finish
                baz
                `;
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","group":"choice","line":2,"endLine":4},{"name":"baz","group":"choice","line":10,"endLine":12}], options, "options");
})
test("twoFalseNestedElses", function() {
    var text = dedent`
    *choice
      #foo
        Foo!
        *finish
      *if false
        #bar
          Bar!
          *finish
        *goto end
      *else
        #baz
          Baz!
          *finish
      *if false
        #qoo
          Qoo!
          *finish
        *goto end
      *else
        #quz
          Quz!
    *label end
    baz`
    var scene = new Scene();
    scene.loadLines(text);
    var options = scene.parseOptions(0, []);
    doh.is([{"name":"foo","line":2,"group":"choice","endLine":4},{"name":"baz","line":11,"group":"choice","endLine":13},{"name":"quz","line":20,"group":"choice","endLine":21}], options, "options");
})
// TODO add drift detection
// test("errorTwoFalseNestedElses", function() {
            // var text = dedent`
            // *choice
            //   #foo
            //     Foo!
            //   *if false
            //     #bar
            //       Bar!
            //     *goto end
            //   *else
            //     #baz
            //       Baz!
            //   *if false
            //     #qoo
            //       Qoo!
            //     *goto end
            //   *else
            //     #quz
            //       Quz!
            //       *goto end
            //    #sheesh // misindented = 3
            //      Sheesh!
            // *label end
            // baz`
//             var scene = new Scene();
//             scene.loadLines(text);
//             doh.assertError(Error, scene, "parseOptions", [0, []], "misindented");
//         })

module("Standard Resolution");

test("single", function() {
    printed = [];
    var text = dedent`
                *choice
                  #foo
                    Foo!
                    *finish
                  #bar
                    Bar!
                    *finish
                baz`;
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
    var text = dedent`
                *choice
                  #foo
                    Foo!
                    *finish
                  #bar
                    Bar!
                    *finish
                baz`;
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
    var text = dedent`
                start
                *gosub subroutine
                end
                *finish
                *label subroutine
                *choice
                  #foo
                    Foo!
                    *return
                  #bar
                    Bar!
                    *return
                baz`;
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
    var text = dedent`
                *choice
                  #foo
                
                    Foo!
                    *finish
                  #bar
                    Bar!
                    *finish
                baz`;
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
    var text = dedent`
                *fake_choice
                  #foo
                    Foo!
                  #bar
                    Bar!
                baz`;
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
    var text = dedent`
                *fake_choice
                  #foo
                    Foo!
                  #bar
                    Bar!
                
                baz`;
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
    var text = dedent`
                *fake_choice
                  #foo
                  #bar
                baz`;
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
    var text = dedent`
                *fake_choice
                  #foo
                    Foo!
                  *selectable_if (false) #bar
                    Bar!
                baz`;
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
    var text = dedent`
                *fake_choice
                  #foo
                  *selectable_if (false) #bar
                baz`;
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
    var text = dedent`
                *choice
                  #foo
                    Foo!
                    *goto end
                  #bar
                    Bar!
                *label end
                *print choice_1`;
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
    var text = dedent`
                *choice
                   #foo
                       Foo
                       *finish
                   #bar
                       Bar
                baz
                *choice
                   #one
                       one
                       *finish
                   #two
                       two`;
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
    var text = dedent`
      *label start
      What do you want to do?
      *choice
        *hide_reuse #A little of this.
          You do some of this.
          *goto start
        *disable_reuse #A little of that.
          You do some of that.
          *goto start
        *allow_reuse #Let me think about it a little longer.
          Very well.
          *goto start
        #What was the question?
          Quit stalling!
          *goto start  
        #Nothing; I'm done.
          OK!
          *finish`
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
      {group:"choice",endLine:18,name:"Nothing; I\'m done.",line:16}], options, "options");
    scene.standardResolution(options[0]);
    doh.is([
      {reuse:"disable",group:"choice",endLine:9,name:"A little of that.",line:7},
      {group:"choice",endLine:12,name:"Let me think about it a little longer.",line:10},
      {group:"choice",endLine:15,name:"What was the question?",line:13},
      {group:"choice",endLine:18,name:"Nothing; I'm done.",line:16}], options, "options2");
    scene.standardResolution(options[0]);
    var expected = [
      {reuse:"disable",group:"choice",endLine:9,unselectable:true,name:"A little of that.",line:7},
      {group:"choice",endLine:12,name:"Let me think about it a little longer.",line:10},
      {group:"choice",endLine:15,name:"What was the question?",line:13},
      {group:"choice",endLine:18,name:"Nothing; I\'m done.",line:16}
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
    var text = dedent`
      *hide_reuse
      *label start
      What do you want to do?
      *choice
        *hide_reuse #A little of this.
          You do some of this.
          *goto start
        *disable_reuse #A little of that.
          You do some of that.
          *goto start
        *allow_reuse #Let me think about it a little longer.
          Very well.
          *goto start
        #What was the question?
          Quit stalling!
          *goto start  
        #Nothing; I'm done.
          OK!
          *finish`
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
      {reuse:"hide",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}], options, "options");
    scene.standardResolution(options[0]);
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"hide",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"hide",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}], options, "options2");
    scene.standardResolution(options[0]);
    var beforeHiding = [
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"hide",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"hide",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}
    ];
    doh.is(beforeHiding, options, "options3");
    scene.standardResolution(options[1]); // Let me think
    doh.is(beforeHiding, options, "options4");
    scene.standardResolution(options[2]); // What was the question?
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"hide",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}], options, "options5");
    doh.is("<p>What do you want to do? </p><p>You do some of this. "
      +"What do you want to do? </p><p>You do some of that. "
      +"What do you want to do? </p><p>Very well. "
      +"What do you want to do? </p><p>Quit stalling! "
      +"What do you want to do? </p>", trim(printed.join("")), "printed");
})
test("disableByDefault", function() {
    printed = [];
    var text = dedent`
      *disable_reuse
      *label start
      What do you want to do?
      *choice
        *hide_reuse #A little of this.
          You do some of this.
          *goto start
        *disable_reuse #A little of that.
          You do some of that.
          *goto start
        *allow_reuse #Let me think about it a little longer.
          Very well.
          *goto start
        #What was the question?
          Quit stalling!
          *goto start  
        #Nothing; I'm done.
          OK!
          *finish`
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
      {reuse:"disable",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}], (options), "options");
    scene.standardResolution(options[0]);
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"disable",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"disable",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}], (options), "options2");
    scene.standardResolution(options[0]);
    var beforeHiding = [
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"disable",group:"choice",endLine:16,name:"What was the question?",line:14},
      {reuse:"disable",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}
    ];
    doh.is(beforeHiding, (options), "options3");
    scene.standardResolution(options[1]); // Let me think
    doh.is(beforeHiding, options, "options4");
    scene.standardResolution(options[2]); // What was the question?
    doh.is([
      {reuse:"disable",group:"choice",endLine:10,unselectable:true,name:"A little of that.",line:8},
      {group:"choice",endLine:13,name:"Let me think about it a little longer.",line:11},
      {reuse:"disable",group:"choice",endLine:16,unselectable:true,name:"What was the question?",line:14},
      {reuse:"disable",group:"choice",endLine:19,name:"Nothing; I\'m done.",line:17}], options, "options5");
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


module("Operators with Mis-Matched Datatypes")


test("add a string", function() {
    raises(function() {Scene.operators["+"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("add to a string", function() {
    raises(function() {Scene.operators["+"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("subtract a string", function() {
    raises(function() {Scene.operators["-"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("subtract from a string", function() {
    raises(function() {Scene.operators["-"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("multiply by a string", function() {
    raises(function() {Scene.operators["*"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("multiply a string", function() {
    raises(function() {Scene.operators["*"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("divide by a string", function() {
    raises(function() {Scene.operators["/"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("divide a string", function() {
    raises(function() {Scene.operators["/"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("modulo by a string", function() {
    raises(function() {Scene.operators["modulo"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("modulo a string", function() {
    raises(function() {Scene.operators["modulo"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("exponent by a string", function() {
    raises(function() {Scene.operators["^"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("exponent a string", function() {
    raises(function() {Scene.operators["^"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("fairPlue by a string", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.lineNum = 18;
    raises(function() {Scene.operators["%+"]("1", "\"2\"", 17, scene)}, /startup line 17: /, "Invalid data type");
})
test("fairPlus a string", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.lineNum = 18;
    raises(function() {Scene.operators["%+"]("\"1\"", "2", 17, scene)}, /startup line 17:/, "Invalid data type");
})
test("fairPlus to a non-percentile", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.lineNum = 18;
    raises(function() {Scene.operators["%+"]("103", "2", 17, scene)}, /startup line 19: Can't fairAdd to non-percentile/, "Not a percent value");
})
test("fairMinus by a string", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.lineNum = 18;
    raises(function() {Scene.operators["%-"]("1", "\"2\"", 17, scene)}, /startup line 17: /, "Invalid data type");
})
test("fairMinus a string", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.lineNum = 18;
    raises(function() {Scene.operators["%-"]("\"1\"", "2", 17, scene)}, /startup line 17:/, "Invalid data type");
})
test("fairMinus to a non-percentile", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.lineNum = 18;
    raises(function() {Scene.operators["%-"]("103", "2", 17, scene)}, /startup line 19: Can't fairAdd to non-percentile/, "Not a percent value");
})
test("lessThan a string", function() {
    raises(function() {Scene.operators["<"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("a string is lessThan", function() {
    raises(function() {Scene.operators["<"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("lessThanOrEquals a string", function() {
    raises(function() {Scene.operators["<="]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("a string is lessThanOrEquals", function() {
    raises(function() {Scene.operators["<="]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("greaterThan a string", function() {
    raises(function() {Scene.operators[">"]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("a string is greaterThan", function() {
    raises(function() {Scene.operators[">"]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("greaterThanOrEquals a string", function() {
    raises(function() {Scene.operators[">="]("1", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("a string is greaterThanOrEquals", function() {
    raises(function() {Scene.operators[">="]("\"1\"", "2", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("and a string", function() {
    raises(function() {Scene.operators["and"]("true", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("a string and", function() {
    raises(function() {Scene.operators["and"]("\"1\"", "true", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("or a string", function() {
    raises(function() {Scene.operators["or"]("false", "\"2\"", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
})
test("a string or", function() {
    raises(function() {Scene.operators["or"]("\"1\"", "false", 17, {"name":"startup"})}, /startup line 17:/, "Invalid data type");
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
    var text = dedent`
                No line breaks`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>No line breaks </p>", printed.join(""), "printed");
})
test("oneTrailingBreak", function() {
    printed = [];
    var text = dedent`
                One trailing break
                `;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>One trailing break </p>", printed.join(""), "printed");
})
test("singleBreakNoBr", function() {
    printed = [];
    var text = dedent`
                This is
                one sentence`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence </p>", printed.join(""), "printed");
})
test("doubleBreakDoubleBr", function() {
    printed = [];
    var text = dedent`
                This is one sentence.
                
                This is another.`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence. </p><p>This is another. </p>", printed.join(""), "printed");
})
test("doubleBreakAfterPrint", function() {
    printed = [];
    var text = dedent`
                *print "This is one sentence."
                
                This is another.`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence. </p><p>This is another. </p>", printed.join(""), "printed");
})
test("tripleBreakDoubleBr", function() {
    printed = [];
    var text = dedent`
                This is one sentence.
                
                
                This is another.`;
    var scene = new Scene();
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This is one sentence. </p><p>This is another. </p>", printed.join(""), "printed");
})

module("Variable Interpolation")


test("replacement", function() {
    printed = [];
    var text = dedent`
                This \${foo} is a \${bar}.`;
    var stats = {foo:"foo", bar:"bar"};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This foo is a bar. </p>", printed.join(""), "printed");
})
test("unknownVariable", function() {
    var text = dedent`
                Unknown variable: \${foo}.`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "execute", null, "Unknown variable");
})
test("invalidExpression", function() {
    var text = dedent`
                Invalid expression: \${foo.`;
    var scene = new Scene();
    scene.loadLines(text);
    doh.assertError(Error, scene, "execute", null, "Invalid expresison");
})
test("capitalize", function() {
    printed = [];
    var text = dedent`
                This \${foo} is a true \$!{Foo}.`;
    var stats = {foo:"foo"};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This foo is a true Foo. </p>", printed.join(""), "printed");
})
test("references", function() {
    printed = [];
    var text = dedent`
                This \${foo} is a true \$!{{bar}}.`;
    var stats = {foo:"foo",bar:"foo"};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>This foo is a true Foo. </p>", printed.join(""), "printed");
})
test("multiReplace", function() {
    printed = [];
    var text = dedent`
                There @{foo is one thing|are two things} here in the room, and @{(bar) one person|two people}.`;
    var stats = {foo:1, bar:false};
    var scene = new Scene("test", stats);
    scene.loadLines(text);
    scene.execute();
    doh.is("<p>There is one thing here in the room, and two people. </p>", printed.join(""), "printed");
})

module("Parse Stat Chart");


test("noLabels", function() {
    var text = dedent`
                *stat_chart
                    percent foo
                    percent bar
                    text baz
                    text quz`
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
    var text = dedent`
                *stat_chart
                    percent foo One
                    percent bar Two Three
                    text baz Four  Five
                    text quz Six Seven!`
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
    var text = dedent`
                *stat_chart
                    opposed_pair Leadership
                        Honesty
                    opposed_pair strength
                        Strength
                        Weakness`;
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
    var text = dedent`
    *stat_chart
      opposed_pair Leadership
        Leadership
          Managing
        Honesty
          Clueless
      percent strength
        Vigor`
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
    var text = dedent`
                *goto_random_scene
                    hello
                    goodbye
                    death`
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
    var text = dedent`
      *goto_random_scene allow_no_selection
        *allow_reuse hello
        *if (false) goodbye
        *allow_reuse *if ((true and true) or false) death
      Nothing selected`
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

module("Implicit Control Flow");

test("basic", function() {
    printed = [];
    var text = dedent`
        *choice
          #foo
            Foo!
          #bar
            Bar!
        baz
    `;
    var scene = new Scene("test", {implicit_control_flow: true});
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

test("conditionals", function() {
    printed = [];
    var text = dedent`
        *temp seen false
        *choice
            *if (not(seen))
                #not seen
                    *set seen true
                    bar
            *if (seen)
                *selectable_if (true) #seen
                    blah
    `;
    var scene = new Scene("test", {implicit_control_flow: true});
    scene.loadLines(text);
    var options, groups;
    scene.renderOptions = function(_groups, _options) {
        options = _options;
        groups = _groups;
    };
    scene.execute();
    doh.is([{"name":"not seen","group":"choice","line":4,"endLine":6}], options, "options");
    scene.standardResolution(options[0]);
    doh.is("<p>bar </p>", printed.join(""), "printed");
})

module("Array Creation")

test("createArrayDefault", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create_array g_arr 2 0
                *finish`);
    scene.execute();
    doh.is("undefined", typeof scene.stats.g_arr_0, "scene.stats.g_arr_0");
    doh.is(0, scene.stats.g_arr_1, "scene.stats.g_arr_1");
    doh.is(0, scene.stats.g_arr_2, "scene.stats.g_arr_2");
    doh.is(2, scene.stats.g_arr_count, "scene.stats.g_arr_count");
    doh.is("undefined", typeof scene.stats.g_arr_3, "scene.stats.g_arr_3");
});
test("createArrayExplicit", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines("*create_array g_arr 3 1 2 3");
    scene.execute();
    doh.is("undefined", typeof scene.stats.g_arr_0, "scene.stats.g_arr_0");
    doh.is(1, scene.stats.g_arr_1, "scene.stats.g_arr_1");
    doh.is(2, scene.stats.g_arr_2, "scene.stats.g_arr_2");
    doh.is(3, scene.stats.g_arr_3, "scene.stats.g_arr_3");
    doh.is(3, scene.stats.g_arr_count, "scene.stats.g_arr_count");
    doh.is("undefined", typeof scene.stats.g_arr_4, "scene.stats.g_arr_4");
});
test("errorCreateArrayLength", function() {
    var scene = new Scene();
    scene.loadLines("*create_array g_arr");
    doh.assertError(Error, scene, "execute", null, "Expected Array Length");
});
test("errorCreateArrayName", function() {
    var scene = new Scene();
    scene.loadLines("*create_array");
    doh.assertError(Error, scene, "execute", null, "Expected Array Name");
});
test("errorCreateArrayValues", function() {
    var scene = new Scene();
    scene.loadLines("*create_array g_arr 5 1 2 3 4");
    doh.assertError(Error, scene, "execute", null, "Expected 1 or 5 values for array g_arr");
});
test("errorCreateComplexValues", function() {
    var scene = new Scene();
    scene.loadLines("*create_array g_arr 2 1 n&n");
    doh.assertError(Error, scene, "execute", null, "Invalid create_array value, values must be a number, true/false, or a quoted string, not: VAR");
});
test("errorCreateDuplicate", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create_array g_arr 2 1
                *create_array g_arr 4 \"\"`);
    doh.assertError(Error, scene, "execute", null, "Invalid create_array element ... Was previously created ...");
});
test("errorCreateConflict", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create g_arr_1 1
                *create_array g_arr 4 \"\"`);
    doh.assertError(Error, scene, "execute", null, "g_arr_1 already exists");
});
test("tempArrayDefault", function() {
    var scene = new Scene();
    scene.loadLines("*temp_array t_arr 3 \"\"");
    scene.execute();
    doh.is("undefined", typeof scene.temps.t_arr_0, "scene.temps.t_arr_0");
    doh.is("", scene.temps.t_arr_1, "scene.temps.t_arr_1");
    doh.is("", scene.temps.t_arr_2, "scene.temps.t_arr_2");
    doh.is("", scene.temps.t_arr_3, "scene.temps.t_arr_3");
    doh.is(3, scene.temps.t_arr_count, "scene.temps.t_arr_count");
    doh.is("undefined", typeof scene.temps.t_arr_4, "scene.temps.t_arr_4");
});
test("tempArrayExplicitAndComplex", function() {
    var scene = new Scene();
    scene.loadLines(dedent`
                *temp fname \"FNAME\"
                *temp lname \"LNAME\"
                *temp_array t_arr 2 \"Hello\" (fname&(\" \"&lname))`);
    scene.execute();
    doh.is("undefined", typeof scene.temps.t_arr_0, "scene.temps.t_arr_0");
    doh.is("Hello", scene.temps.t_arr_1, "scene.temps.t_arr_1");
    doh.is("FNAME LNAME", scene.temps.t_arr_2, "scene.temps.t_arr_2");
    doh.is(2, scene.temps.t_arr_count, "scene.temps.t_arr_count");
    doh.is("undefined", typeof scene.temps.t_arr_3, "scene.temps.t_arr_3");
});
test("tempArrayEmpty", function() {
    var scene = new Scene();
    scene.loadLines("*temp_array t_arr 2");
    scene.execute();
    doh.is("undefined", typeof scene.temps.t_arr_0, "scene.temps.t_arr_0");
    doh.is(null, scene.temps.t_arr_1, "scene.temps.t_arr_1");
    doh.is(null, scene.temps.t_arr_2, "scene.temps.t_arr_2");
    doh.is(2, scene.temps.t_arr_count, "scene.temps.t_arr_count");
    doh.is("undefined", typeof scene.temps.t_arr_3, "scene.temps.t_arr_3");
});
test("errorTempArrayName", function() {
    var scene = new Scene();
    scene.loadLines("*temp_array");
    doh.assertError(Error, scene, "execute", null, "Expected Array Name");
});
test("errorTempArrayLength", function() {
    var scene = new Scene();
    scene.loadLines("*temp_array foo");
    doh.assertError(Error, scene, "execute", null, "Expected Array Length");
});
test("errorTempArrayValues", function() {
    var scene = new Scene();
    scene.loadLines("*temp_array foo 5 1 2 3 4 5 6");
    doh.assertError(Error, scene, "execute", null, "Expected 1 or 5 values for array foo not 6");
});
test("deleteCreateArray", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *create_array g_arr 3 1 2 3
                *delete_array g_arr`);
    scene.execute();
    doh.is("undefined", typeof scene.stats.g_arr_1, "scene.stats.g_arr_1");
    doh.is("undefined", typeof scene.stats.g_arr_2, "scene.stats.g_arr_2");
    doh.is("undefined", typeof scene.stats.g_arr_3, "scene.stats.g_arr_3");
});
test("deleteTempArray", function() {
    var scene = new Scene();
    scene.name = "startup";
    scene.loadLines(dedent`
                *temp_array t_arr 3
                *delete_array t_arr`);
    scene.execute();
    doh.is("undefined", typeof scene.temps.t_arr_1, "scene.temps.t_arr_1");
    doh.is("undefined", typeof scene.temps.t_arr_2, "scene.temps.t_arr_2");
    doh.is("undefined", typeof scene.temps.t_arr_3, "scene.temps.t_arr_3");
});
