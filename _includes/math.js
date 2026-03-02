<script type="text/javascript"  src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.js" integrity="sha384-/y1Nn9+QQAipbNQWU65krzJralCnuOasHncUFXGkdwntGeSvQicrYkiUBwsgUqc1" crossorigin="anonymous"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/contrib/auto-render.min.js" integrity="sha384-dq1/gEHSxPZQ7DdrM82ID4YVol9BYyU7GbWlIwnwyPzotpoc57wDw/guX8EaYGPx" crossorigin="anonymous"></script>

<script>
  // Detach arxiv-list before global KaTeX pass (abstracts rendered lazily)
  var _arxivList = document.querySelector('.arxiv-list');
  var _arxivPlaceholder;
  if (_arxivList) {
    _arxivPlaceholder = document.createComment('arxiv-list');
    _arxivList.parentNode.replaceChild(_arxivPlaceholder, _arxivList);
  }
  renderMathInElement(document.body,
  {
      delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "\\[", right: "\\]", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\(", right: "\\)", display: false}
      ]
  });
  if (_arxivList) {
    _arxivPlaceholder.parentNode.replaceChild(_arxivList, _arxivPlaceholder);
  }
</script>
