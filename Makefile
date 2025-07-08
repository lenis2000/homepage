.PHONY: serve invalidate

serve:
	bundle exec jekyll serve --incremental

invalidate:
	aws cloudfront create-invalidation --distribution-id E1K1ZBQ861G4YS --paths "/*"
	aws cloudfront create-invalidation --distribution-id E2A7GCNTLDAYXU --paths "/*"