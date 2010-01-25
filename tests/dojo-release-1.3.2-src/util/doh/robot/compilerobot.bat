setlocal
del DOHRobot*.class
%JDK14_HOME%\bin\javac -target 1.4 -classpath %JDK14_HOME%\jre\lib\plugin.jar DOHRobot.java
del DOHRobot.jar
%JDK14_HOME%\bin\jar cvf DOHRobot.jar DOHRobot*.class
%JDK14_HOME%\bin\jarsigner -keystore ./dohrobot DOHRobot.jar dojo <key
del DOHRobot*.class
endlocal
