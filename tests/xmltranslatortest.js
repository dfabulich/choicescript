
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
  output = output.replace(/ line='\d+'/g, "");
  if (format) output = '"' + output.replace(/\n/g, "\\n\"+\n\"");
  equal(output, expectedTranslation, "translation");
}


test("textOnly", function() {
  var scene = "foo\nbar\nbaz";
  translateScene(scene, "<p>foo bar baz </p>\n");
})
test("basicIf", function() {
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
  "<set variable='blah'><text>2</text></set>\n"+
  "<switch>\n"+
  "<if>\n"+
  "<test><equals><variable name='blah' /><text>2</text></equals></test>\n"+
  "<result><finish />\n"+
  "</result></if>\n"+
  "<if>\n"+
  "<test><equals><variable name='blah' /><text>3</text></equals></test>\n"+
  "<result><finish />\n"+
  "</result></if>\n"+
  "<else><finish />\n"+
  "</else></switch>";
  translateScene(scene,  expected);
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
})
test("testXmlEscape", function() {
  var scene = ""
    +"\n*temp pal"
    +"\n*set pal \"pal '\\\"<>\""
    +"\nThis & That's <\"Life\"> ${pal}"
    +"\n*choice"
    +"\n  #This & That's <\"Life\"> ${pal}"
    +"\n    This & That's <\"Life\"> ${pal}"
    +"\n    *finish"
    +"\n  #bar"
    +"\n    *finish"
  ;
  var expected = "<paragraph-break />\n"+
    "<temp variable='pal'/>\n"+
    "<set variable='pal'><text>pal '\"&lt;&gt;</text></set>\n"+
    "<p>This &amp; That's &lt;\"Life\"&gt; <print capitalize='false'><variable name='pal'/></print> </p>\n"+
    "<choice>\n"+
    "<option reuse='allow'>\n"+
    "<text>This &amp; That's &lt;\"Life\"&gt; <print capitalize='false'><variable name='pal'/></print></text>\n"+
    "<p>This &amp; That's &lt;\"Life\"&gt; <print capitalize='false'><variable name='pal'/></print> </p>\n"+
    "<finish />\n"+
    "</option>\n"+
    "<option reuse='allow'>\n"+
    "<text>bar</text>\n"+
    "<finish />\n"+
    "</option>\n"+
    "</choice>\n";
  translateScene(scene, expected);
})
test("ifInChoice", function() {
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
})
test("nestedIfInChoice", function() {
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
})
test("simpleConditionalElseTrue", function() {
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
})
test("simpleConditionalElseIf", function() {
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
})
test("longerConditionalElseIf", function() {
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
})
test("nestedConditionalElseIf", function() {
  var scene = "*choice\n"
  +"  *if foo\n"
  +"    #foo\n"
  +"      Foo!\n"
  +"    *if bar\n"
  +"      #bar\n"
  +"        Bar!\n"
  +"    *elseif more\n"
  +"      #more\n"
  +"        More!\n"
  +"    *else\n"
  +"      #baz\n"
  +"        Baz!\n"
  +"  *else\n"
  +"    #No foo\n"
  +"      no foo\n"
  +"    *if bar\n"
  +"      #bar\n"
  +"        Bar!\n"
  +"    *elseif more\n"
  +"      #more\n"
  +"        More!\n"
  +"    *else\n"
  +"      #baz\n"
  +"        Baz!\n"
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
    "<and><variable name='foo' /><variable name='bar' /></and></test>\n"+
    "<option reuse='allow'>\n"+
    "<text>bar</text>\n"+
    "<p>Bar! </p>\n"+
    "</option>\n"+
    "</if>\n"+
    "<if><test>\n"+
    "<and><variable name='foo' /><and><variable name='more' /><equals><variable name='bar' /><variable name='false' /></equals></and></and></test>\n"+
    "<option reuse='allow'>\n"+
    "<text>more</text>\n"+
    "<p>More! </p>\n"+
    "</option>\n"+
    "</if>\n"+
    "<if><test>\n"+
    "<and><variable name='foo' /><equals><or><variable name='bar' /><variable name='more' /></or><variable name='false' /></equals></and></test>\n"+
    "<option reuse='allow'>\n"+
    "<text>baz</text>\n"+
    "<p>Baz! </p>\n"+
    "</option>\n"+
    "</if>\n"+
    "<if><test>\n"+
    "<equals><variable name='foo' /><variable name='false' /></equals></test>\n"+
    "<option reuse='allow'>\n"+
    "<text>No foo</text>\n"+
    "<p>no foo </p>\n"+
    "</option>\n"+
    "</if>\n"+
    "<if><test>\n"+
    "<and><equals><variable name='foo' /><variable name='false' /></equals><variable name='bar' /></and></test>\n"+
    "<option reuse='allow'>\n"+
    "<text>bar</text>\n"+
    "<p>Bar! </p>\n"+
    "</option>\n"+
    "</if>\n"+
    "<if><test>\n"+
    "<and><equals><variable name='foo' /><variable name='false' /></equals><and><variable name='more' /><equals><variable name='bar' /><variable name='false' /></equals></and></and></test>\n"+
    "<option reuse='allow'>\n"+
    "<text>more</text>\n"+
    "<p>More! </p>\n"+
    "</option>\n"+
    "</if>\n"+
    "<if><test>\n"+
    "<and><equals><variable name='foo' /><variable name='false' /></equals><equals><or><variable name='bar' /><variable name='more' /></or><variable name='false' /></equals></and></test>\n"+
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
})
test("reuse", function() {
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
    "</option>\n"+
    "</choice>\n"+
    "<paragraph-break />\n";
  translateScene(scene, expected);
})
test("restoreGameBasic", function() {
  var scene = "*restore_game";
  translateScene(scene,  "<restore-game></restore-game>\n");
})
test("restoreGameExclude", function() {
  var scene = "*restore_game\n  Episode3 Sorry, this episode & blah blah!";
  translateScene(scene,  "<restore-game><scene name='episode3'>Sorry, this episode &amp; blah blah!</scene></restore-game>\n");
})
test("variablized string", function() {
  var scene = ""
    +"*temp foo\n"
    +"*set foo 1\n"
    +"*temp bar\n"
    +"*set bar \"foo = ${foo}\"\n"
    +"${bar}\n"
  var expected =  "<temp variable='foo'/>\n"+
    "<set variable='foo'><text>1</text></set>\n"+
    "<temp variable='bar'/>\n"+
    "<set variable='bar'><text>foo = <print capitalize='false'><variable name='foo'/></print></text></set>\n"+
    "<p><print capitalize='false'><variable name='bar'/></print> </p>\n"+
    "<paragraph-break />\n";
  translateScene(scene, expected);
})
test("mixed conditional style", function() {
  var scene = ""
    +"*choice\n"
    +"  *if foo\n"
    +"    *if (bar) #Bar1\n"
    +"      Bar!\n"
    +"      *finish\n"
    +"    *if (bar) #Bar2\n"
    +"      Bar2\n"
    +"      *finish\n"
    +"  *if (baz) #Baz\n"
    +"    Baz\n"
  var expected =  "<choice>\n"
    +"<if><test>\n"
    +"<and><variable name='foo' /><variable name='bar' /></and></test>\n"
    +"<option reuse='allow'>\n"
    +"<text>Bar1</text>\n"
    +"<p>Bar! </p>\n"
    +"<finish />\n"
    +"</option>\n"
    +"</if>\n"
    +"<if><test>\n"
    +"<and><variable name='foo' /><variable name='bar' /></and></test>\n"
    +"<option reuse='allow'>\n"
    +"<text>Bar2</text>\n"
    +"<p>Bar2 </p>\n"
    +"<finish />\n"
    +"</option>\n"
    +"</if>\n"
    +"<if><test>\n"
    +"<variable name='baz' /></test>\n"
    +"<option reuse='allow'>\n"
    +"<text>Baz</text>\n"
    +"<p>Baz </p>\n"
    +"</option>\n"
    +"</if>\n"
    +"</choice>\n"
    +"<paragraph-break />\n";
  translateScene(scene, expected);
})
