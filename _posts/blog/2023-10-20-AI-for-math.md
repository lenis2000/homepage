---
layout: post
title: "AI-powered workflows for math teaching and research"
comments: false
permalink: /AI-math-2023/
categories: math blog quick_link
published: true
---

<div><a href="{{site.url}}/AI-math-2023/">AI-powered workflows for math teaching and research</a> (October 2023)</div>
<!--more-->

<br>

About a year has passed since I became interested in integrating AI tools into my work tasks (predating the `GPT-4` hype by several months). Over time, I have developed several workflows around math teaching and research that could be useful for my colleagues. With the help of these workflows, I experience a significant speedup of many mundane tasks. I describe my tools and workflows here. 

<h1 class="mb-4 mt-4">Table of contents</h1>

<ol start="0">
  <li><a href="#tools-list">List of tools</a></li>
  <li>
    <a href="#teaching">Teaching</a>
    <ul>
      <li><a href="#creating-sets">Creating problems with solutions</a></li>
    </ul>
  </li>
  <li>
    <a href="#research">Research</a>
    <ul>
      <li><a href="#tikz">Tikz pictures</a></li>
      <li><a href="#translate">Translate LaTeX to mathematica and back</a></li>
      <li><a href="#bibliography">Bibliography entries</a></li>
      <li><a href="#calendars">Import conference calendar into my calendar</a></li>
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

<h1 class="mb-4 mt-4" id="tools-list">0. List of tools</h1>

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

---

<h1 class="mb-4 mt-4" id="teaching">1. Teaching</h1>

<h3 class="mb-4 mt-4" id="creating-sets">1.1 Creating problems with solutions</h3>

To create a problem with solution for my undergrad probability course, I follow the steps:

- (optional) Use `mathpix` to capture the problem from a textbook or an old exam
- Paste the problem into `VSCode`
- Have `copilot` autocomplete the solution

At the solution completion stage, the AI often outputs nonsense. The power of `copilot` vs, `ChatGPT` is that I can direct the AI solution step by step. Here is an example when I copy the problem from another exam. In this example, I have `LaTeX` compilation running in the background in terminal, to update the PDF automatically.

Often, `copilot` even tries to do computations for me, but fails miserably. Thus, I also need `Mathematica` to check computations. For that, I copy the latex code of an expression to compute, and ask `GPT-4` to convert it to `Mathematica` code:
```zsh
heygpt --model=gpt-4 "convert this expression to Mathematica, \
output just the mathematica expression \
\int_0^{\frac{1}{2}}\int_x^\infty 2\lambda e^{-\lambda y}\,dy\,dx " | tee >(pbcopy)
```
This request is automated through `Alfred`. I then copy the expression to `Mathematica`, and get the result. In the video below, even the step of the translation from `LaTeX` to `Mathematica` got wrong at the first try, since the order of integration got messed up. After noticing this and correcting, I got the right answer.

Here is a sample video of this workflow (sped up 2x):

<video width="800" height="500" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/1.1_UG_problem.mp4" type="video/mp4" alt="Creating a problem with solution">
  Your browser does not support the video tag.
</video>


---

<h1 class="mb-4 mt-4" id="research">2. Research</h1>

Below is just a sample of tasks where I use AI tools in my research. I am always on the lookout to automate more.

<h3 class="mb-4 mt-4" id="tikz">2.1 Tikz pictures</h3>

