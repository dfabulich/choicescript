pushd %~dp0
java -jar js.jar -w -opt -1 -debug runner.js %*
popd