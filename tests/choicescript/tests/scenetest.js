/*
 * Copyright 2010 by Dan Fabulich.
 * 
 * Dan Fabulich licenses this file to you under the
 * ChoiceScript License, Version 1.0 (the "License"); you may
 * not use this file except in compliance with the License. 
 * You may obtain a copy of the License at
 * 
 *  http://www.choiceofgames.com/LICENSE-1.0.txt
 * 
 * See the License for the specific language governing
 * permissions and limitations under the License.
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied.
 */
dojo.provide("choicescript.tests.scenetest");

var fixture = choicescript.tests.scenetest;

//if (doh.registerUrl) {
//    var loaderHtml = dojo.moduleUrl("choicescript.tests", "loader.html");
//    doh.registerUrl(loaderHtml);
//}

function debughelp() {
    debugger;
}

doh.registerGroup("choicescript.tests.FullScene", [
        function errorIncreasingIndent() {
            var text = "foo\n  bar";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "execute", null, "Illegally increased indentation");
        }
        ,function errorInvalidCommand() {
            var text = "foo\n*bar";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "execute", null, "Invalid command");
        }
        ,function labelGoto() {
            printed = [];
            var text = "foo\n*goto foo\nskip me!\n*label foo\nbar";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("foo bar <br><br>", printed.join(""), "wrong printed value");
        }
        ,function gotoRef() {
            printed = [];
            var text = "foo\n*temp x\n*set x \"foo\"\n*gotoref x\nskip me!\n*label foo\nbar";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("foo bar <br><br>", printed.join(""), "wrong printed value");
        }
        ,function mixedCaseLabels() {
            printed = [];
            var text = "foo\n*goto foo\nskip me!\n*Label Foo\nbar";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("foo bar <br><br>", printed.join(""), "wrong printed value");
        }
        ,function finish() {
            printed = [];
            var text = "foo\n*finish\nskip me!";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("foo <br><br>", printed.join(""), "wrong printed value");
        }
    ]
);

doh.registerGroup("choicescript.tests.OptionParsing", [
        function single() {
            var text = "*choice\n  #foo\n    Foo!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":4,"group":"choice"}], options, "options");
        }
        ,function singleTabs() {
            var text = "*choice\n\t#foo\n\t\tFoo!\n\t#bar\n\t\tBar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":4,"group":"choice"}], options, "options");
        }
        ,function blankLine() {
            var text = "*choice\n  #foo\n    Foo!\n\n    Foo, I say!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":6,"group":"choice"}], options, "options");
        }
        ,function singlePrint() {
            var text = "*choice\n  #foo\n    Foo!\n  *print \"#ba\"&\"r\"\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":4,"group":"choice"}], options, "options");
        }
        ,function simpleConditionalTrue() {
            var text = "*choice\n  *if true\n    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":3,"group":"choice"},{"name":"bar","line":5,"group":"choice"}], options, "options");
        }
        ,function oneLineConditionalTrue() {
            var text = "*choice\n  *if (true) #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":4,"group":"choice"}], options, "options");
        }
        ,function simpleConditionalFalse() {
            var text = "*choice\n  *if false\n    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"bar","line":5,"group":"choice"}], options, "options");
        }
        ,function oneLineConditionalFalse() {
            var text = "*choice\n  *if (false)    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            debughelp();
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"bar","line":4,"group":"choice"}], options, "options");
        }
        ,function simpleConditionalElseTrue() {
            var text = "*choice\n  *if true\n    #foo\n      Foo!\n  *else\n    #fail\n      Fail!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            debughelp();
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":3,"group":"choice"},{"name":"bar","line":8,"group":"choice"}], options, "options");
        }
        ,function simpleConditionalElseFalse() {
            var text = "*choice\n  *if false\n    #fail\n      Fail!\n  *else\n    #foo\n      Foo!\n  #bar\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":6,"group":"choice"},{"name":"bar","line":8,"group":"choice"}], options, "options");
        }
        ,function nestedConditionalTrue() {
            var text = "*choice\n  *if true\n    *if true\n        #foo\n          foo\n          *finish\n    #bar\n      bar\n      *finish";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":4,"group":"choice"},{"name":"bar","line":7,"group":"choice"}], options, "options");
        }
        ,function multi() {
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
                {"name":"red","line":2,"group":"color",
                    "suboptions":[
                        {"name":"spaceship","line":3,"group":"toy"},
                        {"name":"yo-yo","line":5,"group":"toy"}
                    ]
                },
                {"name":"blue","line":7,"group":"color",
                    "suboptions":[
                        {"name":"spaceship","line":8,"group":"toy"},
                        {"name":"yo-yo","line":10,"group":"toy"}
                    ]
                }
            ];
            doh.is(expected, options, "options");
        }
        
        ,function errorInvalidIndent() {
            var text = "*choice\n    #foo\n  #bar";
            var scene = new Scene();
            scene.loadLines(text);
            //var options = scene.parseOptions(0, []);
            doh.assertError(Error, scene, "parseOptions", [0, []], "Invalid indent");
        }
        ,function errorTabMixing() {
            var text = "*choice\n\t #foo\n\t\tFoo!\n\t#bar\n\t\tBar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
        }
        ,function errorTabFirstSpaceLater() {
            var text = "*choice\n\t#foo\n        Foo!\n\t#bar\n\t\tBar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
        }
        ,function errorSpaceFirstTabLater() {
            var text = "*choice\n    #foo\n\t\tFoo!\n\t#bar\n\t\tBar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "parseOptions", [0, []], "mixing");
        }
        ,function errorNoChoices() {
            var text = "*choice\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            //var options = scene.parseOptions(0, []);
            doh.assertError(Error, scene, "parseOptions", [0, []], "No options");
        }
        ,function errorNoBody() {
            var text = "*choice\n  #foo\n  #bar";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "parseOptions", [0, []], "Expected choice body");
        }
        ,function errorNoBodyOneChoice() {
            var text = "*choice\n  #foo\nbar";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "parseOptions", [0, []], "Expected choice body");
        }
        ,function errorNoBodyMultiChoice() {
            var text = "*choice one two\n  #foo\n    #x\n  #bar\n    #x\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "parseOptions", [0, ["one", "two"]], "Expected choice body");
        }
        ,function errorNonOverlappingMultiChoice() {
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
        }
        ,function errorNonOverlappingMultiChoice2() {
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
        }
        ,function errorDupes() {
            var text = "*choice\n  #foo\n    Foo!\n  #foo\n    Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "parseOptions", [0, []], "Duplicate options");
        }    
    ]
);

