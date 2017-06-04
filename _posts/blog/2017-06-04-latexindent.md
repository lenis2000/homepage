---
layout: post
title:
date: 2017-06-04 08:00:00
comments: true
categories: blog math tech
published: true
show-date: true
more-text: My configuration of latexindent
---

I came across a very nice <script type="math/tex">\mathrm{\LaTeX}</script>
source file beautifier called `latexindent` which is a part
of the standard <script type="math/tex">\mathrm{\TeX}</script>
distribution.

[CTAN page](http://www.ctan.org/tex-archive/support/latexindent/), [GitHub repo](https://github.com/cmhughes/latexindent.pl)

The script should be run on the source and it would do the
stuff I usually like in
<script type="math/tex">\mathrm{\LaTeX}</script>
source files, such as wrapping, indentation of lists and environments, and so on.

The issue with
<script type="math/tex">\mathrm{\LaTeX}</script>
source files is that everyone using
<script type="math/tex">\mathrm{\LaTeX}</script>
formats them differently, since the
<script type="math/tex">\mathrm{\LaTeX}</script>
processing is very forgiving.
In particular, there is lots of whitespace which can be inserted to make
source files more human readable.
The `latexindent` tool would allow me to _automatically_ standardize
the source code and not think about the various ways one can format the
source.

(Previously in some projects,
in particular in joint ones,
I have spent some time reformatting the source files
to my liking; and while `latexindent` might not format everything
how I would like, it is extremely configurable, and I can live with it
because of the time it would save me.)

<!--more-->

### About this post

I am writing this post to document my process of learning `latexindent`, for
future reference. There are two main things: configure the tool, and figure out
how to call it automatically (I guess, from `vim`).

**Note.** I also learned about the existence of `arara` ([GitHub repo](https://github.com/cereda/arara))
but for now I do not think I need it for now.

### Issues

When setting up `latexindent` I found the following issues that I had to resolve manually:
- first, some `perl` modules needed to be installed. This is done by running something like `sudo perl -MCPAN -e 'install "Unicode::GCString"'` where `Unicode::GCString` is the name of the module
- My TexLive distribution contained `latexindent` version `3.0` while the current version as of today is `3.1`. 
The version `3.0` did not wrap text properly, and after updating to `3.1` from GitHub everything started working. 
Hopefully the autoupdate of TexLive will not break this, but anyway the updating was easy: just replace 
the old files in `/usr/local/texlive/2016/texmf-dist/scripts/latexindent/` by the new ones.
- I want first to remove paragraph line breaks and then wrap them using `latexindent`. This probably means that 
I need two passes of the script, with different configs. Fine, let's do this.

<h1 class="mt-5">Configuration</h1>
---

## Configuration files

There is a file `.indentconfig.yaml` in my home folder which looks something like this:

{% highlight yaml linenos %}
paths:
- /path/to/my/homefolder/.vim/latexindent/latexindent.yaml
{% endhighlight %}

It loads the main configuration file `latexindent.yaml` which is in my `.vim` folder
and it put under the `git` version control.
It is appropriate to put the configuration file in the `.vim` folder
since that folder has other configuration pertaining to
<script type="math/tex">\mathrm{\LaTeX}</script>.

The main configuration file `latexindent.yaml`
was copied from the default configuration file and modified
accordingly. The default configuration file is well-documented,
but the comprehensive PDF documentation is found <a href="http://mirrors.concertpass.com/tex-archive/support/latexindent/documentation/latexindent.pdf" target="_blank">here on CTAN</a>.

### Multiple configurations

I would like to run the script with `nothing`, `wrap`, and `remove-breaks` options:
- `nothing` does nothing to line breaks/wrapping inside paragraph. It touches math delimiting however
- `remove-breaks` removes line breaks inside paragraphs which effectively cleans
up any existing wrapping
- Finally, `wrap` wraps the lines inside paragraphs to 79 (or however number is specified in the config) columns

The first option does not load anything additional, and the second and the third options load
additional configs which are in the same `~/.vim` folder.
Therefore, to re-wrap run `remove-breaks` and then `wrap` configs.

---

## Details of configuration

Here are the main things which I configure:

### file extensions

This overrides the default behavior (the most recent yaml takes priority), 
I will only want to indent 
<script type="math/tex">\mathrm{\TeX}</script>
source files with `.tex` extension:

{%highlight yaml linenos%}
fileExtensionPreference:
    .tex: 1
{%endhighlight%}

### backups

Since I am using `git`, I do not really need backups and will always overwrite the file. 
Ok, please create one backup and give it a silly extension which is already in my default 
`.gitignore` list for 
<script type="math/tex">\mathrm{\LaTeX}</script>:

{%highlight yaml linenos%}
backupExtension: .mtc1
onlyOneBackUp: 1
maxNumberOfBackUps: 0
cycleThroughBackUps: 0
{%endhighlight%}

### verbatim environments and commands

Some part of the defaults that I just keep for now:

{%highlight yaml linenos%}
# preferences for information displayed in the log file
logFilePreferences:
    showEveryYamlRead: 1
    showAmalgamatedSettings: 0
    endLogFileWith: '--------------' 
    showGitHubInfoFooter: 1

#  verbatim environments- environments specified 
#  in this hash table will not be changed at all!
verbatimEnvironments:
    verbatim: 1
    lstlisting: 1

#  verbatim commands such as \verb! body !, \lstinline$something else$
verbatimCommands:
    verb: 1
    lstinline: 1
{%endhighlight%}

### no wrapping of special blocks

I will use nolatexindent to mark block I do not want wrapped:
{%highlight yaml linenos%}
#  no indent blocks (not necessarily verbatim 
#  environments) which are marked as %\begin{noindent}
#  or anything else that the user puts in this hash
#  table
noIndentBlock:
    nolatexindent: 1
{%endhighlight%}

Therefore the following text will not be touched:
{%highlight latex linenos%}
% \begin{noindent}
       this code
              won't
be touched
by
            latexindent.pl!
%\end{noindent}
{%endhighlight%}

### whitespace

Remove trailing whitespace, nice:

{%highlight yaml linenos %}
# remove trailing whitespace from all lines 
removeTrailingWhitespace:
    beforeProcessing: 1
    afterProcessing: 1
{%endhighlight%}

This is done both before and after processing since I want wrapping to be done automatically.

### preamble

Here are the default settings for not touching preamble which I keep:

{%highlight yaml linenos %}
# \begin{document} and \end{document} are treated differently
# by latexindent within filecontents environments
fileContentsEnvironments:
    filecontents: 1
    filecontents*: 1

# indent preamble
indentPreamble: 0

# assume no preamble in cls, sty, by default
lookForPreamble:
    .tex: 1

# some preambles can contain \begin and \end statements
# that are not in their 'standard environment block', for example,
# consider the following key = values:
#    preheadhook={\begin{mdframed}[style=myframedstyle]},
#    postfoothook=\end{mdframed},
preambleCommandsBeforeEnvironments: 0
{%endhighlight%}

---

## indentation

### not touching much for now

This is a quite tricky business, and I do not think I want to touch it for now.
Here is the default value of indentation to be a tab: 

{%highlight yaml linenos %}
# Default value of indentation
defaultIndent: "\t"
{%endhighlight%}

Also I would like the script to consider the `etaremune` environment:

{%highlight yaml linenos%}
# if you want the script to look for \item commands 
# and format it, as follows (for example),
#       \begin{itemize}
#           \item content here
#                 next line is indented
#                 next line is indented
#           \item another item
#       \end{itemize}
# then populate indentAfterItems. See also itemNames
indentAfterItems:
    itemize: 1
    enumerate: 1
    etaremune: 1
    list: 1
{%endhighlight%}

There are many other 
parameters of the indentation that I will consider at some point,
but  will not list them for now.

### sections/subsection indentation

Here is a cool feature which allows to indent all text within 
section or subsection etc; it is turned off for now but I can consider using it.
If I want to turn it on then set `indentAfterThisHeading:` to `1` (and not an
integer because it's a true-false config).

{%highlight yaml linenos%}
# if you want to add indentation after
# a heading, such as \part, \chapter, etc
# then populate it in here - you can add 
# an indent rule to indentRules if you would 
# like something other than defaultIndent
#
# you can also change the level if you like, 
# or add your own title command
indentAfterHeadings:
    part:
       indentAfterThisHeading: 0
       level: 1
    chapter: 
       indentAfterThisHeading: 0
       level: 2
    section:
       indentAfterThisHeading: 0
       level: 3
{%endhighlight%}

---

## modify line breaks

Here is the most exciting wrapping part that I will consider seriously. 
The indentation configuration is comprehensive and very configurable
but it does not make much sense before I start working with `latexindent`.

### condense blank lines set to (almost) off

I do not like to condense blank lines, especially in the end of the file.
However, I will try to live with this feature since it makes the source better
visible on the screen

{%highlight yaml linenos%}
modifyLineBreaks:
    preserveBlankLines: 1
    condenseMultipleBlankLinesInto: 1
{%endhighlight%}

### Line breaks and wrapping

Adding the following to the configuration will wrap everything at 79 columns, precisely what I need:

{%highlight yaml linenos%}
modifyLineBreaks:
    textWrapOptions: 
        columns: 79
{%endhighlight%}

There is an issue however since after the vim wrapping this additional wrapping does not create 
full paragraphs. Therefore first one needs to delete all relevant line breaks, and wrap only then.
Let's see how it goes.

First, we need to specify where paragraphs stop:
{%highlight yaml linenos%}
modifyLineBreaks:
    paragraphsStopAt:
        environments: 1
        commands: 0
        ifElseFi: 0
        items: 1
        specialBeginEnd: 0
        heading: 0
        filecontents: 0
        comments: 0
{%endhighlight%}

Then the following removes paragraph line breaks:
{%highlight yaml linenos%}
    removeParagraphLineBreaks:
        all: 1
{%endhighlight%}

This does the job but I need to do this first and then wrap around 79 as I want. Fine.

### Math delimiting

The following code under `modifyLineBreaks:`
does a nice job separating math from text:
{%highlight yaml linenos%}
    specialBeginEnd:
        SpecialBeginStartsOnOwnLine: 1
        SpecialBodyStartsOnOwnLine: 0
        SpecialEndStartsOnOwnLine: 0
        SpecialEndFinishesWithLineBreak: 2
{%endhighlight%}
I thought about doing this manually at some point but 
doing this with a script is way nicer.

<h1 class="mt-5">Calling the script</h1>

Whenever I call the script I want it to overwrite, so use `-w` option. Since I
will be calling it automatically I do not want terminal output, so use `-s`
option. I also want the script to wrap my code and modify other line breaks, so
use `-m` option, too. By default, `vim` does not automatically wrap anything
(which is good), and the `gq` command wraps everything at the (probably
default) length of `79`. So I want `latexindent` to wrap the lines (with
inserting new lines) at `79`. 
Sometimes, however, I need to include other local options, so the script should be ran with `-l`
option, too, and the script will include `localSettings.yaml` to override some of my system-wide defaults.


**Note.** There might be an issue because
`vim` wraps after indenting and I might want to configure `latexindent` to wrap after indenting, too,
since I want the same behavior everywhere. However, I simply better not use `vim` indentation anymore with 
this script.

So, overall I've mapped the hotkey `todo` to run `latexindent -w -s -l -m` on the current 
(<script type="math/tex">\mathrm{\TeX}</script> only) file.




<br><br>
