dojo.provide("shrinksafe.tests.module");

shrinksafe.tests.module.getContents = function(path){
	path = "../shrinksafe/tests/" + path;
	return readFile(path);
}
shrinksafe.tests.module.compress = function(source){
	return new String(Packages.org.dojotoolkit.shrinksafe.Compressor.compressScript(source, 0, 1)).toString();
}

try{
	tests.register("shrinksafe", 
	[
		function nestedReference(t){
			var original = shrinksafe.tests.module.getContents("5303.js");
			var compressed = shrinksafe.tests.module.compress(original);
			t.assertTrue(original.length > compressed.length);
			t.assertTrue(compressed.indexOf("say_hello") == -1)
			t.assertTrue(compressed.indexOf("callback") == -1)

			eval(compressed);
			// make sure it runs to completion
			t.assertEqual("hello worldhello world", result);
			// globals must not be renamed
			t.assertEqual("function", typeof CallMe);
			delete result;
		}
	]);
}catch(e){
	doh.debug(e);
}
