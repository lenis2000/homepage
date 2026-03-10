package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"sort"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// Paper represents a candidate paper for review.
type Paper struct {
	ArxivID      string   `json:"arxiv_id"`
	Title        string   `json:"title"`
	Authors      []string `json:"authors"`
	Categories   []string `json:"categories"`
	Abstract     string   `json:"abstract"`
	Date         string   `json:"date"`
	MatchedName  string   `json:"matched_author"`
	Ambiguous    bool     `json:"is_ambiguous"`
	AIDecision   string   `json:"ai_decision"`
	AIConfidence string   `json:"ai_confidence"`
	AIReason     string   `json:"ai_reason"`
	Decision     string   `json:"decision"`
}

type authorGroup struct {
	name       string
	start, end int // indices into papers slice
	total      int
	decided    int
}

type undoEntry struct {
	index    int
	decision string
}

type model struct {
	papers       []Paper
	groups       []authorGroup
	currentGroup int
	current      int
	accepted     int
	rejected     int
	skipped      int
	undo         []undoEntry
	width        int
	height       int
	file         string
	scroll       int
	done         bool
}

// Styles
var (
	titleStyle  = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("15"))
	dateStyle   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("14"))
	authorStyle = lipgloss.NewStyle().Bold(true)
	catStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	acceptStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("10")).Bold(true)
	rejectStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("9")).Bold(true)
	ambigStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("11")).Bold(true)
	dimStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	helpStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	statusStyle = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("14"))
	headerStyle = lipgloss.NewStyle().Bold(true).Background(lipgloss.Color("8")).Foreground(lipgloss.Color("15")).Padding(0, 1)
	groupStyle  = lipgloss.NewStyle().Bold(true).Background(lipgloss.Color("4")).Foreground(lipgloss.Color("15")).Padding(0, 1)
)

// sortAndGroup sorts papers by matched_author then date descending,
// and builds author group index. Papers matching multiple authors
// appear only once (under their matched_author field).
func sortAndGroup(papers []Paper) []authorGroup {
	// Deduplicate by arxiv_id (keep first occurrence)
	seen := make(map[string]bool)
	deduped := papers[:0]
	for _, p := range papers {
		if !seen[p.ArxivID] {
			seen[p.ArxivID] = true
			deduped = append(deduped, p)
		}
	}
	// Update slice in place
	papers = deduped

	// Sort: by matched_author (alphabetical), then date descending
	sort.SliceStable(papers, func(i, j int) bool {
		if papers[i].MatchedName != papers[j].MatchedName {
			return papers[i].MatchedName < papers[j].MatchedName
		}
		return papers[i].Date > papers[j].Date
	})

	var groups []authorGroup
	if len(papers) == 0 {
		return groups
	}

	cur := papers[0].MatchedName
	start := 0
	for i, p := range papers {
		if p.MatchedName != cur {
			decided := 0
			for j := start; j < i; j++ {
				if papers[j].Decision != "" {
					decided++
				}
			}
			groups = append(groups, authorGroup{
				name:    cur,
				start:   start,
				end:     i,
				total:   i - start,
				decided: decided,
			})
			cur = p.MatchedName
			start = i
		}
	}
	// Last group
	decided := 0
	for j := start; j < len(papers); j++ {
		if papers[j].Decision != "" {
			decided++
		}
	}
	groups = append(groups, authorGroup{
		name:    cur,
		start:   start,
		end:     len(papers),
		total:   len(papers) - start,
		decided: decided,
	})

	return groups
}

func findGroup(groups []authorGroup, idx int) int {
	for i, g := range groups {
		if idx >= g.start && idx < g.end {
			return i
		}
	}
	return 0
}

