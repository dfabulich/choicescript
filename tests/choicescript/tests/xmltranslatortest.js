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

function translateScene(text, expectedTranslation) {
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
  //output = output.replace(/\n/g, "\\n\"+\n\"");
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
            +"\n*elseif blah = 4"
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
          "<if>\n"+
          "<test><equals><variable name='blah' /><literal value='4'/></equals></test>\n"+
          "<result><finish />\n"+
          "</result></if>\n"+
          "</switch>";
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
          "<option>\n"+
          "<text>foo</text>\n"+
          "<finish />\n"+
          "</option>\n"+
          "<option>\n"+
          "<text>bar</text>\n"+
          "<finish />\n"+
          "</option>\n"+
          "<option>\n"+
          "<text>baz</text>\n"+
          "<finish />\n"+
          "</option>\n"+
          "<option>\n"+
          "<text>quz</text>\n"+
          "<finish />\n"+
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