doh.registerGroup("choicescript.tests.Random", [
        function testInt() {
            var stats = {test:null};
            var scene = new Scene("test", stats);
            var minPassed = maxPassed = false;
            for (var i = 0; !(minPassed && maxPassed) && i < 10000; i++) {
                scene.rand("test 1 6");
                var value = stats.test;
                if (value == 1) minPassed = true;
                if (value == 6) maxPassed = true;
            }
            doh.t(minPassed, "minPassed");
            doh.t(maxPassed, "maxPassed");
        }
        ,function testDecimal() {
            var stats = {test:null};
            var scene = new Scene("test", stats);
            var minPassed = maxPassed = false;
            for (var i = 0; !(minPassed && maxPassed) && i < 10000; i++) {
                scene.rand("test 1.0 6.0");
                var value = stats.test;
                if (value < 1.01) minPassed = true;
                if (value > 5.99) maxPassed = true;
            }
            doh.t(minPassed, "minPassed");
            doh.t(maxPassed, "maxPassed");
        }
    ]
);

doh.registerGroup("choicescript.tests.Set", [
        function setTemp() {
            var scene = new Scene();
            scene.loadLines("*temp foo\n*set foo 2");
            scene.execute();
            doh.is(2, scene.temps.foo, "scene.temps.foo");
        }
        ,function mixedCaseVariable() {
            var scene = new Scene();
            scene.loadLines("*temp Foo\n*set foo 2");
            scene.execute();
            doh.is(2, scene.temps.foo, "scene.temps.foo");
        }
        ,function deleteTemp() {
            var scene = new Scene();
            scene.loadLines("*temp foo\n*set foo 2\n*delete foo");
            scene.execute();
            doh.is("undefined", typeof scene.temps.foo, "typeof scene.temps.foo");
        }
        ,function setStat() {
            var scene = new Scene();
            scene.loadLines("*create foo\n*set foo 2");
            scene.execute();
            doh.is(2, scene.stats.foo, "scene.stats.foo");
        }
        ,function deleteStat() {
            var scene = new Scene();
            scene.loadLines("*create foo\n*set foo 2\n*delete foo");
            scene.execute();
            doh.is("undefined", typeof scene.stats.foo, "typeof scene.stats.foo");
        }
        ,function setTempOverridingStat() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*create foo\n*set foo 2\n*temp foo\n*set foo 3\n*print foo");
            scene.execute();
            doh.is(2, scene.stats.foo, "scene.stats.foo");
            doh.is(3, scene.temps.foo, "scene.temps.foo");
            doh.is("3 <br><br>", printed.join(""), "printed");
        }
        ,function deleteTempOverridingStat() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*create foo\n*set foo 2\n*temp foo\n*set foo 3\n*delete foo\n*print foo");
            scene.execute();
            doh.is(2, scene.stats.foo, "scene.stats.foo");
            doh.is("undefined", typeof scene.temps.foo, "typeof scene.temps.foo");
            doh.is("2 <br><br>", printed.join(""), "printed");
        }
        ,function implicitVariable() {
            var scene = new Scene();
            scene.loadLines("*create foo\n*set foo 2\n*set foo+2");
            scene.execute();
            doh.is(4, scene.stats.foo, "scene.stats.foo");
        }
        ,function errorInvalidVariable() {
            var scene = new Scene();
            scene.loadLines("*set 1 2");
            doh.assertError(Error, scene, "execute", null, "Invalid variable");
        }
        ,function errorNoVariable() {
            var scene = new Scene();
            scene.loadLines("*set () ()");
            doh.assertError(Error, scene, "execute", null, "No variable");
        }
        ,function errorNoExpression() {
            var scene = new Scene();
            scene.loadLines("*set foo");
            doh.assertError(Error, scene, "execute", null, "No expression");
        }
        ,function setRef() {
            var scene = new Scene();
            scene.loadLines("*create foo\n*create bar\n*set foo \"bar\"\n*setref foo 2");
            scene.execute();
            doh.is(2, scene.stats.bar, "scene.stats.bar");
        }
        ,function errorSetRefNoExpression() {
            var scene = new Scene();
            scene.loadLines("*create foo\n*create bar\n*set foo \"bar\"\n*setref foo");
            doh.assertError(Error, scene, "execute", null, "No expression");
        }
        ,function setRefWhitespace() {
            var scene = new Scene();
            scene.loadLines("*create foo\n*create bar\n*set foo \"bar\"\n*setref foo(2)");
            scene.execute();
            doh.is(2, scene.stats.bar, "scene.stats.bar");
            //doh.assertError(Error, scene, "execute", null, "No expression");
        }
    ]
);