func initialModel(file string, papers []Paper) model {
	groups := sortAndGroup(papers)

	accepted, rejected, skipped := 0, 0, 0
	for _, p := range papers {
		switch p.Decision {
		case "ACCEPT":
			accepted++
		case "REJECT":
			rejected++
		case "SKIP":
			skipped++
		}
	}

	// Find first undecided paper
	current := 0
	for i, p := range papers {
		if p.Decision == "" {
			current = i
			break
		}
	}

	return model{
		papers:       papers,
		groups:       groups,
		currentGroup: findGroup(groups, current),
		current:      current,
		accepted:     accepted,
		rejected:     rejected,
		skipped:      skipped,
		file:         file,
		width:        80,
		height:       24,
	}
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.scroll = 0

	case tea.KeyMsg:
		if m.done {
			return m, tea.Quit
		}

		switch msg.String() {
		case "q", "ctrl+c":
			m.save()
			return m, tea.Quit

		case "a", "v":
			m.decide("ACCEPT")
			m.accepted++
			m.advance()

		case "r", "b":
			m.decide("REJECT")
			m.rejected++
			m.advance()

		case "R":
			// Reject all undecided in current author group
			m.rejectGroup()

		case "A":
			// Accept all undecided in current author group
			m.acceptGroup()

		case "s":
			m.decide("SKIP")
			m.skipped++
			m.advance()

		case "u":
			m.undoLast()

		case "j", "down":
			m.scroll++

		case "k", "up":
			if m.scroll > 0 {
				m.scroll--
			}

		case "n", "right":
			m.advanceNoDecide()

		case "p", "left":
			m.goBack()

		case "N":
			// Jump to next author group
			m.nextGroup()

		case "P":
			// Jump to previous author group
			m.prevGroup()

		case "o":
			// Open arXiv PDF in browser
			p := m.papers[m.current]
			url := "https://arxiv.org/pdf/" + p.ArxivID
			openURL(url)

		case "O":
			// Open arXiv abs page in browser
			p := m.papers[m.current]
			url := "https://arxiv.org/abs/" + p.ArxivID
			openURL(url)
		}
	}
	return m, nil
}

func (m *model) decide(decision string) {
	p := &m.papers[m.current]
	m.undo = append(m.undo, undoEntry{index: m.current, decision: p.Decision})
	p.Decision = decision
	m.save()
}

func (m *model) advance() {
	m.scroll = 0
	// First try within current group
	g := m.groups[m.currentGroup]
	for i := m.current + 1; i < g.end; i++ {
		if m.papers[i].Decision == "" {
			m.current = i
			return
		}
	}
	// Current group done — move to next group with undecided
	for gi := m.currentGroup + 1; gi < len(m.groups); gi++ {
		g := m.groups[gi]
		for i := g.start; i < g.end; i++ {
			if m.papers[i].Decision == "" {
				m.current = i
				m.currentGroup = gi
				return
			}
		}
	}
	// Wrap around
	for gi := 0; gi <= m.currentGroup; gi++ {
		g := m.groups[gi]
		for i := g.start; i < g.end; i++ {
			if m.papers[i].Decision == "" {
				m.current = i
				m.currentGroup = gi
				return
			}
		}
	}
	m.done = true
}

func (m *model) advanceNoDecide() {
	m.scroll = 0
	next := m.current + 1
	if next >= len(m.papers) {
		next = 0
	}
	m.current = next
	m.currentGroup = findGroup(m.groups, m.current)
}

func (m *model) goBack() {
	m.scroll = 0
	prev := m.current - 1
	if prev < 0 {
		prev = len(m.papers) - 1
	}
	m.current = prev
	m.currentGroup = findGroup(m.groups, m.current)
}

func (m *model) nextGroup() {
	m.scroll = 0
	next := m.currentGroup + 1
	if next >= len(m.groups) {
		next = 0
	}
	m.currentGroup = next
	g := m.groups[m.currentGroup]
	// Find first undecided in group, or just first
	for i := g.start; i < g.end; i++ {
		if m.papers[i].Decision == "" {
			m.current = i
			return
		}
	}
	m.current = g.start
}

func (m *model) prevGroup() {
	m.scroll = 0
	prev := m.currentGroup - 1
	if prev < 0 {
		prev = len(m.groups) - 1
	}
	m.currentGroup = prev
	g := m.groups[m.currentGroup]
	for i := g.start; i < g.end; i++ {
		if m.papers[i].Decision == "" {
			m.current = i
			return
		}
	}
	m.current = g.start
}

