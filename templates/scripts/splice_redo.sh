#!/bin/sh
# Re-render a range [a, b] (inside one chunk) in a fresh browser and splice it onto that chunk's good frames before a.
# For runs that go white mid-chunk (WebGL state lost after many frames in one page); a fresh page starting at a renders them.
# usage: sh scripts/splice_redo.sh <Comp> <chunk dir> <chunk index> <chunk size> <a> <b> [--draft]
set -e
COMP=$1; DIR=$2; I=$3; N=$4; A=$5; B=$6; SCALE=""; [ "$7" = "--draft" ] && SCALE="--scale=0.5"
CH=$(printf "%s/chunk_%03d.mp4" "$DIR" "$I"); C0=$((I * N)); KEEP=$((A - C0))
TMP=${REMOTION_TMP:-C:/remotion-tmp}
npx remotion render src/index.ts "$COMP" "$DIR/part_$I.mp4" --codec h264 --crf 16 --frames=$A-$B --concurrency=1 \
  --browser-executable "C:/Program Files/Google/Chrome/Application/chrome.exe" --gl=angle --timeout 180000 --log=error $SCALE
ffmpeg -v error -y -i "$CH" -frames:v $KEEP -c:v libx264 -crf 16 -pix_fmt yuv420p "$DIR/head_$I.mp4"
printf "file 'head_%s.mp4'\nfile 'part_%s.mp4'\n" "$I" "$I" > "$DIR/splice_$I.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/splice_$I.txt" -vf "setpts=N/30/TB" -fps_mode passthrough -c:v libx264 -crf 16 -pix_fmt yuv420p "$CH"
rm -f "$DIR/head_$I.mp4" "$DIR/part_$I.mp4" "$DIR/splice_$I.txt"
for d in "$TMP"/remotion-webpack-bundle-*; do [ -d "$d" ] && rm -rf "$d"; done
echo "chunk $I: kept $KEEP, rendered $A-$B, frames $(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$CH")"
