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
dojo.provide("choicescript.tests.utiltest");

var fixture = choicescript.tests.utiltest;

//if (doh.registerUrl) {
//    var loaderHtml = dojo.moduleUrl("choicescript.tests", "loader.html");
//    doh.registerUrl(loaderHtml);
//}

function debughelp() {
    debugger;
}

doh.registerGroup("choicescript.tests.QueryParse", [
        function emptyString() {
            var map = parseQueryString("");
            doh.is(null, map);
        }
        ,function singleOption() {
            var map = parseQueryString("?foo=bar");
            doh.is({foo:"bar"}, map, "?foo=bar");
        }
        ,function multiOption() {
            var str = "?foo=bar&baz=quz";
            var map = parseQueryString(str);
            doh.is({foo:"bar",baz:"quz"}, map, str);
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