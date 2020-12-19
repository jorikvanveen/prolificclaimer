@ECHO OFF
CALL npm i -g yarn
CALL npm i -g typescript
CALL yarn
CALL tsc
CALL mkdir build\sounds
CALL copy src\sounds\** build\sounds
CALL Xcopy /E /I src\bin build\bin
ECHO "BUILD COMPLETE"
PAUSE