doh.registerGroup("choicescript.tests.If", [
        function basic() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if true\n  Truthy\n  *finish\n*else\n  Falsish\n  *finish");
            scene.execute();
            doh.is("Truthy <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function extraLineBreak() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if true\n\n  Truthy\n  *finish\n*else\n  Falsish\n  *finish");
            scene.execute();
            doh.is("Truthy <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function testElse() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if false\n  Truthy\n  *finish\n*else\n  Falsish\n  *finish");
            scene.execute();
            doh.is("Falsish <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function testElseExtraLineBreak() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if false\n  Truthy\n  *finish\n*else\n\n  Falsish\n  *finish");
            scene.execute();
            doh.is("Falsish <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function testElseIfTrue() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if false\n  Truthy\n  *finish\n*elseif true\n  Elsey\n  *finish\n*else\n  Falsish\n  *finish");
            scene.execute();
            doh.is("Elsey <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function testElseIfFalse() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if false\n  Truthy\n  *finish\n*elseif false\n  Elsey\n  *finish\n*else\n  Falsish\n  *finish");
            scene.execute();
            doh.is("Falsish <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function testDoubleElseIf() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if false\n  Truthy\n  *finish\n*elseif false\n  Elsey\n  *finish\n*elseif true\n  Double Elsey\n  *finish\n*else\n  Falsish\n  *finish");
            scene.execute();
            doh.is("Double Elsey <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function nested() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if true\n  *if true\n    Truthy\n*label end");
            scene.execute();
            doh.is("Truthy <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function errorNonNestedElse() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if true\n  OK\n  *if false\n    Fail\n*else\n  Fail");
            doh.assertError(Error, scene, "execute", null, "fall into else");
        }
        ,function nestedExtraLineBreak() {
            printed = [];
            var scene = new Scene();
            scene.loadLines("*if true\n  *if true\n    Truthy\n\n  Still Truthy\n*label end");
            scene.execute();
            doh.is("Truthy <br><br>Still Truthy <br><br>", printed.join(""), "Wrong printed value");
        }
        ,function errorDrift() {
            var scene = new Scene();
            scene.loadLines("*if true\n        drift\n      drift\n    drift\n  drift");
            //TODO drift detection
            //doh.assertError(Error, scene, "execute", null, "drifting");
        }
    ]
);

