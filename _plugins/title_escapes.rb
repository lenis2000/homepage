# YAML double-quoted scalars read backslash escapes, so `title: "$\beta$"` arrives as "$<BS>eta$"
# (likewise \theta, \nu, \alpha, \varepsilon, \frac, \epsilon, \Lambda, \Phi, \Nu). A title never
# holds these characters on purpose, so each is mapped back to the backslash pair that produced it.
# A trailing newline is left alone: block scalars (`title: >`) end with one.
# Escapes YAML rejects (\l, \m, \s, \x, \u, ...) are a YAML error before this runs; single-quote
# such titles.
module TitleEscapes
  RESTORE = {
    "\a" => "\\a", "\b" => "\\b", "\t" => "\\t", "\n" => "\\n", "\v" => "\\v",
    "\f" => "\\f", "\r" => "\\r", "\e" => "\\e", "\0" => "\\0",
    " " => "\\L", " " => "\\P", "\u0085" => "\\N",
  }.freeze
  PATTERN = /[\a\b\t\v\f\r\e\0  \u0085]|\n(?!\z)/

  def self.restore(doc)
    title = doc.data["title"]
    return unless title.is_a?(String) && title.match?(PATTERN)
    doc.data["title"] = title.gsub(PATTERN, RESTORE)
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  site.posts.docs.each { |doc| TitleEscapes.restore(doc) }
  site.pages.each { |page| TitleEscapes.restore(page) }
end
