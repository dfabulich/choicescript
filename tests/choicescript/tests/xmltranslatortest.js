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
dojo.provide("choicescript.tests.xmltranslatortest");

var fixture = choicescript.tests.xmltranslatortest;

function xmlTranslatorTestOverride() {}

load(path + "../xmltranslator.js");

//if (doh.registerUrl) {
//    var loaderHtml = dojo.moduleUrl("choicescript.tests", "loader.html");
//    doh.registerUrl(loaderHtml);
//}

function debughelp() {
    debugger;
}

function translateScene(text, expectedTranslation, format) {
  var scene = new XmlScene();
  var outputBuffer = [];
  writer = {close: function(){},
    write: function(output) {
      outputBuffer.push(output);
    }
  };
  scene.loadLines(text);
  scene.execute();
  closePara();
  var output = outputBuffer.join("");
  if (format) output = '"' + output.replace(/\n/g, "\\n\"+\n\"");
  doh.is(expectedTranslation, output, "wrong translation");
}

doh.registerGroup("choicescript.tests.Xmltranslator", [
        function textOnly() {
          var scene = "foo\nbar\nbaz";
          translateScene(scene, "<p>foo bar baz </p>\n");
        }
        ,function basicIf() {
          var scene = ""
            +"\n*temp blah"
            +"\n*set blah 2"
            +"\n*if blah = 2"
            +"\n  *finish"
            +"\n*elseif blah = 3"
            +"\n  *finish"
            +"\n*else"
            +"\n  *finish"
          ;
          var expected = "<paragraph-break />\n"+
          "<temp variable='blah'/>\n"+
          "<set variable='blah'><literal value='2'/></set>\n"+
          "<switch>\n"+
          "<if>\n"+
          "<test><equals><variable name='blah' /><literal value='2'/></equals></test>\n"+
          "<result><finish />\n"+
          "</result></if>\n"+
          "<if>\n"+
          "<test><equals><variable name='blah' /><literal value='3'/></equals></test>\n"+
          "<result><finish />\n"+
          "</result></if>\n"+
          "<else><finish />\n"+
          "</else></switch>";
          translateScene(scene,  expected);
        }
        ,function basicChoice() {
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
          var expected = "<paragraph-break />\n"+
          "<p>Foo </p>\n"+
          "<choice>\n"+
          "<option reuse='allow'>\n"+
          "<text>foo</text>\n"+
          "<finish />\n"+
          "</option>\n"+
          "<option reuse='allow'>\n"+
          "<text>bar</text>\n"+
          "<finish />\n"+
          "</option>\n"+
          "<option reuse='allow'>\n"+
          "<text>baz</text>\n"+
          "<finish />\n"+
          "</option>\n"+
          "<option reuse='allow'>\n"+
          "<text>quz</text>\n"+
          "<finish />\n"+
          "</option>\n"+
          "</choice>\n";
          translateScene(scene, expected);
        }
        ,function ifInChoice() {
          var scene = ""
            +"\n*choice"
            +"\n  *if foo"
            +"\n    #Foo"
            +"\n      *finish"
            +"\n  *if bar"
            +"\n    #Bar"
            +"\n      *finish";
          var expected = "<paragraph-break />\n"+
            "<choice>\n"+
            "<if><test>\n"+
            "<variable name='foo' /></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>Foo</text>\n"+
            "<finish />\n"+
            "</option>\n"+
            "</if>\n"+
            "<if><test>\n"+
            "<variable name='bar' /></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>Bar</text>\n"+
            "<finish />\n"+
            "</option>\n"+
            "</if>\n"+
            "</choice>\n"
          translateScene(scene, expected);
        }
        ,function nestedIfInChoice() {
          var scene = ""
            +"\n*choice"
            +"\n  *if foo"
            +"\n    *if bar"
            +"\n      #FooBar"
            +"\n        *finish"
            +"\n  *if bar"
            +"\n    #Bar"
            +"\n      *finish"
            +"\n  *if foo"
            +"\n    *if bar"
            +"\n      *if baz"
            +"\n        #FooBarBaz"
            +"\n          *finish";
          var expected = "<paragraph-break />\n"+
             "<choice>\n"+
             "<if><test>\n"+
             "<and><variable name='foo' /><variable name='bar' /></and></test>\n"+
             "<option reuse='allow'>\n"+
             "<text>FooBar</text>\n"+
             "<finish />\n"+
             "</option>\n"+
             "</if>\n"+
             "<if><test>\n"+
             "<variable name='bar' /></test>\n"+
             "<option reuse='allow'>\n"+
             "<text>Bar</text>\n"+
             "<finish />\n"+
             "</option>\n"+
             "</if>\n"+
             "<if><test>\n"+
             "<and><and><variable name='foo' /><variable name='bar' /></and><variable name='baz' /></and></test>\n"+
             "<option reuse='allow'>\n"+
             "<text>FooBarBaz</text>\n"+
             "<finish />\n"+
             "</option>\n"+
             "</if>\n"+
             "</choice>\n";
          translateScene(scene, expected);
        }
        ,function simpleConditionalElseTrue() {
          var scene = "*choice\n  *if true\n    #foo\n      Foo!\n  *else\n    #fail\n      Fail!\n  #bar\n    Bar!\nbaz";
          var expected = "<choice>\n"+
           "<if><test>\n"+
           "<variable name='true' /></test>\n"+
           "<option reuse='allow'>\n"+
           "<text>foo</text>\n"+
           "<p>Foo! </p>\n"+
           "</option>\n"+
           "</if>\n"+
           "<if><test>\n"+
           "<equals><variable name='true' /><variable name='false' /></equals></test>\n"+
           "<option reuse='allow'>\n"+
           "<text>fail</text>\n"+
           "<p>Fail! </p>\n"+
           "</option>\n"+
           "</if>\n"+
           "<option reuse='allow'>\n"+
           "<text>bar</text>\n"+
           "<p>Bar! </p>\n"+
           "</option>\n"+
           "</choice>\n"+
           "<p>baz </p>\n";
          translateScene(scene, expected);
        }
        ,function simpleConditionalElseIf() {
          var scene = "*choice\n"
          +"  *if foo\n"
          +"    #foo\n"
          +"      Foo!\n"
          +"  *elseif bar\n"
          +"    #bar\n"
          +"      Bar!\n"
          +"  *else\n"
          +"    #baz\n"
          +"      Baz!\n"
          +"  #Quz\n"
          +"    Quz!\n"
          +"baz";
          var expected = "<choice>\n"+
            "<if><test>\n"+
            "<variable name='foo' /></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>foo</text>\n"+
            "<p>Foo! </p>\n"+
            "</option>\n"+
            "</if>\n"+
            "<if><test>\n"+
            "<and><variable name='bar' /><equals><variable name='foo' /><variable name='false' /></equals></and></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>bar</text>\n"+
            "<p>Bar! </p>\n"+
            "</option>\n"+
            "</if>\n"+
            "<if><test>\n"+
            "<equals><or><variable name='foo' /><variable name='bar' /></or><variable name='false' /></equals></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>baz</text>\n"+
            "<p>Baz! </p>\n"+
            "</option>\n"+
            "</if>\n"+
            "<option reuse='allow'>\n"+
            "<text>Quz</text>\n"+
            "<p>Quz! </p>\n"+
            "</option>\n"+
            "</choice>\n"+
            "<p>baz </p>\n";
          translateScene(scene, expected);
        }
        ,function longerConditionalElseIf() {
          var scene = "*choice\n"
          +"  *if foo\n"
          +"    #foo\n"
          +"      Foo!\n"
          +"  *elseif bar\n"
          +"    #bar\n"
          +"      Bar!\n"
          +"  *elseif more\n"
          +"    #more\n"
          +"      More!\n"
          +"  *else\n"
          +"    #baz\n"
          +"      Baz!\n"
          +"  #Quz\n"
          +"    Quz!\n"
          +"baz";
          var expected = "<choice>\n"+
            "<if><test>\n"+
            "<variable name='foo' /></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>foo</text>\n"+
            "<p>Foo! </p>\n"+
            "</option>\n"+
            "</if>\n"+
            "<if><test>\n"+
            "<and><variable name='bar' /><equals><variable name='foo' /><variable name='false' /></equals></and></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>bar</text>\n"+
            "<p>Bar! </p>\n"+
            "</option>\n"+
            "</if>\n"+
            "<if><test>\n"+
            "<and><variable name='more' /><equals><or><variable name='foo' /><variable name='bar' /></or><variable name='false' /></equals></and></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>more</text>\n"+
            "<p>More! </p>\n"+
            "</option>\n"+
            "</if>\n"+
            "<if><test>\n"+
            "<equals><or><or><variable name='foo' /><variable name='bar' /></or><variable name='more' /></or><variable name='false' /></equals></test>\n"+
            "<option reuse='allow'>\n"+
            "<text>baz</text>\n"+
            "<p>Baz! </p>\n"+
            "</option>\n"+
            "</if>\n"+
            "<option reuse='allow'>\n"+
            "<text>Quz</text>\n"+
            "<p>Quz! </p>\n"+
            "</option>\n"+
            "</choice>\n"+
            "<p>baz </p>\n";
          translateScene(scene, expected);
        }
        ,function reuse() {
          var scene = ""
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
          var expected =   "<label id='start'/>\n"+
            "<p>What do you want to do? </p>\n"+
            "<choice>\n"+
            "<option reuse='hide'>\n"+
            "<text>A little of this.</text>\n"+
            "<p>You do some of this. </p>\n"+
            "<include label='start'/>\n"+
            "</option>\n"+
            "<option reuse='disable'>\n"+
            "<text>A little of that.</text>\n"+
            "<p>You do some of that. </p>\n"+
            "<include label='start'/>\n"+
            "</option>\n"+
            "<option reuse='allow'>\n"+
            "<text>Let me think about it a little longer.</text>\n"+
            "<p>Very well. </p>\n"+
            "<include label='start'/>\n"+
            "</option>\n"+
            "<option reuse='allow'>\n"+
            "<text>What was the question?</text>\n"+
            "<p>Quit stalling! </p>\n"+
            "<include label='start'/>\n"+
            "</option>\n"+
            "<option reuse='allow'>\n"+
            "<text>Nothing; I'm done.</text>\n"+
            "<p>OK! </p>\n"+
            "<finish />\n"+
            "<paragraph-break />\n"+
            "</option>\n"+
            "</choice>\n";
          translateScene(scene, expected);
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