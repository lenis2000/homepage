.PHONY: serve invalidate deploy

serve:
	bundle exec jekyll serve --incremental

invalidate:
	@echo "Creating CloudFront invalidations..."
	@aws cloudfront create-invalidation --distribution-id E1K1ZBQ861G4YS --paths "/*" --no-cli-pager
	@aws cloudfront create-invalidation --distribution-id E2A7GCNTLDAYXU --paths "/*" --no-cli-pager
	@echo "Invalidations created successfully!"

deploy:
	@echo "Checking for changes..."
	@if git diff --quiet && git diff --cached --quiet; then \
		echo "No changes detected. Creating/toggling trigger file..."; \
		if [ -f trigger ]; then \
			echo "Removing existing trigger file"; \
			rm trigger; \
		else \
			echo "Creating trigger file"; \
			touch trigger; \
		fi; \
		git add trigger; \
		git commit -m "Trigger CI deployment" --signoff; \
	else \
		echo "Changes detected. Committing all changes..."; \
		git add -A; \
		git commit --verbose --signoff || echo "No changes to commit"; \
	fi
	@echo "Pushing to remote..."
	@git push
	@echo "Creating CloudFront invalidations..."
	@$(MAKE) invalidate
	@echo "Deployment complete!"
