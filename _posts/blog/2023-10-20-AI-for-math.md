---
layout: post
title: "Tools for work: not only AI"
comments: false
permalink: /AI-math-2023/
categories: math blog quick_link
published: true
image: __STORAGE_URL__/img/blog/AI.png
image-alt: An example of a request to chatGPT (April 2023) which generated the tikz code for a picture I put into a paper with minimal modifications (Figure 5 on page 31 in arXiv:2305.17747)
published: false
---

<div><a href="{{site.url}}/AI-math-2023/">Tools for work: not only AI</a> (October 2023)</div>
<!--more-->

<br>

About a year has passed since I became interested in integrating AI tools into my work tasks (this predated the GPT-4 hype for several months). Over time, I have developed several workflows around math that could be useful for my colleagues. With the help of these tools, I experience a significant speedup of many mundane tasks. I describe the tools and my workflows here. 

<h3 class="mb-4 mt-4">Table of contents</h3>

<ol start="0">
  <li><a href="#tools-list">Tools list</a></li>
  <li>
    <a href="#teaching">Teaching</a>
    <ul>
      <li><a href="#creating-sets">Creating test and problem sets with solutions</a></li>
    </ul>
  </li>
  <li>
    <a href="#research">Research</a>
    <ul>
      <li><a href="#bibliography">Bibliography entries</a></li>
      <li><a href="#tikz">Tikz pictures</a></li>
      <li><a href="#translate">Translate LaTeX to mathematica and back</a></li>
      <li><a href="#calendars">Create calendars for conferences</a></li>
    </ul>
  </li>
  <li>
    <a href="#miscellaneous">Miscellaneous</a>
    <ul>
      <li><a href="#writing">Writing</a></li>
      <li><a href="#emails">Answering to emails and composing in VSCode</a></li>
      <li><a href="#free-form">Free-form questions for GPT-4</a></li>
    </ul>
  </li>
</ol>

<h3 class="mb-4 mt-4" id="tools-list">0. Tools list</h3>

Here is the list of tools I use more or less daily:

- [Wolfram Mathematica](https://www.wolfram.com/mathematica/) --- the famous software for symbolic computation. My university thankfully provides it (they tried to stop this over the summer, but got a massive backlash from math and physics - hopefully, they will continue picking up the apprently massive price tag).
- [VScode](https://code.visualstudio.com/) with [LaTeX workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop). I run it locally, but I think one can also use them in the cloud in the browser. As someone who also likes [VIM](https://en.wikipedia.org/wiki/Vim_(text_editor)), I need the ability to switch between VIM and other editors on the fly. This can be done locally.
- [Overleaf](https://www.overleaf.com/project) for math collaboration (instead of Dropbox); my university pays for the premium version. I download the files locally using git, and can push my changes back to Overleaf (it acts as a git server).
- [Mathpix Snipping Tool](https://mathpix.com/), an OCR which can recognize math and output LaTeX code (\$5/month). I only pay for it when teaching - the free academic plan has 20 snapshots per month, which is enough when I don't need to create problem sets.
- [Alfred for Mac](https://www.alfredapp.com/) --- a launchpad for Mac which allows you to create custom workflows. A "workflow" is typically a command that has some text as an input, and which runs a terminal command. A reddit thread with [Windows analogues](https://www.reddit.com/r/windows/comments/5pek48/is_there_an_equivalent_for_windows_to_macs_alfred/). If you use linux, you probably have something like that, too.
- [heygpt](https://github.com/fuyufjh/heygpt) --- a simple command-line interface for ChatGPT API. I use ChatGPT via the [API key](https://help.openai.com/en/articles/7039783-how-can-i-access-the-chatgpt-api), which allows me to pay about \$3-4/month instead of 20 for the web interface, and I can also pipelline it with other commands. This API only allows to use GPT-4 after your first bill; but for some of the tasks, GPT-3 is enough.
- [GitHub copilot](https://github.com/features/copilot) integrated into VScode (obviously, this requires internet connection). The copilot has free academic license, but approval time might be long. I think that these days copilot also uses GPT-4, but it is of course tailored for code (which includes LaTeX code).
- [Grammarly premium](https://www.grammarly.com/premium), this is the most expensive item in my budget (\$12/month). I use it integrated in VSCode (this is buggy, but corrects typos), and also I polish long prose segments in the web browser specially. This adds confidence to my writing.

So, my combined monthly spending on these tools is around \$20, which is the same as the cost of just the single ChatGPT Premium subscription.

<h3 class="mb-4 mt-4" id="teaching">1. Teaching</h3>

<h5 class="mb-4 mt-4" id="creating-sets">1.1 Creating test and problem sets with solutions</h5>




<h3 class="mb-4 mt-4" id="research">2. Research</h3>


<h5 class="mb-4 mt-4" id="bibliography">2.1 Bibliography entries</h5>


<h5 class="mb-4 mt-4" id="tikz">2.2 Tikz pictures</h5>


<h5 class="mb-4 mt-4" id="translate">2.3 Translate LaTeX to mathematica and back</h5>


<h5 class="mb-4 mt-4" id="calendars">2.4 Create calendars for conferences</h5>


<h3 class="mb-4 mt-4" id="miscellaneous">3. Miscellaneous</h3>


<h5 class="mb-4 mt-4" id="writing">3.1 Writing</h5>

I usually do all my prose writing in VSCode. This includes grant and proposal writing, where I use copilot autocompletion to break the writing block. Then, I usually polish the final version of the text with Grammarly on the web, as it suggests readability improvements.

Here is an example of me writing a blog post (this one) in VSCode:

<video width="800" height="600" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/3.1_writing.mp4" type="video/mp4" alt="Writing in VSCode">
  Your browser does not support the video tag.
</video>

<h5 class="mb-4 mt-4" id="emails">3.2 Answering to emails in VSCode</h5>

A large portion of writing is responding to emails. Would it be nice to 

I have created an apple shortcut (which I call from Alfred) which can export selected message(s) in the Mail.app to VSCode. Of course, I used GPT-4 to come up with the applescript code. 

```applescript
tell application "Mail"
	set theMessages to selection
	set theOutput to ""
	set totalMessages to count of theMessages
	repeat with i from 1 to totalMessages
		set aMessage to item i of theMessages
		set theOutput to theOutput & "Subject: " & subject of aMessage & return
		set theOutput to theOutput & "From: " & (sender of aMessage) & return
		set theOutput to theOutput & "To: " & ((address of to recipient of aMessage) as string) & return
		set theOutput to theOutput & "Date: " & (date received of aMessage as string) & return
		set theOutput to theOutput & "Content: " & content of aMessage & return
		set theOutput to theOutput & "---------------------------------------------" & return
		log "Processed message " & i & " of " & totalMessages
	end repeat
	return theOutput
end tell
```

Example usage:

<video width="800" height="600" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/3.2_email.mp4" type="video/mp4" alt="Writing emails in VSCode">
  Your browser does not support the video tag.
</video>

Here, I open Mail.app, I select a message, then run the hotkey in Alfred, then write the response in VSCode. I can then copy the result and put it in the email as an answer.

<h5 class="mb-4 mt-4" id="free-form">3.3 free-form questions for GPT-4</h5>




<br />
<br />