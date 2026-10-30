package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// List mode: one line per candidate, pre-filled with the AI decision.
// Flips are kept in user_decision so that quitting is resumable; C writes
// the effective decision of every paper into decision and exits 0.

type listModel struct {
	papers    []Paper
	file      string
	cursor    int
	offset    int
	detail    bool
	scroll    int
	width     int
	height    int
	status    string
	confirmed bool
}

var (
	cursorBg   = lipgloss.Color("238")
	undecStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("11")).Bold(true)
)

func aiDefault(p Paper) string {
	switch p.AIDecision {
	case "ACCEPT":
		return "ACCEPT"
	case "REJECT_TOPIC", "REJECT_PERSON", "REJECT":
		return "REJECT"
	}
	return ""
}

func effective(p Paper) string {
	if p.UserDecision != "" {
		return p.UserDecision
	}
	if p.Decision != "" {
		return p.Decision
	}
	return aiDefault(p)
}

func (m *listModel) set(i int, d string) {
	p := &m.papers[i]
	if d == aiDefault(*p) {
		p.UserDecision = ""
	} else {
		p.UserDecision = d
	}
	p.Decision = ""
	m.save()
}

func (m *listModel) toggle(i int) {
	if effective(m.papers[i]) == "ACCEPT" {
		m.set(i, "REJECT")
	} else {
		m.set(i, "ACCEPT")
	}
}

func (m *listModel) save() {
	data, _ := json.MarshalIndent(m.papers, "", "  ")
	os.WriteFile(m.file, data, 0644)
}

func (m *listModel) counts() (acc, rej, undec, flipped int) {
	for _, p := range m.papers {
		switch effective(p) {
		case "ACCEPT":
			acc++
		case "REJECT":
			rej++
		default:
			undec++
		}
		if p.UserDecision != "" {
			flipped++
		}
	}
	return
}

func (m *listModel) move(delta int) {
	m.cursor += delta
	if m.cursor < 0 {
		m.cursor = 0
	}
	if m.cursor >= len(m.papers) {
		m.cursor = len(m.papers) - 1
	}
	m.scroll = 0
	m.clampOffset()
}

func (m *listModel) clampOffset() {
	rows := m.rows()
	if m.cursor < m.offset {
		m.offset = m.cursor
	}
	if m.cursor >= m.offset+rows {
		m.offset = m.cursor - rows + 1
	}
}

func (m listModel) rows() int {
	r := m.height - 8
	if r < 3 {
		r = 3
	}
	return r
}

func (m listModel) Init() tea.Cmd { return nil }

func (m listModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.clampOffset()

	case tea.KeyMsg:
		m.status = ""
		key := msg.String()

		// Keys shared by both views
		switch key {
		case "ctrl+c":
			m.save()
			return m, tea.Quit
		case " ", "x":
			m.toggle(m.cursor)
			if !m.detail {
				m.move(1)
			}
			return m, nil
		case "a":
			m.set(m.cursor, "ACCEPT")
			if !m.detail {
				m.move(1)
			}
			return m, nil
		case "r":
			m.set(m.cursor, "REJECT")
			if !m.detail {
				m.move(1)
			}
			return m, nil
		case "u":
			m.set(m.cursor, aiDefault(m.papers[m.cursor]))
			return m, nil
		case "o":
			openURL("https://arxiv.org/pdf/" + m.papers[m.cursor].ArxivID)
			return m, nil
		case "O":
			openURL("https://arxiv.org/abs/" + m.papers[m.cursor].ArxivID)
			return m, nil
		}

		if m.detail {
			switch key {
			case "esc", "enter", "h", "left", "q":
				m.detail = false
			case "j", "down":
				m.scroll++
			case "k", "up":
				if m.scroll > 0 {
					m.scroll--
				}
			case "n", "right":
				m.move(1)
			case "p":
				m.move(-1)
			}
			return m, nil
		}

		switch key {
		case "q":
			m.save()
			return m, tea.Quit
		case "j", "down":
			m.move(1)
		case "k", "up":
			m.move(-1)
		case "ctrl+d", "pgdown":
			m.move(m.rows() / 2)
		case "ctrl+u", "pgup":
			m.move(-m.rows() / 2)
		case "g", "home":
			m.move(-len(m.papers))
		case "G", "end":
			m.move(len(m.papers))
		case "enter", "l", "right":
			m.detail = true
			m.scroll = 0
		case "C":
			if _, _, undec, _ := m.counts(); undec > 0 {
				m.status = fmt.Sprintf("%d papers have no decision (AI failed) — set them with a/r first", undec)
				return m, nil
			}
			for i := range m.papers {
				m.papers[i].Decision = effective(m.papers[i])
			}
			m.save()
			m.confirmed = true
			return m, tea.Quit
		}
	}
	return m, nil
}