doh.registerGroup("choicescript.tests.ComplexChoice", [
        function trueNestedIf() {
            var text = "*choice\n  #foo\n    Foo!\n  *if true\n    #bar\n      Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":5,"group":"choice"}], options, "options");
        }
        ,function falseNestedIf() {
            var text = "*choice\n  #foo\n    Foo!\n  *if false\n    #bar\n      Bar!\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"}], options, "options");
        }
        ,function trueNestedElse() {
            var text = "*choice\n  #foo\n    Foo!\n  *if true\n    #bar\n      Bar!\n    *goto end\n  *else\n    #baz\n      Baz!\n  *label end\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":5,"group":"choice"}], options, "options");
        }
        ,function falseNestedElse() {
            var text = "*choice\n  #foo\n    Foo!\n  *if false\n    #bar\n      Bar!\n    *goto end\n  *else\n    #baz\n      Baz!\n*label end\nbaz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"baz","line":9,"group":"choice"}], options, "options");
        }
        ,function twoFalseNestedElses() {
            var text = "*choice\n"+
            "  #foo\n"+
            "    Foo!\n"+
            "  *if false\n"+
            "    #bar\n"+
            "      Bar!\n"+
            "    *goto end\n"+
            "  *else\n"+
            "    #baz\n"+
            "      Baz!\n"+
            "  *if false\n"+
            "    #qoo\n"+
            "      Qoo!\n"+
            "    *goto end\n"+
            "  *else\n"+
            "    #quz\n"+
            "      Quz!\n"+
            "*label end\n"+
            "baz";
            var scene = new Scene();
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"baz","line":9,"group":"choice"},{"name":"quz","line":16,"group":"choice"}], options, "options");
        }
        // TODO add drift detection
        // ,function errorTwoFalseNestedElses() {
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
        //         }
        ,function printMenu() {
            var text = "*choice\n"+
                "  *label loop\n"+
                "  *if i < 3\n"+
                "    *print \"#\"&{\"friend_\" & i}\n"+
                "      *print \"You chose \" & choice_1\n"+
                "      *finish\n"+
                "    *set i+1\n"+
                "    *goto loop";
            var stats = {
                i:0
                ,friend_0: "Adam"
                ,friend_1: "Dan"
                ,friend_2: "Kevin"
            }
            var scene = new Scene("test", stats);
            scene.loadLines(text);
            var options = scene.parseOptions(0, []);
            doh.is([{"name":"Adam","line":4,"group":"choice"},{"name":"Dan","line":4,"group":"choice"},{"name":"Kevin","line":4,"group":"choice"}], options, "options");
        }
    ]
);

doh.registerGroup("choicescript.tests.ResolveChoice", [
        function single() {
            printed = [];
            var text = "*choice\n  #foo\n    Foo!\n    *finish\n  #bar\n    Bar!\n    *finish\nbaz";
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
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":5,"group":"choice"}], options, "options");
            scene.resolveChoice(options,groups);
            doh.is("Foo! <br><br>", printed.join(""), "printed");
        }
        ,function extraLineBreak() {
            printed = [];
            var text = "*choice\n  #foo\n\n    Foo!\n    *finish\n  #bar\n    Bar!\n    *finish\nbaz";
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
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":6,"group":"choice"}], options, "options");
            scene.resolveChoice(options,groups);
            doh.is("Foo! <br><br>", printed.join(""), "printed");
        }
        ,function fake() {
            printed = [];
            var text = "*fake_choice\n  #foo\n    Foo!\n  #bar\n    Bar!\nbaz";
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
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":4,"group":"choice"}], options, "options");
            scene.resolveChoice(options,groups);
            doh.is("Foo! baz <br><br>", printed.join(""), "printed");
        }
        ,function fakeNoBody() {
            printed = [];
            var text = "*fake_choice\n  #foo\n  #bar\nbaz";
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
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":3,"group":"choice"}], options, "options");
            scene.resolveChoice(options,groups);
            doh.is("baz <br><br>", printed.join(""), "printed");
        }
        ,function choiceTemp() {
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
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":5,"group":"choice"}], options, "options");
            scene.resolveChoice(options,groups);
            doh.is("Foo! foo <br><br>", printed.join(""), "printed");
        }
        ,function fallingChoices() {
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
            var formValues = {choice:1};
            scene.getFormValue = function(name) {return formValues[name];}
            scene.reset = function() {};
            scene.execute();
            doh.is([{"name":"foo","line":2,"group":"choice"},{"name":"bar","line":5,"group":"choice"}], options, "options");
            scene.resolveChoice(options, groups);
            doh.is([{"name":"one","line":9,"group":"choice"},{"name":"two","line":12,"group":"choice"}], options, "options");
            scene.resolveChoice(options, groups);
            doh.is("Bar baz two <br><br>", printed.join(""), "printed");
        }
    ]
);

function TokenizerTest(str, expected) {
    this.name = str;
    this.runTest = function() {
        var scene = new Scene();
        var actual = scene.tokenizeExpr(str);
        if (false) {
            var example = "'" + str.replace(/\\/g, "\\\\") + "'";
            print(example + ": " + toJson(actual));
        }
        doh.is(expected, actual, str);
    }
}

