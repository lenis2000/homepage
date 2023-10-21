---
layout: post
title: "Tools for work: not only AI"
comments: false
permalink: /AI-math-2023/
categories: math blog quick_link
published: true
image: __STORAGE_URL__/img/blog/AI.png
image-alt: An example of a request to chatGPT (April 2023) which generated the tikz code for a picture I put into a paper with minimal modifications (Figure 5 on page 31 in arXiv:2305.17747)
published: true
---

<div><a href="{{site.url}}/AI-math-2023/">Tools for work: not only AI</a> (October 2023)</div>
<!--more-->

<br>

About a year has passed since I became interested in integrating AI tools into my work tasks (this predated the `GPT-4` hype by several months). Over time, I have developed several workflows around math that could be useful for my colleagues. With the help of these tools, I experience a significant speedup of many mundane tasks. I describe the tools and my workflows here. 

<h1 class="mb-4 mt-4">Table of contents</h1>

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

<h1 class="mb-4 mt-4" id="tools-list">0. Tools list</h1>

Here is the list of tools I use more or less daily:

- [Wolfram Mathematica](https://www.wolfram.com/mathematica/) --- the famous software for symbolic computation. My university thankfully provides it (they tried to stop this over the summer, but got a massive backlash from math and physics - hopefully, they will continue picking up the apprently massive price tag).
- [VScode](https://code.visualstudio.com/) with [LaTeX workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop). I run it locally, but I think one can also use them in the cloud in the browser. As someone who also likes [VIM](https://en.wikipedia.org/wiki/Vim_(text_editor)), I need the ability to switch between VIM and other editors on the fly. This can be done locally.
- [Overleaf](https://www.overleaf.com/project) for math collaboration (instead of Dropbox); my university pays for the premium version. I download the files locally using git, and can push my changes back to Overleaf (it acts as a git server).
- [Mathpix Snipping Tool](https://mathpix.com/), an OCR which can recognize math and output LaTeX code (\$5/month). I only pay for it when teaching - the free academic plan has 20 snapshots per month, which is enough when I don't need to create problem sets.
- [Alfred for Mac](https://www.alfredapp.com/) --- a launchpad for Mac which allows you to create custom workflows. A "workflow" is typically a command that has some text as an input, and which runs a terminal command. A reddit thread with [Windows analogues](https://www.reddit.com/r/windows/comments/5pek48/is_there_an_equivalent_for_windows_to_macs_alfred/). If you use linux, you probably have something like that, too.
- [heygpt](https://github.com/fuyufjh/heygpt) --- a simple command-line interface for OpenAI API. I use GPT-4 via the [API key](https://help.openai.com/en/articles/7039783-how-can-i-access-the-chatgpt-api), which allows me to pay about \$3-4/month instead of 20 for the web interface, and I can also pipelline it with other commands (they charge fractions of a cent for each request, depending on the length). This API only allows to use GPT-4 after your first bill; but for some of the tasks, GPT-3 is enough.
- [GitHub copilot](https://github.com/features/copilot) integrated into VScode (obviously, this requires internet connection). The copilot has free academic license, but approval time might be long. I think that these days copilot also uses GPT-4, but it is of course tailored for code (which includes LaTeX code).
- [Grammarly premium](https://www.grammarly.com/premium), this is the most expensive item in my budget (\$12/month). I use it integrated in VSCode (this is buggy, but corrects typos), and also I polish long prose segments in the web browser specially. This adds confidence to my writing.

So, my combined monthly spending on these tools is around \$20, which is the same as the cost of just the single ChatGPT Premium subscription.

<h1 class="mb-4 mt-4" id="teaching">1. Teaching</h1>

<h3 class="mb-4 mt-4" id="creating-sets">1.1 Creating test and problem sets with solutions</h3>




<h1 class="mb-4 mt-4" id="research">2. Research</h1>


<h3 class="mb-4 mt-4" id="bibliography">2.1 Bibliography entries</h3>


<h3 class="mb-4 mt-4" id="tikz">2.2 Tikz pictures</h3>


<h3 class="mb-4 mt-4" id="translate">2.3 Translate LaTeX to mathematica and back</h3>


<h3 class="mb-4 mt-4" id="calendars">2.4 Create calendars for conferences</h3>


<h1 class="mb-4 mt-4" id="miscellaneous">3. Miscellaneous</h1>


<h3 class="mb-4 mt-4" id="writing">3.1 Writing</h3>

I usually do all my prose writing in `VSCode`. This includes grant and proposal writing, where I use `copilot` autocompletion to break the writing block. Then, I usually polish the final version of the text with `Grammarly` on the web, as it suggests readability improvements.

Here is an example of me writing a blog post (this one) in `VSCode`:

<video width="800" height="600" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/3.1_writing.mp4" type="video/mp4" alt="Writing in VSCode">
  Your browser does not support the video tag.
</video>

<h3 class="mb-4 mt-4" id="emails">3.2 Answering to emails in VSCode</h3>

A large portion of writing is responding to emails. Would it be nice to have long autocomplete suggestions, much longer than what `gmail` offers? You can also load several emails at once, and use the available context to generate a response.

I have created an `applescript` shortcut (which I call from `Alfred`) which can export selected message(s) in the `Mail.app` to `VSCode`. Of course, I used `GPT-4` to come up with the `applescript` code. 

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

Example usage, where I open `Mail.app`, select a message, and run the hotkey in `Alfred`. Then I write the response in `VSCode`. I can then just copy the result, and put it in the email as an answer (not shown in the video).

<video width="800" height="600" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/3.2_email.mp4" type="video/mp4" alt="Writing emails in VSCode">
  Your browser does not support the video tag.
</video>



<h3 class="mb-4 mt-4" id="free-form">3.3 free-form questions for GPT-4</h3>

I have an `Alfred` workflow to ask `GPT-4` arbitrary questions. This is often much faster than `google`, when I just need a simple information like 

- `what is the hotkey to record screen on Mac` 
- `what is the best video format for web` 
- `how to convert video from .mov to .mp4`

I also have a workflow to read the question from file, and copy the answer to the clipboard when `GPT-4` is done. Here is the `heygpt` command for this 

```zsh
heygpt --model=gpt-4 `cat ~/GPT.txt` | tee >(pbcopy)
```

The `| tee >(pbcopy)` part is responsible for copying the output to the clipboard, while at the same time the terminal shows the output. Here is a sample usage, where I write a request into file `GPT.txt`, run the hotkey in `Alfred`, then topy the result into the same text file, ask for funnier jokes, and run the request again. In the video, `hg` is my alias for `heygpt --model=gpt-4`.

<video width="800" height="480" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/3.3_questions.mp4" type="video/mp4" alt="Using GPT-4 with text input">
  Your browser does not support the video tag.
</video>


<br />
<br />