func truncRunes(s string, n int) string {
	r := []rune(s)
	if n <= 0 {
		return ""
	}
	if len(r) <= n {
		return s
	}
	if n == 1 {
		return "…"
	}
	return string(r[:n-1]) + "…"
}

func shortAuthors(authors []string) string {
	var names []string
	for i, a := range authors {
		if i == 3 {
			names = append(names, "…")
			break
		}
		f := strings.Fields(a)
		if len(f) > 0 {
			names = append(names, f[len(f)-1])
		}
	}
	return strings.Join(names, ", ")
}

func markStyle(d string) (lipgloss.Style, string) {
	switch d {
	case "ACCEPT":
		return acceptStyle, "[✓]"
	case "REJECT":
		return rejectStyle, "[✗]"
	}
	return undecStyle, "[?]"
}

func decisionMark(d string) string {
	st, mark := markStyle(d)
	return st.Render(mark)
}

func aiTag(p Paper) string {
	tag := "AI– "
	switch aiDefault(p) {
	case "ACCEPT":
		tag = "AI✓"
	case "REJECT":
		tag = "AI✗"
	}
	if p.AIDecision != "" {
		if p.AIConfidence == "low" {
			tag += "?"
		} else {
			tag += " "
		}
	}
	return tag
}

func (m listModel) header() string {
	acc, rej, undec, flipped := m.counts()
	h := headerStyle.Render(fmt.Sprintf(" arXiv Review  %d/%d ", m.cursor+1, len(m.papers)))
	return h + fmt.Sprintf("  %s  %s  %s  %s",
		acceptStyle.Render(fmt.Sprintf("✓%d", acc)),
		rejectStyle.Render(fmt.Sprintf("✗%d", rej)),
		undecStyle.Render(fmt.Sprintf("?%d", undec)),
		dimStyle.Render(fmt.Sprintf("%d flipped from AI", flipped)),
	)
}

