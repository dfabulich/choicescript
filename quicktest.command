#!/bin/sh

cd -- "$(dirname "$0")"
printf "\033c" # clear screen
command -v node >/dev/null 2>&1 || { echo >&2 "ERROR: quicktest.command requires Node.js, but it's not installed."; exit 1; }
node quicktest