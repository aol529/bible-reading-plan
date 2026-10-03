#!/bin/sh
# Cache-busting: tags every local style.css / *.js reference in index.html
# with ?v=<hash of their staged contents>, so browsers fetch fresh copies
# right after a deploy instead of reusing GitHub Pages' 10-minute cache.
# Runs from .git/hooks/pre-commit; safe to run by hand too.
set -e
cd "$(git rev-parse --show-toplevel)"

files=$(ls style.css *.js)
hash=$(for f in $files; do git show ":$f" 2>/dev/null || cat "$f"; done | git hash-object --stdin | cut -c1-8)

sed -i -E "s#(href|src)=\"(style\.css|[a-z0-9-]+\.js)(\?v=[0-9a-f]+)?\"#\1=\"\2?v=$hash\"#g" index.html

if ! git diff --quiet -- index.html; then
  git add index.html
fi
