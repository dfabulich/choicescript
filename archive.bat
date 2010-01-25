del choicescript.zip
rm -rf choicescript
call git archive --format=zip --prefix=choicescript/ HEAD index.html *.js scenes todo.txt > choicescript.zip
mkdir choicescript
call git log -1 > choicescript\revision.txt
c:\Progra~1\7-Zip\7z.exe a choicescript.zip choicescript\*
rm -rf choicescript