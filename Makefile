.PHONY: serve invalidate deploy

serve:
	bundle exec jekyll serve --incremental

invalidate:
	@echo "Creating CloudFront invalidations..."
	@aws cloudfront create-invalidation --distribution-id E1K1ZBQ861G4YS --paths "/*" --no-cli-pager
	@aws cloudfront create-invalidation --distribution-id E2A7GCNTLDAYXU --paths "/*" --no-cli-pager
	@echo "Invalidations created successfully!"

deploy:
	@echo "Committing changes..."
	@git add -A
	@git commit --verbose --signoff || echo "No changes to commit"
	@echo "Pushing to remote..."
	@git push
	@echo "Creating CloudFront invalidations..."
	@$(MAKE) invalidate
	@echo "Deployment complete!"
