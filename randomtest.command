#!/bin/sh

cd -- "$(dirname "$0")"
printf "\033c" # clear screen
command -v node >/dev/null 2>&1 || { echo >&2 "ERROR: randomtest.command requires Node.js, but it's not installed."; exit 1; }
echo Executing randomtest, writing to randomtest-output.txt
node randomtest | tee randomtest-output.txt
