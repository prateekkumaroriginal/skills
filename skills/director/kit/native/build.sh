#!/bin/sh
# Builds enc.node, the in-process encoder for render.mjs (see enc.c). Needs gcc, and the FFmpeg that is installed
# (libavcodec.so.60, libavutil.so.58). The FFmpeg headers are downloaded from the distribution into a temporary
# folder (apt-get download, no root needed) unless FFMPEG_INCLUDE points at them.
set -e
cd "$(dirname "$0")"
NODE_INC="$(dirname "$(dirname "$(command -v node)")")/include/node"
INC="$FFMPEG_INCLUDE"
if [ -z "$INC" ]; then
  if [ -d /usr/include/x86_64-linux-gnu/libavcodec ]; then INC=/usr/include/x86_64-linux-gnu
  else
    T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
    (cd "$T" && apt-get download libavcodec-dev libavutil-dev >/dev/null && for d in *.deb; do dpkg -x "$d" x; done)
    INC="$T/x/usr/include/x86_64-linux-gnu"
  fi
fi
gcc -O3 -mavx2 -fPIC -shared -DNODE_GYP_MODULE_NAME=enc -I"$NODE_INC" -I"$INC" enc.c -o enc.node \
  -L/usr/lib/x86_64-linux-gnu -l:libavcodec.so.60 -l:libavutil.so.58
echo "built $(pwd)/enc.node"