You can ask `GPT-4` or `ChatGPT` to generate `TikZ` code for pictures. Here is an example with an early `ChatGPT-4` (April 2023). It generated the tikz code for a picture using this request. After minimal modifications, I put it into a paper - Figure 5 on page 31 in [arXiv:2305.17747](https://arxiv.org/abs/2305.17747):

<img src="{{site.storage_url}}/img/blog/AI.png" style="width:800px; max-width:100%" alt="An example of a request to chatGPT (April 2023) which generated the tikz code for a picture I put into a paper with minimal modifications (Figure 5 on page 31 in arXiv:2305.17747)">

Unfortunately, this method can only generate rather simple pictures. For example, `generate tikz code for an example of a six vertex configuration with domain wall boundary conditions` does not produce anything meaningful, but `generate tikz code for a 4 times 4 dotted grid with axes (t,x) labeled and a red line from (0,0) to (1,1)` works reasonably fine. Moreover, it can modify your existing `TikZ` pictures on the fly, like changing notation in a complicated table of vertex weights. For this I would use a free-form input from a file workflow, see [Section 3.3](#free-form) below.

<h3 class="mb-4 mt-4" id="translate">2.2 Translate LaTeX to Mathematica and back</h3>

`Mathematica` can output any of its results in `LaTeX` using the option `TeXForm`. However, sometimes this output is not pretty and I can ask `GPT-4` to make it better (for example, remove `\left` and `\right` braces unless this is strictly needed; organize factors in a large product such that they look like `1-q` instead of `-q+1`, and so on). Here is an example of not fully polished `Mathematica` output from a 2015 paper [arXiv:1502.07374](https://arxiv.org/abs/1502.07374) (pages 26-27). I would prefer `1-q^J` instead of `q^J-1`, but got lazy to fix this manually:

<img src="{{site.storage_url}}/img/blog/CP-2015.png" style="width:600px; max-width:100%" alt="An example of an unpolished Mathematica output from a 2015 paper (arXiv:1502.07374)">

In another direction, translating from `LaTeX` to `Mathematica` was not generally avaiable to me until AI tools. Now, I can copy a piece of `LaTeX` code from a paper I currently write, and check in `Mathematica` that I did not make any typos. Better yet, I can snap a piece of code from a PDF of **any** paper I find, and use it for `Mathematica` computations.

In this example, I look at [arXiv:0905.0679](https://arxiv.org/abs/0905.0679), pick the formula for the weight `w(x)` from Section 4, and check that the expression for `w(x+1)/w(x)` given in Section 8.2 is indeed correct. 

Here is the `GPT-4 API` prompt for the second part of this task, where there is a typo in OCR `w_{t, S}( & +1) / w_{t, S}(x)`, but `GPT-4` does not care, and still produces a decent output:
```zsh
heygpt --model=gpt-4 "convert this expression to Mathematica, output just the mathematica expression\
$\begin{aligned} w_{t, S}( & +1) / w_{t, S}(x)=\frac{q^{2 N+T-1}\
\left(1-\kappa^2 q^{2 x-t-S+3}\right)}{1-\kappa^2 q^{2 x-t-S+1}}\
\\ & \times \frac{\left(1-q^{x-t-N+1}\right)\left(1-q^{x-S-N+1}\right)\
\left(1-\kappa^2 q^{x-T+1}\right)\left(1-\kappa^2 q^{x-t-S+1}\right)}\
{\left(1-q^{x+1}\right)\left(1-q^{T-S-t+x+1}\right)\left(1-\kappa^2 q^{x+N-t+1}\right)\
\left(1-\kappa^2 q^{x+N-S+1}\right)}\end{aligned}$" | tee >(pbcopy)
```

There are of course manual caveats:
- I needed to remove the part related to `w_{t, S}( & +1) / w_{t, S}(x)=` from the Mathematica output 
- The symbol `N` in `Mathematica` is protected, so I need to replace it with `NN` manually. 

Full video of the example is below. It is sped up 2x:

<video width="800" height="500" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/2.2_translate.mp4" type="video/mp4" alt="Translating LaTeX to Mathematica and back">
  Your browser does not support the video tag.
</video>


<h3 class="mb-4 mt-4" id="bibliography">2.3 Bibliography entries</h3>

For bibliography, I maintain a [giant bibtex file](https://github.com/lenis2000/BiBTeX/blob/master/bib.bib). For many years, I used `google scholar` bibtex export feature, but it is imprecise:

- I need to add arXiv number (I like to include them when available)
- The title of the paper should be wrapped in double braces, so that capitalization is correct
- I like to abbreviate first names of the authors, and `google scholar` is doing it inconsistently

Recently, I stopped using google scholar's bibtex export, and instead wrote my own bibtex prompt. Basically, I give `GPT-4` several examples, and add the info about the paper from two sources which I copypast from the web: arXiv and the journal website. Here is an example of an Alfred workflow which generates and executes a request to `GPT-4`:
```zsh
condition="I want you to make bibtex files in a format, from the data provided.\
Here are examples of my bibtex entries, use this format.\
IMPORTANT: 1. Abbreviate first names of authors, and journal names.\
2. Also, use double curly brackets around title. 3. Remove any month entries.

After END EXAMPLE I will give you data, output only bibtex entry for this data. 

BEGIN EXAMPLE

@article{ayyer2022modified,
author = {Ayyer, A. and Mandelshtam, O. and Martin, J.B.},
journal = {arXiv preprint},
note = {arXiv:2209.09859 [math.CO]},
title = {%raw%}{{Modified Macdonald polynomials and the multispecies zero range process: II}}{%endraw%},
year = {2022}}

@article{Baxter1972,
author = {Baxter, R. J.},
doi = {10.1016/0003-4916(72)90335-1},
journal = {Annals of Physics},
number = {1},
pages = {193--228},
title = {%raw%}{{Partition function of the Eight-Vertex lattice model}}{%endraw%},
volume = {70},
year = {1972}}

@article{onsager1931reciprocal,
author = {Onsager, L.},
journal = {Phys. Rev.},
pages = {405},
publisher = {American Physical Society},
title = {%raw%}{{Reciprocal Relations in Irreversible Processes. I.}}{%endraw%},
volume = {37},
year = {1931}}

<...A FEW MORE EXAMPLES...>

END EXAMPLE

remember: IMPORTANT: Abbreviate first names of authors, and journal names.\
Also, double curly brackets around title. And no month entries please.\
I just need the bibtex entry as output, and no comments.
"

e_condition=${(q)condition}
combined_query="${e_condition} {query}"

heygpt --model=gpt-4 "$combined_query" | tee >(pbcopy)
```

Here is an example of the input as `{query}` to the above script. These are just copypastes of pieces from the [journal webpage](https://link.springer.com/article/10.1007/s00440-013-0482-3) and [arXiv](https://arxiv.org/abs/1111.4408):

```
Home  Probability Theory and Related Fields  Article
Published: 30 March 2013
Macdonald processes
Alexei Borodin & Ivan Corwin 
Probability Theory and Related Fields volume 158, pages225–400 (2014)Cite this article

2990 Accesses

264 Citations

Metricsdetails

	arXiv:1111.4408 [math.PR]
```

You see that this text has lots of garbage data. But ran through the above prompt, this becomes the following bibtex entry:

```bibtex
@article{BorodinCorwin2014,
author = {Borodin, A. and Corwin, I.},
journal = {Prob. Theory Relat. Fields},
note = {arXiv:1111.4408 [math.PR]},
pages = {225-400},
title = {%raw%}{{Macdonald processes}}{%endraw%},
volume = {158},
year = {2014}
}
```

<h3 class="mb-4 mt-4" id="calendars">2.4 Import conference calendar into my calendar</h3>

When I go to a conference, I like to have its calendar in my icloud. This way, I can always check my watch to see what is the next talk. Conferences rarely provide `.ics` files or google calendars (which would be equally good), and one of the main reasons I see for this is that it's a pain to nicely display a google calendar on the web. So, math conferences typically resort to one of two terrible things:

- Make a PDF of the schedule with `LaTeX` table, which is downloaded on click (and not displayed in browser)
- Or, make a webpage with the schedule in an `html` table

I do not know which one is worse for machine readability, but thanks to `mathpix` OCR and `GPT-4`, I can convert either of them into `.ics`, which I can then add to my calendar. 

Here is the prompt which more or less works for this conversion:

```zsh
heygpt --model=gpt-4 "Make ical code for this event.\
This is in San Francisco, CA time zone, Pacific time, winter, year is 2023.\
Output the ical code only. I need the most complete information about\
the event or multiple events. Here is the data to process: {query}" | tee >(pbcopy)
```

Then I copy the text from the PDF or the webpage using OCR, day by day, and ask to convert it to `.ics`. Here is an example video of how this works for one day of a [random conference](https://www.slmath.org/workshops/1082):

<video width="800" height="400" controls style="max-width:100%">
  <source src="{{site.storage_url}}/img/blog/vid/2.4_calendar.mp4" type="video/mp4" alt="Importing conference calendar into my calendar">
  Your browser does not support the video tag.
</video>

---

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
