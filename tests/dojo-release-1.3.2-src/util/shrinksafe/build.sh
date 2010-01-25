#!/bin/sh
RHINO=../js.jar

rm -rf bin
mkdir bin
cd src
javac -classpath $RHINO:. -d ../bin org/dojotoolkit/shrinksafe/Main.java
mkdir ../bin/org/dojotoolkit/shrinksafe/resources
cp org/dojotoolkit/shrinksafe/resources/Messages.properties ../bin/org/dojotoolkit/shrinksafe/resources/Messages.properties
cd ../bin
jar cfm ../shrinksafe.jar ../src/manifest *
cd ..
rm -rf bin