function TokenizerErrorTest(str) {
    this.name = str;
    this.runTest = function() {
        var scene = new Scene();
        //print(str);
        doh.assertError(Error, scene, "tokenizeExpr", str, "Invalid expression");
    }
}

var tokenizerTests = {
    '3': [{"value":"3","name":"NUMBER","pos":1}]
    ,"{\"fo\"&\"o\"}": [{"value":"{","name":"OPEN_CURLY","pos":1},{"value":"\"fo\"","name":"STRING","pos":5},{"value":"&","name":"OPERATOR","pos":6},{"value":"\"o\"","name":"STRING","pos":9},{"value":"}","name":"CLOSE_CURLY","pos":10}]
    ,'3.0': [{"value":"3.0","name":"NUMBER","pos":3}]
    ,'bar="blah"': [{"value":"bar","name":"VAR","pos":3},{"value":"=","name":"EQUALITY","pos":4},{"value":"\"blah\"","name":"STRING","pos":10}]
    ,'foo=2': [{"value":"foo","name":"VAR","pos":3},{"value":"=","name":"EQUALITY","pos":4},{"value":"2","name":"NUMBER","pos":5}]
    
    ,'foo%+50': [{"value":"foo","name":"VAR","pos":3},{"value":"%+","name":"FAIRMATH","pos":5},{"value":"50","name":"NUMBER","pos":7}]
    ,'"2"/2': [{"value":"\"2\"","name":"STRING","pos":3},{"value":"/","name":"OPERATOR","pos":4},{"value":"2","name":"NUMBER","pos":5}]
    ,'(foo=2) or (foo=3)': [{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"foo","name":"VAR","pos":4},{"value":"=","name":"EQUALITY","pos":5},{"value":"2","name":"NUMBER","pos":6},{"value":")","name":"CLOSE_PARENTHESIS","pos":7},{"value":"or","name":"BOOLEAN_OPERATOR","pos":10},{"value":"(","name":"OPEN_PARENTHESIS","pos":12},{"value":"foo","name":"VAR","pos":15},{"value":"=","name":"EQUALITY","pos":16},{"value":"3","name":"NUMBER","pos":17},{"value":")","name":"CLOSE_PARENTHESIS","pos":18}]
    ,'foo': [{"value":"foo","name":"VAR","pos":3}]
    ,'"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"': [{"value":'"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"',"name":"STRING","pos":42}]
    ,'2<=1': [{"value":"2","name":"NUMBER","pos":1},{"value":"<=","name":"INEQUALITY","pos":3},{"value":"1","name":"NUMBER","pos":4}]
    ,'8/2': [{"value":"8","name":"NUMBER","pos":1},{"value":"/","name":"OPERATOR","pos":2},{"value":"2","name":"NUMBER","pos":3}]
    ,'(true) and (false)': [{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"true","name":"VAR","pos":5},{"value":")","name":"CLOSE_PARENTHESIS","pos":6},{"value":"and","name":"BOOLEAN_OPERATOR","pos":10},{"value":"(","name":"OPEN_PARENTHESIS","pos":12},{"value":"false","name":"VAR","pos":17},{"value":")","name":"CLOSE_PARENTHESIS","pos":18}]
    ,'foo-3': [{"value":"foo","name":"VAR","pos":3},{"value":"-","name":"OPERATOR","pos":4},{"value":"3","name":"NUMBER","pos":5}]
    ,'((foo>4) and (foo<8)) or (bar=0)': [{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"(","name":"OPEN_PARENTHESIS","pos":2},{"value":"foo","name":"VAR","pos":5},{"value":">","name":"INEQUALITY","pos":6},{"value":"4","name":"NUMBER","pos":7},{"value":")","name":"CLOSE_PARENTHESIS","pos":8},{"value":"and","name":"BOOLEAN_OPERATOR","pos":12},{"value":"(","name":"OPEN_PARENTHESIS","pos":14},{"value":"foo","name":"VAR","pos":17},{"value":"<","name":"INEQUALITY","pos":18},{"value":"8","name":"NUMBER","pos":19},{"value":")","name":"CLOSE_PARENTHESIS","pos":20},{"value":")","name":"CLOSE_PARENTHESIS","pos":21},{"value":"or","name":"BOOLEAN_OPERATOR","pos":24},{"value":"(","name":"OPEN_PARENTHESIS","pos":26},{"value":"bar","name":"VAR","pos":29},{"value":"=","name":"EQUALITY","pos":30},{"value":"0","name":"NUMBER","pos":31},{"value":")","name":"CLOSE_PARENTHESIS","pos":32}]
    ,'&"blah blah"': [{"value":"&","name":"OPERATOR","pos":1},{"value":"\"blah blah\"","name":"STRING","pos":12}]
    ,'{"fo"&"o"}': [{"value":"{","name":"OPEN_CURLY","pos":1},{"value":"\"fo\"","name":"STRING","pos":5},{"value":"&","name":"OPERATOR","pos":6},{"value":"\"o\"","name":"STRING","pos":9},{"value":"}","name":"CLOSE_CURLY","pos":10}]
    ,'2*3': [{"value":"2","name":"NUMBER","pos":1},{"value":"*","name":"OPERATOR","pos":2},{"value":"3","name":"NUMBER","pos":3}]
}

