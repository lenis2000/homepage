package main

import (
	"encoding/json"
	"fmt"
	"os"
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
	AIReason     string   `json:"ai_reason"`
	Decision     string   `json:"decision"`
}

type undoEntry struct {
	index    int
	decision string
}

type model struct {
	papers   []Paper
	current  int
	accepted int
	rejected int
	skipped  int
	undo     []undoEntry
	width    int
	height   int
	file     string
	scroll   int
	done     bool
}

// Styles
var (
	titleStyle   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("15"))
	dateStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("14"))
	authorStyle  = lipgloss.NewStyle().Bold(true)
	catStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	acceptStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("10")).Bold(true)
	rejectStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("9")).Bold(true)
	ambigStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("11")).Bold(true)
	dimStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	helpStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	statusStyle  = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("14"))
	headerStyle  = lipgloss.NewStyle().Bold(true).Background(lipgloss.Color("8")).Foreground(lipgloss.Color("15")).Padding(0, 1)
)

func initialModel(file string, papers []Paper) model {
	// Find first undecided paper
	current := 0
	accepted, rejected, skipped := 0, 0, 0
	for i, p := range papers {
		switch p.Decision {
		case "ACCEPT":
			accepted++
		case "REJECT":
			rejected++
		case "SKIP":
			skipped++
		default:
			if current == 0 || (current < i && papers[current].Decision != "") {
				current = i
			}
		}
	}
	// Find actual first undecided
	for i, p := range papers {
		if p.Decision == "" {
			current = i
			break
		}
	}
	return model{
		papers:   papers,
		current:  current,
		accepted: accepted,
		rejected: rejected,
		skipped:  skipped,
		file:     file,
		width:    80,
		height:   24,
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

		case "a":
			m.decide("ACCEPT")
			m.accepted++
			m.advance()

		case "r":
			m.decide("REJECT")
			m.rejected++
			m.advance()

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
	for i := m.current + 1; i < len(m.papers); i++ {
		if m.papers[i].Decision == "" {
			m.current = i
			return
		}
	}
	// Wrap to find any undecided
	for i := 0; i < m.current; i++ {
		if m.papers[i].Decision == "" {
			m.current = i
			return
		}
	}
	// All decided
	m.done = true
}

func (m *model) advanceNoDecide() {
	m.scroll = 0
	next := m.current + 1
	if next >= len(m.papers) {
		next = 0
	}
	m.current = next
}

func (m *model) goBack() {
	m.scroll = 0
	prev := m.current - 1
	if prev < 0 {
		prev = len(m.papers) - 1
	}
	m.current = prev
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
	undecided := len(m.papers) - m.accepted - m.rejected - m.skipped

	// Header
	header := headerStyle.Render(fmt.Sprintf(" arXiv Review  %d/%d  ", m.current+1, len(m.papers)))
	stats := fmt.Sprintf("  %s  %s  %s  %s",
		acceptStyle.Render(fmt.Sprintf("✓%d", m.accepted)),
		rejectStyle.Render(fmt.Sprintf("✗%d", m.rejected)),
		dimStyle.Render(fmt.Sprintf("~%d skip", m.skipped)),
		statusStyle.Render(fmt.Sprintf("%d left", undecided)),
	)

	// AI suggestion
	aiLine := ""
	if p.AIDecision != "" {
		style := acceptStyle
		if p.AIDecision == "REJECT" {
			style = rejectStyle
		}
		aiLine = fmt.Sprintf("  AI: %s", style.Render(p.AIDecision))
		if p.AIReason != "" {
			aiLine += dimStyle.Render("  "+p.AIReason)
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
	date := dateStyle.Render(p.Date[:10])
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
		"",
		fmt.Sprintf("  %s  %s  arXiv:%s", date, cats, p.ArxivID),
		fmt.Sprintf("  %s%s", authors, matched),
		fmt.Sprintf("  %s", title),
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
	lines = append(lines, helpStyle.Render("  a accept  r reject  s skip  u undo  n/p next/prev  j/k scroll  q quit"))

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
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
