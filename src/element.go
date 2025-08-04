package main

import "github.com/PuerkitoBio/goquery"

type Element struct {
	selection *goquery.Selection
}

func (element *Element) Text() *string {
	if element == nil || element.selection == nil {
		return nil
	}

	text := element.selection.Text()

	if text == "" {
		return nil
	}

	return &text
}

func (element *Element) Attr(name string) *string {
	if element == nil || element.selection == nil {
		return nil
	}

	val, exists := element.selection.Attr(name)

	if !exists {
		return nil
	}

	return &val
}