var tokenizerErrorTests = ["_", "*print", '"foo'];

(function(){
for (var key in tokenizerTests) {
    var expected = tokenizerTests[key];
    var tokenizerTest = new TokenizerTest(key, expected);
    doh.registerTest("choicescript.tests.TokenizerTests", tokenizerTest);
}
})();

(function(){
for (var i = 0; i < tokenizerErrorTests.length; i++) {
    var tet = new TokenizerErrorTest(tokenizerErrorTests[i]);
    doh.registerTest("choicescript.tests.TokenizerErrorTests", tet);
}

})();

doh.registerGroup("choicescript.tests.ExpressionEvaluator", [
        function simpleValue() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("3");
            doh.is([{"value":"3","name":"NUMBER","pos":1}], stack, "stack");
            var actual = scene.evaluateExpr(stack);
            doh.is(3, actual, 3);
        }
        ,function simpleParenthetical() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("(3)");
            //print(toJson(stack))
            doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"3","name":"NUMBER","pos":2},{"value":")","name":"CLOSE_PARENTHESIS","pos":3}], stack, "stack");
            var actual = scene.evaluateExpr(stack);
            doh.is(3, actual, 3);
        }
        ,function twoPlusTwo() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("2+2");
            //print(toJson(stack))
            doh.is([{"value":"2","name":"NUMBER","pos":1},{"value":"+","name":"OPERATOR","pos":2},{"value":"2","name":"NUMBER","pos":3}], stack, "stack");
            var actual = scene.evaluateExpr(stack);
            doh.is(4, actual, 4);
        }
        ,function twoPlusTwoParenthetical() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("(2+2)");
            //print(toJson(stack))
            doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"2","name":"NUMBER","pos":2},{"value":"+","name":"OPERATOR","pos":3},{"value":"2","name":"NUMBER","pos":4},{"value":")","name":"CLOSE_PARENTHESIS","pos":5}], stack, "stack");
            var actual = scene.evaluateExpr(stack);
            doh.is(4, actual, 4);
        }
        ,function errorSimpleParentheticalMissingClose() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("(3");
            //print(toJson(stack))
            doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"3","name":"NUMBER","pos":2}], stack, "stack");
            doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
        }
        ,function errorTwoPlusTwoParentheticalMissingClose() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("(2+2");
            //print(toJson(stack))
            doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"2","name":"NUMBER","pos":2},{"value":"+","name":"OPERATOR","pos":3},{"value":"2","name":"NUMBER","pos":4}], stack, "stack");
            doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
        }
        ,function twoPlusTwoParentheticalMissingCloseWrongToken() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("(2+2 4");
            //print(toJson(stack))
            doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"2","name":"NUMBER","pos":2},{"value":"+","name":"OPERATOR","pos":3},{"value":"2","name":"NUMBER","pos":4},{"value":"4","name":"NUMBER","pos":6}], stack, "stack");
            doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
        }
        ,function errorTwoPlusTwoFour() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("2+2 4");
            //print(toJson(stack))
            doh.is([{"value":"2","name":"NUMBER","pos":1},{"value":"+","name":"OPERATOR","pos":2},{"value":"2","name":"NUMBER","pos":3},{"value":"4","name":"NUMBER","pos":5}], stack, "stack");
            doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
        }
        ,function errorMissingOperator() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("3 3");
            //print(toJson(stack))
            doh.is([{"value":"3","name":"NUMBER","pos":1},{"value":"3","name":"NUMBER","pos":3}], stack, "stack");
            doh.assertError(Error, scene, "evaluateExpr", stack, "Invalid expression");
        }
        ,function errorEmptyStack() {
            var scene = new Scene();
            doh.assertError(Error, scene, "evaluateExpr", [], "Invalid expression");
        }
    ]
);