func (m *model) rejectGroup() {
	g := m.groups[m.currentGroup]
	for i := g.start; i < g.end; i++ {
		if m.papers[i].Decision == "" {
			m.undo = append(m.undo, undoEntry{index: i, decision: ""})
			m.papers[i].Decision = "REJECT"
			m.rejected++
		}
	}
	m.save()
	m.advance()
}

func (m *model) acceptGroup() {
	g := m.groups[m.currentGroup]
	for i := g.start; i < g.end; i++ {
		if m.papers[i].Decision == "" {
			m.undo = append(m.undo, undoEntry{index: i, decision: ""})
			m.papers[i].Decision = "ACCEPT"
			m.accepted++
		}
	}
	m.save()
	m.advance()
}

func (m *model) undoLast() {
	if len(m.undo) == 0 {
		return
	}
	entry := m.undo[len(m.undo)-1]
	m.undo = m.undo[:len(m.undo)-1]

	old := m.papers[entry.index].Decision
	switch old {
	case "ACCEPT":
		m.accepted--
	case "REJECT":
		m.rejected--
	case "SKIP":
		m.skipped--
	}

	m.papers[entry.index].Decision = entry.decision
	m.current = entry.index
	m.currentGroup = findGroup(m.groups, m.current)
	m.scroll = 0
	m.save()
}

func (m *model) save() {
	data, _ := json.MarshalIndent(m.papers, "", "  ")
	os.WriteFile(m.file, data, 0644)
}

