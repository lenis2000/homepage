<script type="text/javascript" id="cookiebanner" src="https://cdnjs.cloudflare.com/ajax/libs/cookie-banner/1.2.2/cookiebanner.min.js"
data-message="I am using cookies on this website"
data-moreinfo="{{site.url}}/privacy/"></script>
<script>
// Enhance cookie banner accessibility after it loads
document.addEventListener('DOMContentLoaded', function() {
  var banner = document.querySelector('.cookiebanner');
  if (banner) {
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie notice');
    // Make close button accessible (library renders a div, not a button)
    var closeBtn = banner.querySelector('.cookiebanner-close');
    if (closeBtn) {
      closeBtn.setAttribute('role', 'button');
      closeBtn.setAttribute('aria-label', 'Dismiss cookie notice');
      closeBtn.setAttribute('tabindex', '0');
      closeBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          closeBtn.click();
        }
      });
    }
  }
});
</script>