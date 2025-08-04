package element

import "github.com/PuerkitoBio/goquery"

type Element struct {
	Selection *goquery.Selection
}

func (e *Element) Text() *string {
	if e == nil || e.Selection == nil {
		return nil
	}

	text := e.Selection.Text()

	if text == "" {
		return nil
	}

	return &text
}

func (e *Element) Attr(name string) *string {
	if e == nil || e.Selection == nil {
		return nil
	}

	val, exists := e.Selection.Attr(name)

	if !exists {
		return nil
	}

	return &val
}
