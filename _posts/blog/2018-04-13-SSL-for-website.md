---
layout: post
title: How to enable SSL for your homepage hosted on S3
date: 2018-04-13 12:00:00
comments: true
categories: blog tech
published: true
show-date: true
more-text: Steps and some caveats
---

As Google Chrome
[will mark](https://www.theverge.com/2018/2/8/16991254/chrome-not-secure-marked-http-encryption-ssl)
all HTTP websites unsafe later this year, 
it is time to figure out how to enable SSL on my websites. 
I currently have 3 websites under active management:

- this homepage [`lpetrov.cc`](https://lpetrov.cc)
- the [FRG website](http://frg.int-prob.org)
- the [UVA Math department website](http://math.virginia.edu)

All three of them are hosted through AWS, but the homepage is by far the 
easiest as it only involves S3 and no EC2 instances. 
So at first I decided to turn on SSL at the homepage, 
which I succeeded with. 

<!--more-->

The homepage is hosted on two S3 buckets - one for resources,
and another one for the main content. The main content one
is updated via Travis from the GitHub repo.

### Bucket with resources

The resource bucket does not have its own private domain name, 
and was simply using the S3 website name. The bucket used to be public.

Now, I created a cloudfront distribution with the cloudfront SSL from Amazon.
Replaced the main resources url in my jekyll website by 
the cloudfront one (one change in config).
Closed the storage bucket from the public. 
Now all resources are under SSL

### Main bucket / website

For this, I created a cloudfront distribution
associated with the hostnames `lpetrov.cc` and `www.lpetrov.cc`. 
The Route 53 DNS records had to be updated, too.
Since I am using a custom hostname
I need a certificate. I created one at Amazon,
with DNS verification (very smooth via Route 53),
and attached it to the cloudfront distribution. 

By the way, the DNS verification will definitely not work for the UVA Math website
since I do not manage the DNS there. There is an alternate email way of verification which I'll try 
while working for that website.

### Caveats I encountered

**1.** The wildcard certificate for `*.lpetrov.cc` (and no other hostnames) was frowned 
upon by browsers. I just recreated the certificate for only 
the hostnames `lpetrov.cc` and `www.lpetrov.cc` I need.

Then, close up the main content bucket from the public, too.

**2.** The cloudfront distribution is different from S3 website
in that the URL like `https://lpetrov.cc/research/` is not pointing at any object
(I like pretty URLs via jekyll). Therefore, `https://lpetrov.cc/research/` was not accessible,
and one needed `https://lpetrov.cc/research/index.html`. This is not great.
I solved this problem by using Lambda, and added a script for URL rewriting,
so that cloudfront now automagically adds `index.html` to the 
URLs.

**3.** Paginator broke down since the 
paginator URLs were like 
`https://lpetrov.cc/posts/page2` without `/` at the end,
so I had to fix it. 

**4.** One of my resource folders
had a wrong case in one of the letters in the name. 
This broke a page, and I was not sure why this happened.
After a lot of invalidations at cloudfront I noticed the different case.

**5.** The navbar toggle button (the one visible for narrow screens, e.g.,
on mobile) did not show - likely because the Bootstrap css references to an http url
for `xmlns` (I don't know what that is). So a fix was to simply use 
another way of drawing the navbar toggle button.

### Overall

So, overall it took me half a day but I learned some things. 
The experience of doing it through AWS was nice overall.
Two more websites to go though.