doh.registerGroup("choicescript.tests.TokenEvaluator", [
        function num() {
            var stack = [{"value":"2","name":"NUMBER","pos":1}];
            var token = stack.shift();
            var scene = new Scene();
            var actual = scene.evaluateValueToken(token, stack);
            doh.is(2, actual, 2);
        }
        ,function str() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr('"two"');
            //print(toJson(stack))
            doh.is([{"value":"\"two\"","name":"STRING","pos":5}], stack, "stack");
            var token = stack.shift();
            var actual = scene.evaluateValueToken(token, stack);
            doh.is("two", actual, "two");
        }
        ,function quotedStr() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr('"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"');
            //print(toJson(stack))
            doh.is([{"value":'"she \\\\said\\\\ it\\\\\\" \\\\\\\\ was \\"ironic\\"!"',"name":"STRING","pos":42}], stack, "stack");
            var token = stack.shift();
            var actual = scene.evaluateValueToken(token, stack);
            doh.is("she \\said\\ it\\\" \\\\ was \"ironic\"!", actual, "she \\said\\ it\\\" \\\\ was \"ironic\"!");
        }
        ,function variable() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr('true');
            //print(toJson(stack))
            doh.is([{"value":"true","name":"VAR","pos":4}], stack, "stack");
            var token = stack.shift();
            var actual = scene.evaluateValueToken(token, stack);
            doh.is(true, actual, true);
        }
        ,function parenthetical() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr("(3)");
            //print(toJson(stack))
            doh.is([{"value":"(","name":"OPEN_PARENTHESIS","pos":1},{"value":"3","name":"NUMBER","pos":2},{"value":")","name":"CLOSE_PARENTHESIS","pos":3}], stack, "stack");
            var token = stack.shift();
            var actual = scene.evaluateValueToken(token, stack);
            doh.is(3, actual, 3);
        }
        ,function curly() {
            var scene = new Scene();
            var stack = scene.tokenizeExpr('{"true"}');
            //print(toJson(stack))
            doh.is([{"value":"{","name":"OPEN_CURLY","pos":1},{"value":"\"true\"","name":"STRING","pos":7},{"value":"}","name":"CLOSE_CURLY","pos":8}], stack, "stack");
            var token = stack.shift();
            var actual = scene.evaluateValueToken(token, stack);
            doh.is(true, actual, true);
        }
    ]
);

doh.registerGroup("choicescript.tests.Operators", [
        function add() {
            var value = Scene.operators["+"]("1", "2");
            doh.is(3, value, 3);
        }
        ,function subtract() {
            var value = Scene.operators["-"]("6", "2");
            doh.is(4, value, 4);
        }
        ,function multiply() {
            var value = Scene.operators["*"]("6", "2");
            doh.is(12, value, 12);
        }
        ,function divide() {
            var value = Scene.operators["/"]("6", "2");
            doh.is(3, value, 3);
        }
        ,function concatenate() {
            var value = Scene.operators["&"]("6", "2");
            doh.is(62, value, 62);
        }
        ,function fairPlus() {
            var value = Scene.operators["%+"]("50", "20");
            doh.is(60, value, 60);
        }
        ,function fairMinus() {
            var value = Scene.operators["%-"]("50", "20");
            doh.is(40, value, 40);
        }
        ,function equals() {
            var value = Scene.operators["="]("50", "50");
            doh.is(true, value, true);
        }
        ,function lessThan() {
            var value = Scene.operators["<"]("50", "45");
            doh.is(false, value, false);
        }
        ,function greaterThan() {
            var value = Scene.operators[">"]("50", "45");
            doh.is(true, value, true);
        }
        ,function lessThanOrEquals() {
            var value = Scene.operators["<="]("50", "45");
            doh.is(false, value, false);
        }
        ,function greaterThanOrEquals() {
            var value = Scene.operators[">="]("50", "45");
            doh.is(true, value, true);
        }
        ,function notEquals() {
            var value = Scene.operators["!="]("0", "");
            doh.is(true, value, true);
        }
        ,function and() {
            var value = Scene.operators["and"](true, true);
            doh.is(true, value, true);
        }
        ,function or() {
            var value = Scene.operators["or"](false, true);
            doh.is(true, value, true);
        }
        
    ]
);

doh.registerGroup("choicescript.tests.LineBreaks", [
        function noBreaks() {
            printed = [];
            var text = "No line breaks";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("No line breaks <br><br>", printed.join(""), "printed");
        }
        ,function oneTrailingBreak() {
            printed = [];
            var text = "One trailing break\n";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("One trailing break <br><br>", printed.join(""), "printed");
        }
        ,function singleBreakNoBr() {
            printed = [];
            var text = "This is\none sentence";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("This is one sentence <br><br>", printed.join(""), "printed");
        }
        ,function doubleBreakDoubleBr() {
            printed = [];
            var text = "This is one sentence.\n\nThis is another.";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("This is one sentence. <br><br>This is another. <br><br>", printed.join(""), "printed");
        }
        ,function doubleBreakAfterPrint() {
            printed = [];
            var text = '*print "This is one sentence."\n\nThis is another.';
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("This is one sentence. <br><br>This is another. <br><br>", printed.join(""), "printed");
        }
        ,function tripleBreakDoubleBr() {
            printed = [];
            var text = "This is one sentence.\n\n\nThis is another.";
            var scene = new Scene();
            scene.loadLines(text);
            scene.execute();
            doh.is("This is one sentence. <br><br>This is another. <br><br>", printed.join(""), "printed");
        }
    ]
);

