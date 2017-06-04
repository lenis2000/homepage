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

I am writing this post to document my process of learning `latexindent`. There are
two main things: configure the tool, and figure out how to call it automatically.

**Note.** I also learned about `arara` ([GitHub repo](https://github.com/cereda/arara))
but for now I do not think I need it for now.

<h1 class="mt-4">Configuration</h1>
---

## Configuration files

There is a file `.indentconfig.yaml` in my home folder which looks something like this:

{% highlight yaml %}
paths:
- /path/to/my/homefolder/.vim/latexindent.yaml
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

---

## Details of configuration

This overrides the default behavior (the most recent yaml takes priority), 
I will only want to indent 
<script type="math/tex">\mathrm{\TeX}</script>
source files with `.tex` extension:

{%highlight yaml linenos%}
fileExtensionPreference:
    .tex: 1
{%endhighlight%}

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

#  no indent blocks (not necessarily verbatim 
#  environments) which are marked as %\begin{noindent}
#  or anything else that the user puts in this hash
#  table
noIndentBlock:
    noindent: 1
    cmhtest: 1
{%endhighlight%}



<h1 class="mt-4">Calling the script</h1>

Whenever I call the script I want it to overwrite, so use `-w` option. Since I
will be calling it automatically I do not want terminal output, so use `-s`
option. I also want the script to wrap my code and modify other line breaks, so
use `-m` option, too. By default, `vim` does not automatically wrap anything
(which is good), and the `gq` command wraps everything at the (probably
default) length of `79`. So I want `latexindent` to wrap the lines (with
inserting new lines) at `79`. 

**Note.** There might be an issue because
`vim` wraps after indenting and I might want to configure `latexindent` to wrap after indenting, too,
since I want the same behavior everywhere.



<br><br>
