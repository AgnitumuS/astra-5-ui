#!/bin/sh

RDIR="/tmp"

CDIR=`pwd`
LDIR=`dirname $0`
cd $LDIR
SDIR=`pwd`
cd $CDIR

YEAR=`date '+%Y'`

makecss() {
    printf "/*\n"
    printf " * Astra: Web Interface\n"
    printf " * https://cesbo.com/astra/\n"
    printf " *\n"
    printf " * Copyright (C) $YEAR, Andrey Dyldin <and@cesbo.com>\n"
    printf " */\n\n"

    CSS="pony app"
    echo "$CSS" | tr ' ' '\n' | while read N ; do
        printf "/* $N.css */\n\n"
        cat "$SDIR/$N.css"
        printf "\n"
    done
}

makecss >"$RDIR/app.css"
echo "DONE: $RDIR/app.css"

makejs() {
    printf "/*\n"
    printf " * Astra: Web Interface\n"
    printf " * https://cesbo.com/astra/\n"
    printf " *\n"
    printf " * Copyright (C) $YEAR, Andrey Dyldin <and@cesbo.com>\n"
    printf " */\n\n"

    SCRIPTS="pony app dashboard stream adapter sessions settings settings-general settings-users settings-hls settings-http-play settings-softcam settings-cas settings-groups settings-servers settings-theme settings-import settings-edit settings-restart log"
    echo "$SCRIPTS" | tr ' ' '\n' | while read N ; do
        printf "/* $N.js */\n\n"
        cat "$SDIR/$N.js"
        printf "\n"
    done
}

makejs >"$RDIR/app.js"
echo "DONE: $RDIR/app.js"

makelua() {
    cat <<EOF
--
-- Astra: Web Interface
-- https://cesbo.com/astra/
--
-- Copyright (C) $YEAR, Andrey Dyldin <and@cesbo.com>
--

log.info("Load UI bundle")

astra_storage["/"] = [==[<!DOCTYPE html>
<html lang="en">
<head>
    <title>Astra Control Panel</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="/app.css">
</head>
<body>
    <script src="/app.js"></script>
    <script src="/mod.js"></script>
</body>
</html>
]==]

EOF

    printf "astra_storage[\"/app.js\"] = base64.decode([==[\n"
    cat "$RDIR/app.js" | base64 | tr -d '\n'
    printf "]==])\n\n"
    printf "astra_storage[\"/app.css\"] = base64.decode([==[\n"
    cat "$RDIR/app.css" | base64 | tr -d '\n'
    printf "]==])\n\n"
}

# makelua >"$RDIR/app-ui.lua"
# echo "DONE: $RDIR/app-ui.lua"