doh.registerGroup("choicescript.tests.VariableInterpolation", [
        function replacement() {
            printed = [];
            var text = "This ${foo} is a ${bar}.";
            var stats = {foo:"foo", bar:"bar"};
            var scene = new Scene("test", stats);
            scene.loadLines(text);
            scene.execute();
            doh.is("This foo is a bar. <br><br>", printed.join(""), "printed");
        }
        ,function unknownVariable() {
            var text = "Unknown variable: ${foo}.";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "execute", null, "Unknown variable");
        }
        ,function invalidExpression() {
            var text = "Invalid expression: ${foo.";
            var scene = new Scene();
            scene.loadLines(text);
            doh.assertError(Error, scene, "execute", null, "Invalid expresison");
        }
        ,function capitalize() {
            printed = [];
            var text = "This ${foo} is a true $!{Foo}.";
            var stats = {foo:"foo"};
            var scene = new Scene("test", stats);
            scene.loadLines(text);
            scene.execute();
            doh.is("This foo is a true Foo. <br><br>", printed.join(""), "printed");
        }
    ]
);

doh.registerGroup("choicescript.tests.ParseStatChart", [
        function noLabels() {
            var text = "*stat_chart\n"
              + "  percent foo\n"
              + "  percent bar\n"
              + "  text baz\n"
              + "  text quz\n";
            var scene = new Scene("test", {foo:50, bar:50, baz: "blah", quz:"urk"});
            scene.loadLines(text);
            var rows = scene.parseStatChart();
            var expected = '['
              +'{"type":"percent","label":"foo","variable":"foo"},'
              +'{"type":"percent","label":"bar","variable":"bar"},'
              +'{"type":"text","label":"baz","variable":"baz"},'
              +'{"type":"text","label":"quz","variable":"quz"}'
              +']';
            doh.is(expected, toJson(rows), "parsed");
        }
        ,function labels() {
            var text = "*stat_chart\n"
              + "  percent foo One\n"
              + "  percent bar Two Three\n"
              + "  text baz Four  Five\n"
              + "  text quz Six Seven!\n";
            var scene = new Scene("test", {foo:50, bar:50, baz: "blah", quz:"urk"});
            scene.loadLines(text);
            var rows = scene.parseStatChart();
            var expected = '['
              +'{"type":"percent","label":"One","variable":"foo"},'
              +'{"type":"percent","label":"Two Three","variable":"bar"},'
              +'{"type":"text","label":"Four  Five","variable":"baz"},'
              +'{"type":"text","label":"Six Seven!","variable":"quz"}'
              +']';
            doh.is(expected, toJson(rows), "parsed");
        }
        ,function opposedPairs() {
            var text = "*stat_chart\n"
              + "  opposed_pair Leadership\n"
              + "    Honesty\n"
              + "  opposed_pair strength\n"
              + "    Strength\n"
              + "    Weakness\n"
            var scene = new Scene("test", {leadership:50, strength:50});
            scene.loadLines(text);
            var rows = scene.parseStatChart();
            var expected = '['
              +'{"opposed_label":"Honesty","type":"opposed_pair","variable":"Leadership","label":"Leadership"},'
              +'{"opposed_label":"Weakness","type":"opposed_pair","variable":"strength","label":"Strength"}'
              +']';
            doh.is(expected, toJson(rows), "parsed");
        }
        ,function definitions() {
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
            var expected = '['
              +'{"opposed_label":"Honesty","type":"opposed_pair","definition":"Managing","variable":"Leadership","label":"Leadership","opposed_definition":"Clueless"},'
              +'{"type":"percent","definition":"Vigor","variable":"strength","label":"strength"}'
              +']';
            doh.is(expected, toJson(rows), "parsed");
        }
    ]
);

/*
doh.register("choicescript.tests.ExpressionParsing", [
        { name: "My Function Test [_myfunc()]", 
            timeout: 4000, 
            runTest: function(){ 
                this.scene = new Scene("test", {});
                doh.assertEqual("test", this.scene.name); 
            } 
        } 
    ]
); 
*/