func (m model) View() string {
	if m.done {
		return fmt.Sprintf("\n  All %d papers reviewed! %s accepted, %s rejected, %s skipped.\n  Press any key to exit.\n",
			len(m.papers),
			acceptStyle.Render(fmt.Sprintf("%d", m.accepted)),
			rejectStyle.Render(fmt.Sprintf("%d", m.rejected)),
			dimStyle.Render(fmt.Sprintf("%d", m.skipped)),
		)
	}

	p := m.papers[m.current]
	g := m.groups[m.currentGroup]
	undecided := len(m.papers) - m.accepted - m.rejected - m.skipped

	// Position within group
	posInGroup := m.current - g.start + 1
	groupUndecided := 0
	for i := g.start; i < g.end; i++ {
		if m.papers[i].Decision == "" {
			groupUndecided++
		}
	}

	// Header
	header := headerStyle.Render(fmt.Sprintf(" arXiv Review  %d/%d  ", m.current+1, len(m.papers)))
	stats := fmt.Sprintf("  %s  %s  %s  %s",
		acceptStyle.Render(fmt.Sprintf("✓%d", m.accepted)),
		rejectStyle.Render(fmt.Sprintf("✗%d", m.rejected)),
		dimStyle.Render(fmt.Sprintf("~%d skip", m.skipped)),
		statusStyle.Render(fmt.Sprintf("%d left", undecided)),
	)

	// Author group bar
	groupBar := groupStyle.Render(fmt.Sprintf(" %s ", g.name))
	groupStats := fmt.Sprintf("  paper %d/%d  %s",
		posInGroup, g.total,
		statusStyle.Render(fmt.Sprintf("%d undecided", groupUndecided)),
	)
	groupNav := dimStyle.Render(fmt.Sprintf("  (group %d/%d)", m.currentGroup+1, len(m.groups)))

	// AI suggestion
	aiLine := ""
	if p.AIDecision != "" {
		style := acceptStyle
		label := p.AIDecision
		switch p.AIDecision {
		case "REJECT_PERSON":
			style = rejectStyle
			label = "REJECT (wrong person)"
		case "REJECT_TOPIC":
			style = ambigStyle
			label = "REJECT (off-topic for int. prob.)"
		case "REJECT":
			style = rejectStyle
		}
		conf := ""
		if p.AIConfidence != "" {
			conf = " [" + p.AIConfidence + " confidence]"
		}
		aiLine = fmt.Sprintf("  AI: %s%s", style.Render(label), dimStyle.Render(conf))
		if p.AIReason != "" {
			aiLine += "\n  " + dimStyle.Render(p.AIReason)
		}
	}

	// Ambiguity warning
	ambigLine := ""
	if p.Ambiguous {
		ambigLine = "  " + ambigStyle.Render("⚠ HIGH AMBIGUITY")
	}

	// Current decision
	decLine := ""
	if p.Decision != "" {
		style := dimStyle
		switch p.Decision {
		case "ACCEPT":
			style = acceptStyle
		case "REJECT":
			style = rejectStyle
		}
		decLine = fmt.Sprintf("  Decision: %s", style.Render(p.Decision))
	}

	// Paper info
	dateStr := p.Date
	if len(dateStr) > 10 {
		dateStr = dateStr[:10]
	}
	date := dateStyle.Render(dateStr)
	matched := ""
	if p.MatchedName != "" {
		matched = dimStyle.Render(fmt.Sprintf("  (matched: %s)", p.MatchedName))
	}

	authors := authorStyle.Render(strings.Join(p.Authors, ", "))
	cats := catStyle.Render(strings.Join(p.Categories, " "))
	title := titleStyle.Render(p.Title)

	// Abstract (truncated to fit)
	abstract := p.Abstract
	if abstract == "" {
		abstract = dimStyle.Render("(no abstract)")
	}

	// Build content lines
	lines := []string{
		header + stats,
		groupBar + groupStats + groupNav,
		"",
		fmt.Sprintf("  %s  %s  arXiv:%s", date, cats, p.ArxivID),
		fmt.Sprintf("  %s%s", authors, matched),
		"",
		fmt.Sprintf("  %s", title),
		"",
	}
	if aiLine != "" {
		lines = append(lines, aiLine)
	}
	if ambigLine != "" {
		lines = append(lines, ambigLine)
	}
	if decLine != "" {
		lines = append(lines, decLine)
	}
	lines = append(lines, "")

	// Abstract with word wrapping
	maxW := m.width - 6
	if maxW < 40 {
		maxW = 40
	}
	absLines := wordWrap(abstract, maxW)
	for _, l := range absLines {
		lines = append(lines, "  "+l)
	}

	lines = append(lines, "")
	lines = append(lines, helpStyle.Render("  a/v accept  r/b reject  s skip  u undo  n/p next/prev  N/P next/prev author  j/k scroll"))
	lines = append(lines, helpStyle.Render("  o open PDF  O open abs  A accept all (group)  R reject all (group)  q quit"))

	// Apply scroll
	content := strings.Join(lines, "\n")
	allLines := strings.Split(content, "\n")
	if m.scroll > 0 && m.scroll < len(allLines) {
		allLines = allLines[m.scroll:]
	}

	// Trim to terminal height
	if len(allLines) > m.height-1 {
		allLines = allLines[:m.height-1]
	}

	return strings.Join(allLines, "\n")
}

func openURL(url string) {
	switch runtime.GOOS {
	case "darwin":
		exec.Command("open", url).Start()
	case "linux":
		exec.Command("xdg-open", url).Start()
	}
}

func wordWrap(s string, width int) []string {
	words := strings.Fields(s)
	if len(words) == 0 {
		return nil
	}
	var lines []string
	line := words[0]
	for _, w := range words[1:] {
		if len(line)+1+len(w) > width {
			lines = append(lines, line)
			line = w
		} else {
			line += " " + w
		}
	}
	lines = append(lines, line)
	return lines
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: arxiv-review <review.json>")
		os.Exit(1)
	}

	file := os.Args[1]
	data, err := os.ReadFile(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading %s: %v\n", file, err)
		os.Exit(1)
	}

	var papers []Paper
	if err := json.Unmarshal(data, &papers); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing JSON: %v\n", err)
		os.Exit(1)
	}

	if len(papers) == 0 {
		fmt.Println("No papers to review.")
		os.Exit(0)
	}

	// Count already decided
	undecided := 0
	for _, p := range papers {
		if p.Decision == "" {
			undecided++
		}
	}
	if undecided == 0 {
		fmt.Println("All papers already reviewed.")
		os.Exit(0)
	}

	fmt.Printf("Reviewing %d papers (%d undecided)...\n", len(papers), undecided)

	m := initialModel(file, papers)
	prog := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := prog.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
