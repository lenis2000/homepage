# Source -> URL map for editor previews (~/.vim/agterm/site-preview.sh, vim's :Wv).
#
# After every (re)generation of `jekyll serve` this writes /tmp/jekyll-urlmap/<key>.json, where
# <key> is the first 12 hex digits of the SHA-1 of the source directory's realpath:
#   source   that realpath; urls are relative to it
#   root     the address the server answers on, baseurl included
#   livereload  whether served pages reload themselves after a rebuild
#   pid      the serving process, so a reader can tell a stale map from a live server
#   seq, generated  bumped once per regeneration (epoch seconds), so a reader that saved a file
#            at time T knows the build that includes it has landed once generated > T
#   urls     {source path relative to the site => url} for every page, written document and
#            static .html file
#   written  the pages the last regeneration wrote; under --incremental, the ones a change reached
#   includes {dependency => pages using it} from the incremental metadata, for dependencies used
#            by at most INCLUDE_FANOUT pages (a layout every page uses tells a reader nothing)
# The file lives outside the source tree so the watcher never sees it, and is replaced by a
# rename so a reader never gets half of it. A plain `jekyll build` (CI) writes nothing.
require "digest"
require "fileutils"
require "json"

module AgtermUrlmap
  DIR = "/tmp/jekyll-urlmap"
  INCLUDE_FANOUT = 12

  @on = false
  @seq = 0
  @written = []

  class << self
    def reset(site)
      @on = site.config["serving"] ? true : false
      @written = []
    end

    def note(item)
      @written << rel(item.relative_path) if @on
    end

    def write(site)
      return unless @on

      source = File.realpath(site.source)
      urls = {}
      statics = site.static_files.select { |f| [".html", ".htm"].include?(f.extname) }
      (site.pages + site.documents.select(&:write?) + statics).each do |item|
        path = rel(item.relative_path)
        next if urls.key?(path) || !File.file?(File.join(source, path))

        urls[path] = item.url
      end
      @seq += 1
      map = {
        "v"          => 1,
        "source"     => source,
        "root"       => root(site),
        "livereload" => site.config["livereload"] ? true : false,
        "pid"        => Process.pid,
        "seq"        => @seq,
        "generated"  => Time.now.to_f,
        "urls"       => urls,
        "written"    => @written.uniq.select { |p| urls.key?(p) && page_url?(urls[p]) },
        "includes"   => includes(site, urls),
      }
      FileUtils.mkdir_p(DIR)
      file = File.join(DIR, "#{Digest::SHA1.hexdigest(source)[0, 12]}.json")
      tmp = "#{file}.#{Process.pid}.tmp"
      File.write(tmp, JSON.generate(map))
      File.rename(tmp, file)
    rescue SystemCallError => e
      Jekyll.logger.warn "agterm urlmap:", e.message
    end

    private

    def rel(path)
      path.to_s.delete_prefix("/")
    end

    def page_url?(url)
      url.end_with?("/", ".html", ".htm")
    end

    def root(site)
      ssl = site.config["ssl_cert"] && site.config["ssl_key"]
      host = site.config["host"].to_s
      host = "127.0.0.1" if host.empty? || host == "0.0.0.0"
      "#{ssl ? "https" : "http"}://#{host}:#{site.config["port"]}#{site.baseurl}"
    end

    def includes(site, urls)
      prefix = "#{site.source.chomp("/")}/"
      users = Hash.new { |h, k| h[k] = [] }
      urls.each do |path, url|
        next unless page_url?(url)

        entry = site.regenerator.metadata[site.in_source_dir(path)]
        next unless entry

        Array(entry["deps"]).each do |dep|
          users[dep.delete_prefix(prefix)] << path if dep.start_with?(prefix)
        end
      end
      users.select { |dep, pages| !urls.key?(dep) && pages.size <= INCLUDE_FANOUT }
    end
  end
end

Jekyll::Hooks.register :site, :after_reset do |site|
  AgtermUrlmap.reset(site)
end

Jekyll::Hooks.register [:pages, :documents], :post_write do |item|
  AgtermUrlmap.note(item)
end

Jekyll::Hooks.register :site, :post_write do |site|
  AgtermUrlmap.write(site)
end
