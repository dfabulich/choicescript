pushd %~dp0
java -cp js.jar org.mozilla.javascript.tools.debugger.Main runner.js %*
popd