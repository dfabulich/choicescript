
::Copyright 2010 by Dan Fabulich.
::
::Dan Fabulich licenses this file to you under the
::ChoiceScript License, Version 1.0 (the "License"); you may
::not use this file except in compliance with the License. 
::You may obtain a copy of the License at
::
:: http://www.choiceofgames.com/LICENSE-1.0.txt
::
::See the License for the specific language governing
::permissions and limitations under the License.
::
::Unless required by applicable law or agreed to in writing,
::software distributed under the License is distributed on an
::"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
::either express or implied.
echo Executing randomtest, writing to randomtest-output.txt
java -jar js.jar randomtest.js %* > randomtest-output.txt
