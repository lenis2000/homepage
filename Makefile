.PHONY: serve invalidate deploy autodeploy deploy-local

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

autodeploy:
	@echo "Auto-deploying..."
	@git add -A
	@git commit -m "autodeploy" --signoff || echo "No changes to commit"
	@echo "Pushing to remote..."
	@git push
	@$(MAKE) invalidate
	@echo "Auto-deployment complete!"

deploy-local:
	@echo "Building Jekyll site..."
	bundle exec jekyll build
	@echo "Cleaning HTML files..."
	@find _site -name "*.html" -type f | while read file; do \
		grep -v '^[[:space:]]*$$' "$$file" > "$$file.tmp" && mv "$$file.tmp" "$$file"; \
	done
	@echo "Fetching CV PDFs..."
	@rm -rf /tmp/homepage-cv /tmp/homepage-syllabi
	@git clone --depth 1 https://github.com/lenis2000/CV.git /tmp/homepage-cv
	@cp /tmp/homepage-cv/__petrovCV__.pdf _site/research/petrovCV.pdf
	@cp /tmp/homepage-cv/__petrovCV__short.pdf _site/research/petrovCVbrief.pdf
	@echo "Fetching Syllabi..."
	@git clone --depth 1 https://github.com/lenis2000/Syllabi.git /tmp/homepage-syllabi
	@cp /tmp/homepage-syllabi/Syllabus_2310_f16.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3100_s17.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3100_f18.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_7310_s19.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_7310_s20.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3340_s20.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3100_f20.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3100_s22.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3100_f22.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3340_s23.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_3100_f23.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_2310_f24.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_EGMT_f25.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_EGMT_s26.pdf _site/teaching/
	@cp /tmp/homepage-syllabi/Syllabus_EGMT_s26.html _site/teaching/
	@rm -rf /tmp/homepage-cv /tmp/homepage-syllabi
	@echo "Syncing to S3..."
	aws s3 sync _site/ s3://lpetrov.cc --delete
	@$(MAKE) invalidate
	@echo "Local deploy complete!"
