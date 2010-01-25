<?
	$buildScriptsDir = "/Users/jrbsilver/svn/dojo/branches/0.4/buildscripts";
	$buildCacheDir = "/Users/jrbsilver/svn/dojo/branches/0.4/buildscripts/webbuild/webbuildtemp/0.4.2rc1/web/buildscripts";
	$depList = isset($_POST['depList']) ? $_POST['depList'] : null;
	$provideList = isset($_POST['provideList']) ? $_POST['provideList'] : 'null';
	$version = isset($_POST['version']) ? $_POST['version'] : '0.0.0dev';
	$xdDojoUrl = isset($_POST['xdDojoUrl']) ? $_POST['xdDojoUrl'] : '';

	if(!isset($depList)){
?>
		<html>
			Please specify a comma-separated list of files.
		</html>
<?
	}else{
		header("Content-Type: application/x-javascript");
		header("Content-disposition: attachment; filename=dojo.js");

		$dojoContents = `/usr/bin/-classpath ../shrinksafe/js.jar:../shrinksafe/shrinksafe.jar org.mozilla.javascript.tools.shell.Main $buildScriptsDir/makeDojoJsWeb.js $buildCacheDir/dojobuilds $depList $provideList $version $xdDojoUrl`;

		print($dojoContents);
	}
?>
