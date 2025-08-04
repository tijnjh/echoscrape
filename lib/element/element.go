package element

import "github.com/PuerkitoBio/goquery"

type Element struct {
	Selection *goquery.Selection
}

func (element *Element) Text() *string {
	if element == nil || element.Selection == nil {
		return nil
	}

	text := element.Selection.Text()

	if text == "" {
		return nil
	}

	return &text
}

func (element *Element) Attr(name string) *string {
	if element == nil || element.Selection == nil {
		return nil
	}

	val, exists := element.Selection.Attr(name)

	if !exists {
		return nil
	}

	return &val
}