func (m listModel) View() string {
	if len(m.papers) == 0 {
		return "\n  No papers.\n"
	}
	if m.detail {
		return m.detailView()
	}

	rows := m.rows()
	w := m.width
	if w < 60 {
		w = 60
	}
	lines := []string{m.header(), ""}
	for i := m.offset; i < len(m.papers) && i < m.offset+rows; i++ {
		p := m.papers[i]
		// Every segment carries the cursor background: a styled segment's reset
		// would otherwise end a row-wide background at its first color change.
		hl := func(st lipgloss.Style) lipgloss.Style { return st }
		if i == m.cursor {
			hl = func(st lipgloss.Style) lipgloss.Style { return st.Background(cursorBg) }
		}
		plain := hl(lipgloss.NewStyle())
		flip := plain.Render(" ")
		if p.UserDecision != "" {
			flip = hl(ambigStyle).Render("*")
		}
		auth := truncRunes(shortAuthors(p.Authors), 30)
		titleW := w - 13 - len([]rune(auth)) - 2
		title := truncRunes(strings.Join(strings.Fields(p.Title), " "), titleW)
		pad := titleW - len([]rune(title))
		if pad < 0 {
			pad = 0
		}
		cur := " "
		if i == m.cursor {
			cur = "▸"
		}
		tStyle := plain
		if i == m.cursor {
			tStyle = hl(titleStyle)
		}
		ms, mark := markStyle(effective(p))
		row := plain.Render(cur) + hl(ms).Render(mark) + flip + plain.Render(" ") +
			hl(dimStyle).Render(aiTag(p)) + plain.Render(" ") +
			tStyle.Render(title) + plain.Render(strings.Repeat(" ", pad)+"  ") + hl(dimStyle).Render(auth)
		if fill := w - lipgloss.Width(row); fill > 0 {
			row += plain.Render(strings.Repeat(" ", fill))
		}
		lines = append(lines, row)
	}
	for len(lines) < rows+2 {
		lines = append(lines, "")
	}

	p := m.papers[m.cursor]
	info := fmt.Sprintf("arXiv:%s  %s", p.ArxivID, strings.Join(p.Categories, " "))
	if p.MatchedName != "" {
		info += "  matched: " + p.MatchedName
	} else if p.Similarity > 0 {
		info += fmt.Sprintf("  embedding %.3f", p.Similarity)
	}
	if p.Ambiguous {
		info += "  ⚠ ambiguous name"
	}
	reason := p.AIReason
	if reason == "" {
		reason = "(no AI decision)"
	}
	rl := wordWrap("AI: "+reason, w-4)
	if len(rl) > 2 {
		rl = rl[:2]
	}
	for len(rl) < 2 {
		rl = append(rl, "")
	}
	lines = append(lines, dimStyle.Render(strings.Repeat("─", w-2)))
	lines = append(lines, "  "+catStyle.Render(info))
	for _, l := range rl {
		lines = append(lines, "  "+l)
	}
	if m.status != "" {
		lines = append(lines, "  "+ambigStyle.Render(m.status))
	} else {
		lines = append(lines, helpStyle.Render("  space/x flip  a accept  r reject  u AI default  enter abstract  o PDF  O abs  j/k g/G move  C confirm all  q quit (resumable)"))
	}
	return strings.Join(lines, "\n")
}

func (m listModel) detailView() string {
	p := m.papers[m.cursor]
	dateStr := p.Date
	if len(dateStr) > 10 {
		dateStr = dateStr[:10]
	}
	matched := ""
	if p.MatchedName != "" {
		matched = dimStyle.Render(fmt.Sprintf("  (matched: %s)", p.MatchedName))
	} else if p.Similarity > 0 {
		matched = dimStyle.Render(fmt.Sprintf("  (embedding %.3f)", p.Similarity))
	}
	ai := aiTag(p)
	if p.AIReason != "" {
		ai += "  " + p.AIReason
	}
	flip := ""
	if p.UserDecision != "" {
		flip = ambigStyle.Render("  * flipped from AI")
	}

	lines := []string{
		m.header(),
		"",
		fmt.Sprintf("  %s  %s  arXiv:%s", dateStyle.Render(dateStr), catStyle.Render(strings.Join(p.Categories, " ")), p.ArxivID),
		fmt.Sprintf("  %s%s", authorStyle.Render(strings.Join(p.Authors, ", ")), matched),
		"",
		"  " + titleStyle.Render(strings.Join(strings.Fields(p.Title), " ")),
		"",
		"  " + decisionMark(effective(p)) + flip,
		"  " + dimStyle.Render(ai),
	}
	if p.Ambiguous {
		lines = append(lines, "  "+ambigStyle.Render("⚠ HIGH AMBIGUITY"))
	}
	lines = append(lines, "")
	maxW := m.width - 6
	if maxW < 40 {
		maxW = 40
	}
	abstract := p.Abstract
	if abstract == "" {
		abstract = "(no abstract)"
	}
	for _, l := range wordWrap(abstract, maxW) {
		lines = append(lines, "  "+l)
	}
	lines = append(lines, "", helpStyle.Render("  space/x flip  a accept  r reject  u AI default  n/p next/prev  j/k scroll  o PDF  O abs  esc back"))

	if m.scroll > 0 && m.scroll < len(lines) {
		lines = append(lines[:1], lines[1+m.scroll:]...)
	}
	if len(lines) > m.height-1 && m.height > 1 {
		lines = lines[:m.height-1]
	}
	return strings.Join(lines, "\n")
}

func runList(file string) {
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

	m := listModel{papers: papers, file: file, width: 80, height: 24}
	final, err := tea.NewProgram(m, tea.WithAltScreen()).Run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	if fm, ok := final.(listModel); !ok || !fm.confirmed {
		os.Exit(1)
	}
}
