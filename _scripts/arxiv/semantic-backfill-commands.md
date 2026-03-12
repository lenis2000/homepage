make arxiv-scan ARGS="--threshold 0.8"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
