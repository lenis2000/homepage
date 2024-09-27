#!/bin/zsh

bundle exec jekyll build

git clone https://github.com/lenis2000/CV.git ./_site/research/CV
mv ./_site/research/CV/__petrovCV__.pdf ./_site/research/petrovCV.pdf
mv ./_site/research/CV/__petrovCV__short.pdf ./_site/research/petrovCVbrief.pdf
rm -Rf _site/research/CV

# get fresh githubbed syllabi from GitHub
git clone https://github.com/lenis2000/Syllabi.git ./_site/teaching/syll
mv ./_site/teaching/syll/Syllabus_2310_f16.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3100_s17.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3100_f18.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_7310_s19.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_7310_s20.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3340_s20.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3100_f20.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3100_s22.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3100_f22.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3340_s23.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_3100_f23.pdf ./_site/teaching/
mv ./_site/teaching/syll/Syllabus_2310_f24.pdf ./_site/teaching/
rm -Rf _site/teaching/syll

aws s3 sync ./_site/ s3://lpetrov.cc --delete
